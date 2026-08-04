const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String },
    discountType: {
      type: String,
      enum: ['flat', 'percentage'],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number },
    minOrderValue: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    usageLimit: { type: Number, default: null },
    usageLimitPerUser: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    applicableTo: {
      type: {
        type: String,
        enum: ['all', 'category', 'product'],
        default: 'all',
      },
      categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
      products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

couponSchema.index({ expiresAt: 1 });

couponSchema.methods.calculateDiscount = function calculateDiscount(subtotal) {
  if (this.discountType === 'flat') {
    return Math.min(this.discountValue, subtotal);
  }
  const pct = (subtotal * this.discountValue) / 100;
  return this.maxDiscount != null ? Math.min(pct, this.maxDiscount) : pct;
};

module.exports = mongoose.model('Coupon', couponSchema);
