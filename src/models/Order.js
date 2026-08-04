const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      // Optional for custom-order-derived line items
    },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, required: true },
    variantLabel: { type: String },
    image: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const timelineEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    message: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: { type: shippingAddressSchema, required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: {
      code: { type: String },
      discountAmount: { type: Number },
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cod', 'manual_transfer'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    orderStatus: {
      type: String,
      enum: [
        'pending',
        'payment_confirmed',
        'in_production',
        'quality_check',
        'shipped',
        'delivered',
        'cancelled',
        'refund_initiated',
        'refunded',
      ],
      default: 'pending',
    },
    trackingNumber: { type: String },
    logisticsPartner: { type: String },
    logisticsTrackingUrl: { type: String },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
    cancelReason: { type: String },
    customOrderRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomOrderRequest',
    },
    timeline: [timelineEventSchema],
    invoiceUrl: { type: String },
  },
  { timestamps: true }
);

orderSchema.pre('save', async function generateOrderId() {
  if (this.orderId) return;
  const count = await mongoose.model('Order').countDocuments();
  this.orderId = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
});

orderSchema.index({ user: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ razorpayOrderId: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
