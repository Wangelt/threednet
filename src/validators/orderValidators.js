const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const shippingAddressSchema = Joi.object({
  fullName: Joi.string().required(),
  phone: Joi.string().required(),
  line1: Joi.string().required(),
  line2: Joi.string().allow('', null),
  city: Joi.string().required(),
  state: Joi.string().required(),
  pincode: Joi.string().required(),
});

const createOrderSchema = Joi.object({
  shippingAddress: shippingAddressSchema.required(),
  paymentMethod: Joi.string()
    .valid('razorpay', 'cod', 'manual_transfer')
    .required(),
  addressId: objectId, // optional: use saved address instead
});

const updateOrderStatusSchema = Joi.object({
  orderStatus: Joi.string()
    .valid(
      'pending',
      'payment_confirmed',
      'in_production',
      'quality_check',
      'shipped',
      'delivered',
      'cancelled',
      'refund_initiated',
      'refunded'
    )
    .required(),
  trackingNumber: Joi.string().allow('', null),
  logisticsPartner: Joi.string().allow('', null),
  logisticsTrackingUrl: Joi.string().uri().allow('', null),
  estimatedDelivery: Joi.date().allow(null),
  message: Joi.string().allow('', null),
});

const cancelOrderSchema = Joi.object({
  cancelReason: Joi.string().trim().max(500).required(),
});

const orderQuerySchema = Joi.object({
  orderStatus: Joi.string(),
  paymentStatus: Joi.string(),
  from: Joi.date(),
  to: Joi.date(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const createPaymentSchema = Joi.object({
  orderId: Joi.alternatives().try(objectId, Joi.string()).required(),
});

const verifyPaymentSchema = Joi.object({
  orderId: Joi.alternatives().try(objectId, Joi.string()).required(),
  razorpayOrderId: Joi.string().required(),
  razorpayPaymentId: Joi.string().required(),
  razorpaySignature: Joi.string().required(),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema,
  createPaymentSchema,
  verifyPaymentSchema,
};
