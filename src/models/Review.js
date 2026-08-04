const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, maxlength: 100 },
    comment: { type: String, maxlength: 1000 },
    images: [{ type: String }],
    isVerifiedPurchase: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false },
    helpfulVotes: { type: Number, default: 0 },
    helpfulVotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, rating: -1 });
reviewSchema.index({ isHidden: 1 });

async function recalculateProductRating(productId) {
  const stats = await mongoose.model('Review').aggregate([
    { $match: { product: productId, isHidden: false } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  await mongoose.model('Product').findByIdAndUpdate(productId, {
    averageRating: stats[0] ? Number(stats[0].avgRating.toFixed(1)) : 0,
    reviewCount: stats[0]?.count || 0,
  });
}

reviewSchema.post('save', async function recalculateOnSave() {
  await recalculateProductRating(this.product);
});

reviewSchema.post('findOneAndUpdate', async function recalculateOnUpdate(doc) {
  if (doc) await recalculateProductRating(doc.product);
});

module.exports = mongoose.model('Review', reviewSchema);
