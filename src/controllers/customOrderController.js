const mongoose = require('mongoose');
const CustomOrderRequest = require('../models/CustomOrderRequest');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendMail } = require('../utils/email');
const {
  notifyCustomOrderQuoted,
  notifyCustomOrderStatus,
} = require('../services/notificationService');

function resolveRequestFilter(idOrRequestId) {
  if (
    mongoose.Types.ObjectId.isValid(idOrRequestId) &&
    String(idOrRequestId).length === 24
  ) {
    return { $or: [{ _id: idOrRequestId }, { requestId: idOrRequestId }] };
  }
  return { requestId: idOrRequestId };
}

async function loadOwnedRequest(idOrRequestId, user) {
  const request = await CustomOrderRequest.findOne(
    resolveRequestFilter(idOrRequestId)
  );
  if (!request) throw new ApiError(404, 'Custom order request not found');

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  if (!isAdmin && String(request.user) !== String(user._id)) {
    throw new ApiError(403, 'Not allowed to access this request');
  }
  return request;
}

function buildShippingFromUser(user) {
  if (user.addresses?.length) {
    const addr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
    return {
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    };
  }
  return {
    fullName: user.name,
    phone: user.phone || '0000000000',
    line1: 'Address to be confirmed',
    city: 'TBD',
    state: 'TBD',
    pincode: '000000',
  };
}

const createCustomOrder = asyncHandler(async (req, res) => {
  const request = await CustomOrderRequest.create({
    ...req.body,
    user: req.user._id,
    status: 'pending_review',
    timeline: [
      {
        status: 'pending_review',
        note: 'Custom order request submitted',
        updatedBy: req.user._id,
      },
    ],
  });

  sendMail({
    to: req.user.email,
    subject: `Custom order received — ${request.requestId}`,
    text: `Hi ${req.user.name},\n\nWe received your custom order request ${request.requestId}. Our engineers will review it and send a quote soon.`,
  }).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Custom order request submitted',
    data: { request },
  });
});

const listCustomOrders = asyncHandler(async (req, res) => {
  const isAdmin =
    req.user.role === 'admin' || req.user.role === 'super_admin';
  const { status, page, limit } = req.validated.query;

  const filter = isAdmin ? {} : { user: req.user._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    CustomOrderRequest.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CustomOrderRequest.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
    },
  });
});

const getCustomOrder = asyncHandler(async (req, res) => {
  const request = await loadOwnedRequest(req.params.id, req.user);
  await request.populate('user', 'name email phone');
  res.json({ success: true, data: { request } });
});

const updateCustomOrderStatus = asyncHandler(async (req, res) => {
  const request = await CustomOrderRequest.findOne(
    resolveRequestFilter(req.params.id)
  );
  if (!request) throw new ApiError(404, 'Custom order request not found');

  const { status, quote, note } = req.body;
  request.status = status;

  if (status === 'quoted') {
    if (!quote) throw new ApiError(400, 'Quote details required');
    request.quote = {
      amount: quote.amount,
      estimatedDays: quote.estimatedDays,
      adminNote: quote.adminNote,
      quotedAt: new Date(),
      quotedBy: req.user._id,
    };
  }

  request.timeline.push({
    status,
    note: note || `Status updated to ${status}`,
    updatedBy: req.user._id,
  });

  await request.save();

  if (status === 'quoted') {
    await notifyCustomOrderQuoted(request.user, request);
    await request.populate('user', 'email name');
    sendMail({
      to: request.user.email,
      subject: `Quote ready — ${request.requestId}`,
      text: `Your custom order ${request.requestId} has been quoted at ₹${request.quote.amount} (est. ${request.quote.estimatedDays} days).`,
    }).catch(() => {});
  } else {
    await notifyCustomOrderStatus(request.user, request);
  }

  res.json({ success: true, data: { request } });
});

const acceptQuote = asyncHandler(async (req, res) => {
  const request = await loadOwnedRequest(req.params.id, req.user);

  if (request.status !== 'quoted') {
    throw new ApiError(400, 'No active quote to accept');
  }
  if (!request.quote?.amount) {
    throw new ApiError(400, 'Quote amount missing');
  }

  const lineTotal = request.quote.amount * request.quantity;

  const order = await Order.create({
    user: req.user._id,
    items: [
      {
        title: `Custom order ${request.requestId}`,
        variantLabel: [
          request.preferredMaterial,
          request.preferredColor,
        ]
          .filter(Boolean)
          .join(' / ') || 'Custom',
        image: request.referenceImages?.[0],
        price: request.quote.amount,
        quantity: request.quantity,
      },
    ],
    shippingAddress: buildShippingFromUser(req.user),
    subtotal: lineTotal,
    discount: 0,
    shippingCost: 0,
    total: lineTotal,
    paymentMethod: 'razorpay',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    customOrderRequest: request._id,
    timeline: [
      {
        status: 'pending',
        message: `Created from custom request ${request.requestId}`,
      },
    ],
  });

  request.status = 'accepted';
  request.convertedOrderId = order._id;
  request.timeline.push({
    status: 'accepted',
    note: 'Customer accepted quote',
    updatedBy: req.user._id,
  });
  await request.save();
  await notifyCustomOrderStatus(request.user, request);

  res.json({
    success: true,
    message: 'Quote accepted. Complete payment for the generated order.',
    data: { request, order },
  });
});

const rejectQuote = asyncHandler(async (req, res) => {
  const request = await loadOwnedRequest(req.params.id, req.user);

  if (request.status !== 'quoted') {
    throw new ApiError(400, 'No active quote to reject');
  }

  request.status = 'rejected';
  request.timeline.push({
    status: 'rejected',
    note: req.body?.note || 'Customer rejected quote',
    updatedBy: req.user._id,
  });
  await request.save();
  await notifyCustomOrderStatus(request.user, request);

  res.json({ success: true, message: 'Quote rejected', data: { request } });
});

module.exports = {
  createCustomOrder,
  listCustomOrders,
  getCustomOrder,
  updateCustomOrderStatus,
  acceptQuote,
  rejectQuote,
};
