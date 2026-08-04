const slugify = require('slugify');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

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
  const product = await Product.findOne({
    slug: req.params.slug,
    isActive: true,
  }).populate('category', 'name slug description');

  if (!product) throw new ApiError(404, 'Product not found');

  res.json({ success: true, data: { product } });
});

const createProduct = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.body.category);
  if (!category || !category.isActive) {
    throw new ApiError(400, 'Invalid or inactive category');
  }

  const product = await Product.create({
    ...req.body,
    slug: makeSlug(req.body.title, req.body.slug),
  });

  res.status(201).json({ success: true, data: { product } });
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

  Object.assign(product, req.body);
  await product.save();

  res.json({ success: true, data: { product } });
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
