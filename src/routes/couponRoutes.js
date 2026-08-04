const express = require('express');
const rateLimit = require('express-rate-limit');
const couponController = require('../controllers/couponController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} = require('../validators/couponValidators');

const router = express.Router();

const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many coupon attempts' },
});

router.post(
  '/validate',
  authenticate,
  couponLimiter,
  validate(validateCouponSchema),
  couponController.validateCoupon
);

router.get(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  couponController.listCoupons
);

router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(createCouponSchema),
  couponController.createCoupon
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(updateCouponSchema),
  couponController.updateCoupon
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  couponController.deleteCoupon
);

module.exports = router;
