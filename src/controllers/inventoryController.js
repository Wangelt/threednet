const Inventory = require('../models/Inventory');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { setStock } = require('../services/inventoryService');

function resolveLocationId(req, requestedLocationId) {
  if (req.user.role === 'super_admin') {
    if (!requestedLocationId) {
      throw new ApiError(400, 'locationId is required');
    }
    return requestedLocationId;
  }
  if (!req.user.location) {
    throw new ApiError(400, 'Admin has no assigned location');
  }
  if (
    requestedLocationId &&
    String(requestedLocationId) !== String(req.user.location)
  ) {
    throw new ApiError(403, 'Cannot access another location inventory');
  }
  return req.user.location;
}

const listInventory = asyncHandler(async (req, res) => {
  const { productId, page, limit } = req.validated.query;
  let { locationId } = req.validated.query;

  if (req.user.role === 'admin') {
    if (!req.user.location) {
      throw new ApiError(400, 'Admin has no assigned location');
    }
    locationId = req.user.location;
  }

  const filter = {};
  if (locationId) filter.location = locationId;
  if (productId) filter.product = productId;

  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    Inventory.find(filter)
      .populate('location', 'name code')
      .populate('product', 'title slug')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Inventory.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      inventory: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
    },
  });
});

const upsertInventory = asyncHandler(async (req, res) => {
  const locationId = resolveLocationId(req, req.body.locationId);
  const row = await setStock({
    productId: req.body.productId,
    variantId: req.body.variantId,
    locationId,
    stock: req.body.stock,
  });

  res.json({
    success: true,
    message: 'Inventory updated',
    data: { inventory: row },
  });
});

module.exports = {
  listInventory,
  upsertInventory,
};
