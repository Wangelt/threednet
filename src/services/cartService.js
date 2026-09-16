const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const { shipping } = require('../config/env');
const logger = require('../utils/logger');

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

async function populateCart(cart) {
  return Cart.findById(cart._id).populate({
    path: 'items.product',
    select:
      'title slug images variants isActive averageRating reviewCount category',
  });
}

function findVariant(product, variantId) {
  if (!product?.variants?.length) return null;
  return product.variants.id(variantId) || product.variants.find(
    (v) => String(v._id) === String(variantId)
  );
}

function computeSubtotal(cart) {
  return cart.items.reduce((sum, item) => {
    const product = item.product;
    const variant = findVariant(product, item.variantId);
    const price = variant?.price ?? item.priceAtAdd;
    return sum + price * item.quantity;
  }, 0);
}

function computeShipping(subtotalAfterDiscount) {
  if (subtotalAfterDiscount >= shipping.freeAbove) return 0;
  return shipping.flatRate;
}

/**
 * Validate coupon against cart line items. Returns discount amount.
 */
async function validateCouponForCart(code, userId, cart) {
  const coupon = await Coupon.findOne({
    code: String(code).toUpperCase().trim(),
  });

  if (!coupon || !coupon.isActive) {
    throw new ApiError(400, 'Invalid coupon code');
  }
  if (coupon.expiresAt < new Date()) {
    throw new ApiError(400, 'Coupon has expired');
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, 'Coupon usage limit reached');
  }

  const userUses = coupon.usedBy.filter(
    (id) => String(id) === String(userId)
  ).length;
  if (userUses >= coupon.usageLimitPerUser) {
    throw new ApiError(400, 'You have already used this coupon');
  }

  const eligibleItems = cart.items.filter((item) => {
    const product = item.product;
    if (!product || product.isActive === false) return false;

    const scope = coupon.applicableTo?.type || 'all';
    if (scope === 'all') return true;
    if (scope === 'category') {
      const catId = String(product.category?._id || product.category);
      return coupon.applicableTo.categories.some((c) => String(c) === catId);
    }
    if (scope === 'product') {
      return coupon.applicableTo.products.some(
        (p) => String(p) === String(product._id)
      );
    }
    return false;
  });

  if (!eligibleItems.length) {
    throw new ApiError(400, 'Coupon not applicable to cart items');
  }

  const eligibleSubtotal = eligibleItems.reduce((sum, item) => {
    const variant = findVariant(item.product, item.variantId);
    const price = variant?.price ?? item.priceAtAdd;
    return sum + price * item.quantity;
  }, 0);

  if (eligibleSubtotal < coupon.minOrderValue) {
    throw new ApiError(
      400,
      `Minimum order value of ₹${coupon.minOrderValue} required`
    );
  }

  const discountAmount = Math.round(coupon.calculateDiscount(eligibleSubtotal));
  return { coupon, discountAmount, eligibleSubtotal };
}

function buildCartSummary(cart) {
  const lines = cart.items.map((item) => {
    const product = item.product;
    const variant = findVariant(product, item.variantId);
    const currentPrice = variant?.price ?? item.priceAtAdd;
    return {
      _id: item._id,
      product: product
        ? {
            _id: product._id,
            title: product.title,
            slug: product.slug,
            image: product.images?.[0],
            isActive: product.isActive,
          }
        : null,
      variantId: item.variantId,
      variant: variant
        ? {
            _id: variant._id,
            label: variant.label,
            material: variant.material,
            color: variant.color,
            size: variant.size,
            price: variant.price,
            stock: variant.stock,
          }
        : null,
      quantity: item.quantity,
      priceAtAdd: item.priceAtAdd,
      currentPrice,
      priceChanged: currentPrice !== item.priceAtAdd,
      lineTotal: currentPrice * item.quantity,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const discount = cart.couponApplied?.discountAmount || 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const shippingCost = computeShipping(afterDiscount);
  const total = afterDiscount + shippingCost;

  return {
    items: lines,
    couponApplied: cart.couponApplied?.code
      ? cart.couponApplied
      : null,
    pricing: {
      subtotal,
      discount,
      shippingCost,
      total,
    },
  };
}

// Atomic increment so two concurrent checkouts can't both slip past
// usageLimit between validateCouponForCart's read and this write.
async function markCouponUsed(coupon, userId) {
  const updated = await Coupon.findOneAndUpdate(
    {
      _id: coupon._id,
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      ],
    },
    { $inc: { usedCount: 1 }, $push: { usedBy: userId } },
    { new: true }
  );
  if (!updated) {
    logger.warn('[coupon] usage limit reached concurrently', { code: coupon.code });
  }
  return updated || coupon;
}

module.exports = {
  getOrCreateCart,
  populateCart,
  findVariant,
  computeSubtotal,
  computeShipping,
  validateCouponForCart,
  buildCartSummary,
  markCouponUsed,
};
