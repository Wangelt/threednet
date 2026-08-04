const slugify = require('slugify');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Location = require('../models/Location');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  setStock,
  attachStockByLocation,
} = require('../services/inventoryService');

function makeSlug(title, slug) {
  return slug || slugify(title, { lower: true, strict: true, trim: true });
}

function buildSort(sort) {
  switch (sort) {
    case 'price_asc':
      return { 'variants.0.price': 1 };
    case 'price_desc':
      return { 'variants.0.price': -1 };
    case 'rating':
      return { averageRating: -1 };
    case 'popular':
      return { totalSold: -1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
}

function isStaff(user) {
  return user && (user.role === 'admin' || user.role === 'super_admin');
}

async function resolveStockLocationId(req, bodyLocationId) {
  if (req.user.role === 'admin') {
    if (!req.user.location) {
      throw new ApiError(400, 'Admin has no assigned location');
    }
    return req.user.location;
  }
  if (bodyLocationId) return bodyLocationId;
  const main = await Location.findOne({ code: 'MAIN', isActive: true });
  if (main) return main._id;
  const any = await Location.findOne({ isActive: true });
  if (!any) throw new ApiError(400, 'No active location to assign stock');
  return any._id;
}

async function syncVariantStocks(req, product, variantsInput, bodyLocationId) {
  if (!variantsInput?.length) return product;
  const locationId = await resolveStockLocationId(req, bodyLocationId);
  for (const input of variantsInput) {
    const variant =
      product.variants.id(input._id) ||
      product.variants.find(
        (v) =>
          v.label === input.label &&
          v.sku === input.sku &&
          Number(v.price) === Number(input.price)
      ) ||
      product.variants[product.variants.length - 1];
    if (!variant) continue;
    if (input.stock == null) continue;
    await setStock({
      productId: product._id,
      variantId: variant._id,
      locationId,
      stock: Number(input.stock) || 0,
    });
  }
  return Product.findById(product._id).populate('category', 'name slug');
}

async function shapeProductForViewer(product, user) {
  if (!isStaff(user)) return product;

  let shaped = await attachStockByLocation(product);
  if (user.role === 'admin' && user.location) {
    const locId = String(user.location._id || user.location);
    shaped = {
      ...shaped,
      variants: (shaped.variants || []).map((v) => {
        const row = (v.stockByLocation || []).find(
          (s) => String(s.locationId) === locId
        );
        return {
          ...v,
          stock: row ? row.stock : 0,
          totalStock: v.stock,
        };
      }),
    };
  }
  return shaped;
}

const listProducts = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    material,
    rating,
    inStock,
    featured,
    sort,
    page,
    limit,
  } = req.validated.query;

  const filter = { isActive: true };

  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (featured) filter.isFeatured = true;
  if (rating != null) filter.averageRating = { $gte: rating };

  const and = [];

  if (minPrice != null || maxPrice != null) {
    const priceFilter = {};
    if (minPrice != null) priceFilter.$gte = minPrice;
    if (maxPrice != null) priceFilter.$lte = maxPrice;
    and.push({ 'variants.price': priceFilter });
  }

  if (material) and.push({ 'variants.material': new RegExp(`^${material}$`, 'i') });
  if (inStock) and.push({ 'variants.stock': { $gt: 0 } });

  if (and.length) filter.$and = and;

  const skip = (page - 1) * limit;
  const sortSpec = buildSort(sort);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .select(
        'title slug shortDesc images variants averageRating reviewCount isFeatured category tags createdAt'
      ),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 0,
      },
    },
  });
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const filter = { slug: req.params.slug };
  if (!isStaff(req.user)) filter.isActive = true;

  const product = await Product.findOne(filter).populate(
    'category',
    'name slug description'
  );

  if (!product) throw new ApiError(404, 'Product not found');

  const shaped = await shapeProductForViewer(product, req.user);
  res.json({ success: true, data: { product: shaped } });
});

const createProduct = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.body.category);
  if (!category || !category.isActive) {
    throw new ApiError(400, 'Invalid or inactive category');
  }

  const variantsInput = req.body.variants || [];
  const product = await Product.create({
    ...req.body,
    slug: makeSlug(req.body.title, req.body.slug),
    variants: variantsInput.map((v) => ({
      ...v,
      stock: 0,
    })),
  });

  let saved = await syncVariantStocks(
    req,
    product,
    variantsInput,
    req.body.locationId
  );
  saved = await shapeProductForViewer(saved, req.user);

  res.status(201).json({ success: true, data: { product: saved } });
});

const updateProduct = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid product id');
  }

  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category || !category.isActive) {
      throw new ApiError(400, 'Invalid or inactive category');
    }
  }

  if (req.body.title && !req.body.slug) {
    req.body.slug = makeSlug(req.body.title);
  }

  const variantsInput = req.body.variants;
  const body = { ...req.body };
  delete body.locationId;

  if (variantsInput) {
    // Preserve totals until inventory sync; ignore client stock on assign
    body.variants = variantsInput.map((v, idx) => {
      const existing = v._id ? product.variants.id(v._id) : product.variants[idx];
      return {
        ...v,
        stock: existing ? existing.stock : 0,
      };
    });
  }

  Object.assign(product, body);
  await product.save();

  let saved = product;
  if (variantsInput) {
    saved = await syncVariantStocks(
      req,
      product,
      variantsInput,
      req.body.locationId
    );
  } else {
    saved = await Product.findById(product._id).populate('category', 'name slug');
  }

  saved = await shapeProductForViewer(saved, req.user);
  res.json({ success: true, data: { product: saved } });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  product.isActive = false;
  await product.save();

  res.json({ success: true, message: 'Product deactivated' });
});

module.exports = {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
};
