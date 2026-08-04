const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const customOrderRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, unique: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: { type: String, required: true },
    referenceImages: [{ type: String }],
    preferredMaterial: { type: String },
    preferredColor: { type: String },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
      unit: { type: String, default: 'cm' },
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    deadlinePreference: { type: String },
    budgetRange: {
      min: { type: Number },
      max: { type: Number },
    },
    preferredContact: {
      type: String,
      enum: ['whatsapp', 'email'],
      default: 'email',
    },
    additionalNotes: { type: String },
    status: {
      type: String,
      enum: [
        'pending_review',
        'quoted',
        'accepted',
        'rejected',
        'in_production',
        'shipped',
        'delivered',
      ],
      default: 'pending_review',
    },
    quote: {
      amount: { type: Number },
      estimatedDays: { type: Number },
      adminNote: { type: String },
      quotedAt: { type: Date },
      quotedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    convertedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    timeline: [timelineEventSchema],
  },
  { timestamps: true }
);

customOrderRequestSchema.pre('save', async function generateRequestId() {
  if (this.requestId) return;
  const count = await mongoose.model('CustomOrderRequest').countDocuments();
  this.requestId = `COR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
});

customOrderRequestSchema.index({ user: 1 });
customOrderRequestSchema.index({ status: 1 });

module.exports = mongoose.model('CustomOrderRequest', customOrderRequestSchema);
