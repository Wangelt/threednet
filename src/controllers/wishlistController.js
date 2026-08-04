const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  getOrCreateCart,
  populateCart,
  findVariant,
  buildCartSummary,
} = require('../services/cartService');

async function getOrCreateWishlist(userId) {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
}

const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);
  await wishlist.populate({
    path: 'products',
    select:
      'title slug images variants averageRating reviewCount isActive isFeatured shortDesc',
    match: { isActive: true },
  });

  res.json({
    success: true,
    data: {
      wishlistId: wishlist._id,
      products: wishlist.products.filter(Boolean),
    },
  });
});

const addToWishlist = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.body.productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  const wishlist = await getOrCreateWishlist(req.user._id);
  await Wishlist.updateOne(
    { _id: wishlist._id },
    { $addToSet: { products: product._id } }
  );

  const updated = await Wishlist.findById(wishlist._id).populate({
    path: 'products',
    select: 'title slug images variants averageRating reviewCount isActive',
  });

  res.status(201).json({
    success: true,
    message: 'Added to wishlist',
    data: { products: updated.products },
  });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);
  await Wishlist.updateOne(
    { _id: wishlist._id },
    { $pull: { products: req.params.productId } }
  );

  const updated = await Wishlist.findById(wishlist._id).populate({
    path: 'products',
    select: 'title slug images variants averageRating reviewCount isActive',
  });

  res.json({
    success: true,
    message: 'Removed from wishlist',
    data: { products: updated.products },
  });
});

const moveToCart = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity } = req.body;

  const wishlist = await getOrCreateWishlist(req.user._id);
  if (!wishlist.products.some((p) => String(p) === String(productId))) {
    throw new ApiError(400, 'Product is not in wishlist');
  }

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  const variant = findVariant(product, variantId);
  if (!variant) throw new ApiError(400, 'Invalid variant');
  if (variant.stock < quantity) throw new ApiError(400, 'Insufficient stock');

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find(
    (i) =>
      String(i.product) === String(productId) &&
      String(i.variantId) === String(variantId)
  );

  if (existing) {
    existing.quantity += quantity;
    existing.priceAtAdd = variant.price;
  } else {
    cart.items.push({
      product: productId,
      variantId,
      quantity,
      priceAtAdd: variant.price,
    });
  }
  cart.couponApplied = undefined;
  await cart.save();

  await Wishlist.updateOne(
    { _id: wishlist._id },
    { $pull: { products: productId } }
  );

  const populated = await populateCart(cart);
  res.json({
    success: true,
    message: 'Moved to cart',
    data: {
      cartId: populated._id,
      ...buildCartSummary(populated),
    },
  });
});

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
};
