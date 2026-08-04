const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  isRazorpayConfigured,
  getPublicKeyId,
} = require('../services/paymentService');
const { loadOwnedOrder } = require('../services/orderService');
const { notifyPaymentConfirmed } = require('../services/notificationService');

const createPaymentOrder = asyncHandler(async (req, res) => {
  if (!isRazorpayConfigured()) {
    throw new ApiError(
      503,
      'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
    );
  }

  const order = await loadOwnedOrder(req.body.orderId, req.user);

  if (order.paymentMethod !== 'razorpay') {
    throw new ApiError(400, 'Order is not a Razorpay payment order');
  }
  if (order.paymentStatus === 'paid') {
    throw new ApiError(400, 'Order is already paid');
  }
  if (order.orderStatus === 'cancelled') {
    throw new ApiError(400, 'Order is cancelled');
  }

  const amountInPaise = Math.round(order.total * 100);
  if (amountInPaise < 100) {
    throw new ApiError(400, 'Order total too low for Razorpay');
  }

  const rzpOrder = await createRazorpayOrder({
    amountInPaise,
    receipt: order.orderId,
    notes: {
      orderId: order.orderId,
      userId: String(order.user),
    },
  });

  order.razorpayOrderId = rzpOrder.id;
  await order.save();

  res.json({
    success: true,
    data: {
      keyId: getPublicKeyId(),
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      orderId: order.orderId,
      orderMongoId: order._id,
    },
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const {
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = req.body;

  const order = await loadOwnedOrder(orderId, req.user);

  if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
    throw new ApiError(400, 'Razorpay order mismatch');
  }

  const valid = verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!valid) {
    order.paymentStatus = 'failed';
    order.timeline.push({
      status: 'pending',
      message: 'Payment verification failed',
    });
    await order.save();
    throw new ApiError(400, 'Invalid payment signature');
  }

  order.razorpayOrderId = razorpayOrderId;
  order.razorpayPaymentId = razorpayPaymentId;
  order.razorpaySignature = razorpaySignature;
  order.paymentStatus = 'paid';
  order.orderStatus = 'payment_confirmed';
  order.timeline.push({
    status: 'payment_confirmed',
    message: 'Payment verified successfully',
  });
  await order.save();

  notifyPaymentConfirmed(order.user, order).catch(() => {});

  res.json({
    success: true,
    message: 'Payment verified',
    data: { order },
  });
});

const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) throw new ApiError(400, 'Missing webhook signature');

  const rawBody = req.rawBody || JSON.stringify(req.body);
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const event = req.body.event;
  const payload = req.body.payload?.payment?.entity;

  if (event === 'payment.captured' && payload) {
    const order = await Order.findOne({
      razorpayOrderId: payload.order_id,
    });
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'payment_confirmed';
      order.razorpayPaymentId = payload.id;
      order.timeline.push({
        status: 'payment_confirmed',
        message: 'Payment confirmed via webhook',
      });
      await order.save();
      notifyPaymentConfirmed(order.user, order).catch(() => {});
    }
  }

  if (event === 'payment.failed' && payload) {
    const order = await Order.findOne({
      razorpayOrderId: payload.order_id,
    });
    if (order && order.paymentStatus === 'pending') {
      order.paymentStatus = 'failed';
      order.timeline.push({
        status: 'pending',
        message: 'Payment failed (webhook)',
      });
      await order.save();
    }
  }

  res.json({ success: true });
});

module.exports = {
  createPaymentOrder,
  verifyPayment,
  webhook,
};
