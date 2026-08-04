const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    stock: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

inventorySchema.index({ variantId: 1, location: 1 }, { unique: true });
inventorySchema.index({ location: 1, product: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
