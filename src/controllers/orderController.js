const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { codEnabled } = require('../config/env');
const { sendMail } = require('../utils/email');
const { resolveOrderFilter, loadOwnedOrder } = require('../services/orderService');
const {
  notifyOrderPlaced,
  notifyPaymentConfirmed,
  notifyOrderStatus,
} = require('../services/notificationService');
const {
  getOrCreateCart,
  populateCart,
  findVariant,
  validateCouponForCart,
  buildCartSummary,
  markCouponUsed,
  computeShipping,
} = require('../services/cartService');
const {
  pickFulfillmentLocation,
  decrementStockAtLocation,
  restockAtLocation,
} = require('../services/inventoryService');

// Prevents nonsensical admin edits (e.g. delivered -> pending). Same-status
// "updates" (just editing tracking info) are always allowed separately.
const ORDER_STATUS_TRANSITIONS = {
  pending: ['payment_confirmed', 'cancelled'],
  payment_confirmed: ['in_production', 'cancelled', 'refund_initiated'],
  in_production: ['quality_check', 'cancelled', 'refund_initiated'],
  quality_check: ['in_production', 'shipped', 'refund_initiated'],
  shipped: ['delivered', 'refund_initiated'],
  delivered: ['refund_initiated'],
  cancelled: ['refund_initiated', 'refunded'],
  refund_initiated: ['refunded'],
  refunded: [],
};

