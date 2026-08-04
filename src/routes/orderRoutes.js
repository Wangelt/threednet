const express = require('express');
const rateLimit = require('express-rate-limit');
const orderController = require('../controllers/orderController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema,
} = require('../validators/orderValidators');

const router = express.Router();

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many checkout attempts' },
});

router.post(
  '/',
  authenticate,
  checkoutLimiter,
  validate(createOrderSchema),
  orderController.createOrder
);

router.get('/my', authenticate, orderController.myOrders);

router.get(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(orderQuerySchema, 'query'),
  orderController.listOrders
);

router.get('/:id', authenticate, orderController.getOrder);

router.put(
  '/:id/status',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

router.post(
  '/:id/cancel',
  authenticate,
  validate(cancelOrderSchema),
  orderController.cancelOrder
);

module.exports = router;
