const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { resolveOrderFilter } = require('../services/orderService');

const createReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, title, comment, images } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  const order = await Order.findOne({
    ...resolveOrderFilter(orderId),
    user: req.user._id,
  });
  if (!order) throw new ApiError(404, 'Order not found');

  if (!['payment_confirmed', 'in_production', 'quality_check', 'shipped', 'delivered'].includes(order.orderStatus)) {
    throw new ApiError(400, 'Order is not eligible for reviews yet');
  }

  const purchased = order.items.some(
    (item) => String(item.product) === String(productId)
  );
  if (!purchased) {
    throw new ApiError(403, 'You can only review products you purchased');
  }

  const existing = await Review.findOne({
    product: productId,
    user: req.user._id,
  });
  if (existing) {
    throw new ApiError(409, 'You already reviewed this product');
  }

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    order: order._id,
    rating,
    title,
    comment,
    images,
    isVerifiedPurchase: true,
  });

  await review.populate('user', 'name');

  res.status(201).json({ success: true, data: { review } });
});

const getProductReviews = asyncHandler(async (req, res) => {
  const { sort, page, limit } = req.validated.query;
  const filter = { product: req.params.productId, isHidden: false };

  let sortSpec = { createdAt: -1 };
  if (sort === 'highest') sortSpec = { rating: -1, createdAt: -1 };
  if (sort === 'lowest') sortSpec = { rating: 1, createdAt: -1 };
  if (sort === 'helpful') sortSpec = { helpfulVotes: -1, createdAt: -1 };

  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name')
      .sort(sortSpec)
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
    },
  });
});

const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review || review.isHidden) throw new ApiError(404, 'Review not found');
  if (String(review.user) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only edit your own review');
  }

  Object.assign(review, req.body);
  await review.save();
  await review.populate('user', 'name');

  res.json({ success: true, data: { review } });
});

const hideReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');

  review.isHidden = true;
  await review.save();

  res.json({ success: true, message: 'Review hidden' });
});

const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review || review.isHidden) throw new ApiError(404, 'Review not found');

  const already = review.helpfulVotedBy.some(
    (id) => String(id) === String(req.user._id)
  );
  if (already) {
    throw new ApiError(400, 'You already marked this review as helpful');
  }

  review.helpfulVotedBy.push(req.user._id);
  review.helpfulVotes += 1;
  await review.save();

  res.json({
    success: true,
    data: { helpfulVotes: review.helpfulVotes },
  });
});

module.exports = {
  createReview,
  getProductReviews,
  updateReview,
  hideReview,
  markHelpful,
};
