const mongoose = require('mongoose');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');

function resolveOrderFilter(idOrOrderId) {
  if (
    mongoose.Types.ObjectId.isValid(idOrOrderId) &&
    String(idOrOrderId).length === 24
  ) {
    return { $or: [{ _id: idOrOrderId }, { orderId: idOrOrderId }] };
  }
  return { orderId: idOrOrderId };
}

async function loadOwnedOrder(idOrOrderId, user) {
  const order = await Order.findOne(resolveOrderFilter(idOrOrderId));
  if (!order) throw new ApiError(404, 'Order not found');

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  if (!isAdmin && String(order.user) !== String(user._id)) {
    throw new ApiError(403, 'Not allowed to access this order');
  }
  return order;
}

module.exports = { resolveOrderFilter, loadOwnedOrder };
