const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  getOrCreateCart,
  populateCart,
  findVariant,
  validateCouponForCart,
  buildCartSummary,
} = require('../services/cartService');

const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const populated = await populateCart(cart);
  res.json({
    success: true,
    data: {
      cartId: populated._id,
      ...buildCartSummary(populated),
    },
  });
});

const addToCart = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  const variant = findVariant(product, variantId);
  if (!variant) throw new ApiError(400, 'Invalid product variant');
  if (variant.stock < quantity) {
    throw new ApiError(400, 'Insufficient stock');
  }

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find(
    (i) =>
      String(i.product) === String(productId) &&
      String(i.variantId) === String(variantId)
  );

  if (existing) {
    const nextQty = existing.quantity + quantity;
    if (variant.stock < nextQty) {
      throw new ApiError(400, 'Insufficient stock');
    }
    existing.quantity = nextQty;
    existing.priceAtAdd = variant.price;
  } else {
    cart.items.push({
      product: productId,
      variantId,
      quantity,
      priceAtAdd: variant.price,
    });
  }

  // Revalidate coupon after cart change
  cart.couponApplied = undefined;
  await cart.save();

  const populated = await populateCart(cart);
  res.status(201).json({
    success: true,
    message: 'Added to cart',
    data: {
      cartId: populated._id,
      ...buildCartSummary(populated),
    },
  });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId, quantity } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(itemId);
  if (!item) throw new ApiError(404, 'Cart item not found');

  const product = await Product.findById(item.product);
  const variant = findVariant(product, item.variantId);
  if (!variant || !product?.isActive) {
    throw new ApiError(400, 'Product/variant no longer available');
  }
  if (variant.stock < quantity) {
    throw new ApiError(400, 'Insufficient stock');
  }

  item.quantity = quantity;
  item.priceAtAdd = variant.price;
  cart.couponApplied = undefined;
  await cart.save();

  const populated = await populateCart(cart);
  res.json({
    success: true,
    message: 'Cart updated',
    data: {
      cartId: populated._id,
      ...buildCartSummary(populated),
    },
  });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(itemId);
  if (!item) throw new ApiError(404, 'Cart item not found');

  item.deleteOne();
  cart.couponApplied = undefined;
  await cart.save();

  const populated = await populateCart(cart);
  res.json({
    success: true,
    message: 'Item removed',
    data: {
      cartId: populated._id,
      ...buildCartSummary(populated),
    },
  });
});

const applyCoupon = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  if (!cart.items.length) throw new ApiError(400, 'Cart is empty');

  const populated = await populateCart(cart);
  const { coupon, discountAmount } = await validateCouponForCart(
    req.body.code,
    req.user._id,
    populated
  );

  cart.couponApplied = {
    code: coupon.code,
    discountAmount,
  };
  await cart.save();

  const refreshed = await populateCart(cart);
  res.json({
    success: true,
    message: 'Coupon applied',
    data: {
      cartId: refreshed._id,
      ...buildCartSummary(refreshed),
    },
  });
});

const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.couponApplied = undefined;
  await cart.save();

  const populated = await populateCart(cart);
  res.json({
    success: true,
    message: 'Coupon removed',
    data: {
      cartId: populated._id,
      ...buildCartSummary(populated),
    },
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  applyCoupon,
  removeCoupon,
};
