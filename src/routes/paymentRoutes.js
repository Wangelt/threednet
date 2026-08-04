const express = require('express');
const rateLimit = require('express-rate-limit');
const paymentController = require('../controllers/paymentController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  createPaymentSchema,
  verifyPaymentSchema,
} = require('../validators/orderValidators');

const router = express.Router();

const payLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/create-order',
  authenticate,
  payLimiter,
  validate(createPaymentSchema),
  paymentController.createPaymentOrder
);

router.post(
  '/verify',
  authenticate,
  payLimiter,
  validate(verifyPaymentSchema),
  paymentController.verifyPayment
);

// Webhook is public; signature-verified. Mounted with raw body capture in app.js
router.post('/webhook', paymentController.webhook);

module.exports = router;
