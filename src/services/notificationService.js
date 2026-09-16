const Notification = require('../models/Notification');
const logger = require('../utils/logger');

async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  meta,
}) {
  try {
    return await Notification.create({
      user: userId,
      type,
      title,
      message,
      link,
      meta,
    });
  } catch (err) {
    logger.error('[notification] failed to create', { err: err.message });
    return null;
  }
}

async function notifyOrderPlaced(userId, order) {
  return createNotification({
    userId,
    type: 'order_placed',
    title: 'Order placed',
    message: `Your order ${order.orderId} for ₹${order.total} has been placed.`,
    link: `/orders/${order.orderId}`,
    meta: { orderId: order.orderId, mongoId: String(order._id) },
  });
}

async function notifyPaymentConfirmed(userId, order) {
  return createNotification({
    userId,
    type: 'payment_confirmed',
    title: 'Payment confirmed',
    message: `Payment for order ${order.orderId} is confirmed.`,
    link: `/orders/${order.orderId}`,
    meta: { orderId: order.orderId },
  });
}

async function notifyOrderStatus(userId, order) {
  const typeMap = {
    shipped: 'order_shipped',
    delivered: 'order_delivered',
  };
  const type = typeMap[order.orderStatus] || 'payment_confirmed';
  const titleMap = {
    shipped: 'Order shipped',
    delivered: 'Order delivered',
    payment_confirmed: 'Order update',
    in_production: 'In production',
    quality_check: 'Quality check',
  };

  return createNotification({
    userId,
    type: ['order_shipped', 'order_delivered'].includes(type)
      ? type
      : 'payment_confirmed',
    title: titleMap[order.orderStatus] || 'Order update',
    message: `Order ${order.orderId} is now ${order.orderStatus.replace(/_/g, ' ')}.`,
    link: `/orders/${order.orderId}`,
    meta: { orderId: order.orderId, orderStatus: order.orderStatus },
  });
}

async function notifyCustomOrderQuoted(userId, request) {
  return createNotification({
    userId,
    type: 'custom_order_quoted',
    title: 'Custom order quote ready',
    message: `Quote for ${request.requestId}: ₹${request.quote.amount} (~${request.quote.estimatedDays} days).`,
    link: `/custom-orders/${request.requestId}`,
    meta: { requestId: request.requestId },
  });
}

async function notifyCustomOrderStatus(userId, request) {
  return createNotification({
    userId,
    type: 'custom_order_status',
    title: 'Custom order update',
    message: `${request.requestId} is now ${request.status.replace(/_/g, ' ')}.`,
    link: `/custom-orders/${request.requestId}`,
    meta: { requestId: request.requestId, status: request.status },
  });
}

module.exports = {
  createNotification,
  notifyOrderPlaced,
  notifyPaymentConfirmed,
  notifyOrderStatus,
  notifyCustomOrderQuoted,
  notifyCustomOrderStatus,
};
