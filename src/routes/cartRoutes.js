const express = require('express');
const rateLimit = require('express-rate-limit');
const cartController = require('../controllers/cartController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  addToCartSchema,
  updateCartSchema,
  removeCartSchema,
  applyCouponSchema,
} = require('../validators/cartValidators');

const router = express.Router();

const cartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticate, cartLimiter);

router.get('/', cartController.getCart);
router.post('/add', validate(addToCartSchema), cartController.addToCart);
router.put('/update', validate(updateCartSchema), cartController.updateCartItem);
router.delete(
  '/remove',
  validate(removeCartSchema),
  cartController.removeCartItem
);
router.post(
  '/apply-coupon',
  validate(applyCouponSchema),
  cartController.applyCoupon
);
router.delete('/remove-coupon', cartController.removeCoupon);

module.exports = router;
