const express = require('express');
const customOrderController = require('../controllers/customOrderController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createCustomOrderSchema,
  updateCustomOrderStatusSchema,
  customOrderQuerySchema,
} = require('../validators/customOrderValidators');

const router = express.Router();

router.post(
  '/',
  authenticate,
  validate(createCustomOrderSchema),
  customOrderController.createCustomOrder
);

router.get(
  '/',
  authenticate,
  validate(customOrderQuerySchema, 'query'),
  customOrderController.listCustomOrders
);

router.get('/:id', authenticate, customOrderController.getCustomOrder);

router.put(
  '/:id/status',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(updateCustomOrderStatusSchema),
  customOrderController.updateCustomOrderStatus
);

router.put(
  '/:id/accept-quote',
  authenticate,
  customOrderController.acceptQuote
);

router.put(
  '/:id/reject-quote',
  authenticate,
  customOrderController.rejectQuote
);

module.exports = router;
