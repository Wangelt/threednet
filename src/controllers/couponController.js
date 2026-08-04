const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  getOrCreateCart,
  populateCart,
  validateCouponForCart,
} = require('../services/cartService');

const validateCoupon = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const populated = await populateCart(cart);

  if (!populated.items.length && req.body.subtotal == null) {
    throw new ApiError(400, 'Cart is empty');
  }

  const { coupon, discountAmount } = await validateCouponForCart(
    req.body.code,
    req.user._id,
    populated
  );

  res.json({
    success: true,
    data: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      minOrderValue: coupon.minOrderValue,
      expiresAt: coupon.expiresAt,
    },
  });
});

const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, data: { coupons } });
});

const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, data: { coupon } });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  Object.assign(coupon, req.body);
  await coupon.save();
  res.json({ success: true, data: { coupon } });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  coupon.isActive = false;
  await coupon.save();
  res.json({ success: true, message: 'Coupon deactivated' });
});

module.exports = {
  validateCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