const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod, shippingAddress, addressId } = req.body;

  if (paymentMethod === 'cod' && !codEnabled) {
    throw new ApiError(400, 'Cash on Delivery is currently disabled');
  }

  let address = shippingAddress;
  if (addressId) {
    const saved = req.user.addresses.id(addressId);
    if (!saved) throw new ApiError(400, 'Saved address not found');
    address = {
      fullName: saved.fullName,
      phone: saved.phone,
      line1: saved.line1,
      line2: saved.line2,
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
    };
  }

  const cart = await getOrCreateCart(req.user._id);
  if (!cart.items.length) throw new ApiError(400, 'Cart is empty');

  const populated = await populateCart(cart);
  const summary = buildCartSummary(populated);

  for (const line of summary.items) {
    if (!line.product?.isActive || !line.variant) {
      throw new ApiError(400, 'Cart contains unavailable items');
    }
    if (line.variant.stock < line.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for ${line.product.title}`
      );
    }
  }

  let discount = 0;
  let couponPayload;
  if (cart.couponApplied?.code) {
    const { coupon, discountAmount } = await validateCouponForCart(
      cart.couponApplied.code,
      req.user._id,
      populated
    );
    discount = discountAmount;
    couponPayload = { code: coupon.code, discountAmount };
  }

  const subtotal = summary.pricing.subtotal;
  const afterDiscount = Math.max(0, subtotal - discount);
  const shippingCost = computeShipping(afterDiscount);
  const total = afterDiscount + shippingCost;

  const orderItems = summary.items.map((line) => ({
    product: line.product._id,
    variantId: line.variantId,
    title: line.product.title,
    variantLabel: line.variant.label,
    image: line.product.image,
    price: line.currentPrice,
    quantity: line.quantity,
  }));

  // Idempotency: block duplicate pending order from same cart contents within 2 min
  const recent = await Order.findOne({
    user: req.user._id,
    orderStatus: 'pending',
    paymentStatus: 'pending',
    total,
    createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
  });
  if (recent && recent.items.length === orderItems.length) {
    return res.status(200).json({
      success: true,
      message: 'Existing pending order returned',
      data: { order: recent },
    });
  }

  const fulfillmentLines = orderItems
    .filter((i) => i.product && i.variantId)
    .map((i) => ({
      productId: i.product,
      variantId: i.variantId,
      quantity: i.quantity,
      title: i.title,
    }));

  const location = await pickFulfillmentLocation(fulfillmentLines);
  await decrementStockAtLocation(orderItems, location._id);

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress: address,
    location: location._id,
    subtotal,
    discount,
    shippingCost,
    total,
    coupon: couponPayload,
    paymentMethod,
    paymentStatus: 'pending',
    orderStatus:
      paymentMethod === 'cod' ? 'payment_confirmed' : 'pending',
    timeline: [
      {
        status: paymentMethod === 'cod' ? 'payment_confirmed' : 'pending',
        message:
          paymentMethod === 'cod'
            ? 'Order placed with Cash on Delivery'
            : 'Order placed, awaiting payment',
      },
    ],
  });

  if (couponPayload?.code) {
    const coupon = await Coupon.findOne({ code: couponPayload.code });
    if (coupon) await markCouponUsed(coupon, req.user._id);
  }

  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $set: { items: [] }, $unset: { couponApplied: 1 } }
  );

  sendMail({
    to: req.user.email,
    subject: `Order confirmed — ${order.orderId}`,
    text: `Thanks ${req.user.name}!\n\nYour order ${order.orderId} totaling ₹${order.total} has been placed.\nPayment: ${order.paymentMethod}\nStatus: ${order.orderStatus}`,
  }).catch(() => {});

  notifyOrderPlaced(req.user._id, order).catch(() => {});
  if (order.orderStatus === 'payment_confirmed') {
    notifyPaymentConfirmed(req.user._id, order).catch(() => {});
  }

  res.status(201).json({
    success: true,
    message: 'Order created',
    data: { order },
  });
});

const myOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
    },
  });
});

const listOrders = asyncHandler(async (req, res) => {
  const { orderStatus, paymentStatus, from, to, locationId, page, limit } =
    req.validated.query;
  const filter = {};
  if (orderStatus) filter.orderStatus = orderStatus;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  if (req.user.role === 'admin') {
    if (!req.user.location) {
      throw new ApiError(400, 'Admin has no assigned location');
    }
    filter.location = req.user.location;
  } else if (locationId) {
    filter.location = locationId;
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email phone')
      .populate('location', 'name code city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
    },
  });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await loadOwnedOrder(req.params.id, req.user);
  await order.populate('user', 'name email phone');
  await order.populate('items.product', 'title slug images');
  await order.populate('location', 'name code city');
  res.json({ success: true, data: { order } });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await loadOwnedOrder(req.params.id, req.user);

  const {
    orderStatus,
    trackingNumber,
    logisticsPartner,
    logisticsTrackingUrl,
    estimatedDelivery,
    message,
  } = req.body;

  if (orderStatus !== order.orderStatus) {
    const allowed = ORDER_STATUS_TRANSITIONS[order.orderStatus] || [];
    if (!allowed.includes(orderStatus)) {
      throw new ApiError(
        400,
        `Cannot change order status from "${order.orderStatus}" to "${orderStatus}"`
      );
    }
  }

  order.orderStatus = orderStatus;
  if (trackingNumber != null) order.trackingNumber = trackingNumber;
  if (logisticsPartner != null) order.logisticsPartner = logisticsPartner;
  if (logisticsTrackingUrl != null) {
    order.logisticsTrackingUrl = logisticsTrackingUrl;
  }
  if (estimatedDelivery != null) order.estimatedDelivery = estimatedDelivery;
  if (orderStatus === 'delivered') order.deliveredAt = new Date();
  if (orderStatus === 'refunded') order.paymentStatus = 'refunded';

  order.timeline.push({
    status: orderStatus,
    message: message || `Status updated to ${orderStatus}`,
  });

  await order.save();

  notifyOrderStatus(order.user, order).catch(() => {});

  res.json({ success: true, data: { order } });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await loadOwnedOrder(req.params.id, req.user);

  if (!['pending', 'payment_confirmed'].includes(order.orderStatus)) {
    throw new ApiError(400, 'Order can no longer be cancelled');
  }

  if (order.location) {
    await restockAtLocation(order.items, order.location);
  } else {
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      const variant = findVariant(product, item.variantId);
      if (variant) {
        variant.stock += item.quantity;
        product.totalSold = Math.max(0, product.totalSold - item.quantity);
        await product.save();
      }
    }
  }

  order.orderStatus = 'cancelled';
  order.cancelReason = req.body.cancelReason;
  if (order.paymentStatus === 'paid') {
    order.paymentStatus = 'refunded';
    order.orderStatus = 'refund_initiated';
  }
  order.timeline.push({
    status: order.orderStatus,
    message: `Cancelled: ${req.body.cancelReason}`,
  });
  await order.save();

  res.json({ success: true, message: 'Order cancelled', data: { order } });
});

module.exports = {
  createOrder,
  myOrders,
  listOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
};
