const crypto = require('crypto');
const Razorpay = require('razorpay');
const { razorpay } = require('../config/env');
const ApiError = require('../utils/ApiError');

function isRazorpayConfigured() {
  return Boolean(razorpay.keyId && razorpay.keySecret);
}

function getRazorpayClient() {
  if (!isRazorpayConfigured()) {
    throw new ApiError(
      503,
      'Razorpay is not configured. Use COD or set RAZORPAY_KEY_ID/SECRET.'
    );
  }
  return new Razorpay({
    key_id: razorpay.keyId,
    key_secret: razorpay.keySecret,
  });
}

async function createRazorpayOrder({ amountInPaise, receipt, notes }) {
  const client = getRazorpayClient();
  return client.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt,
    notes,
  });
}

function verifyPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  if (!isRazorpayConfigured()) {
    throw new ApiError(503, 'Razorpay is not configured');
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', razorpay.keySecret)
    .update(body)
    .digest('hex');

  return expected === razorpaySignature;
}

function verifyWebhookSignature(rawBody, signature) {
  if (!razorpay.webhookSecret) {
    throw new ApiError(503, 'RAZORPAY_WEBHOOK_SECRET is not configured');
  }
  const expected = crypto
    .createHmac('sha256', razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}

module.exports = {
  isRazorpayConfigured,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  getPublicKeyId: () => razorpay.keyId || null,
};
