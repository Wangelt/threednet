const Inventory = require('../models/Inventory');
const Location = require('../models/Location');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { findVariant } = require('./cartService');

async function recomputeVariantTotal(productId, variantId) {
  const product = await Product.findById(productId);
  if (!product) return null;

  const variant = findVariant(product, variantId);
  if (!variant) return null;

  const rows = await Inventory.find({ product: productId, variantId });
  const total = rows.reduce((sum, row) => sum + (row.stock || 0), 0);
  variant.stock = total;
  await product.save();
  return product;
}

async function setStock({ productId, variantId, locationId, stock }) {
  if (stock < 0) throw new ApiError(400, 'Stock cannot be negative');

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');
  const variant = findVariant(product, variantId);
  if (!variant) throw new ApiError(400, 'Invalid variant');

  const location = await Location.findById(locationId);
  if (!location || !location.isActive) {
    throw new ApiError(400, 'Invalid or inactive location');
  }

  const row = await Inventory.findOneAndUpdate(
    { variantId, location: locationId },
    {
      $set: { stock, product: productId, variantId, location: locationId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await recomputeVariantTotal(productId, variantId);
  return row;
}

async function adjustStock({ productId, variantId, locationId, delta }) {
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');
  const variant = findVariant(product, variantId);
  if (!variant) throw new ApiError(400, 'Invalid variant');

  let row = await Inventory.findOne({ variantId, location: locationId });
  if (!row) {
    row = await Inventory.create({
      product: productId,
      variantId,
      location: locationId,
      stock: 0,
    });
  }

  const next = row.stock + delta;
  if (next < 0) {
    throw new ApiError(400, 'Insufficient location stock');
  }
  row.stock = next;
  await row.save();
  await recomputeVariantTotal(productId, variantId);
  return row;
}

async function listStockByProduct(productId) {
  const rows = await Inventory.find({ product: productId }).populate(
    'location',
    'name code isActive'
  );
  const byVariant = new Map();
  for (const row of rows) {
    const key = String(row.variantId);
    if (!byVariant.has(key)) byVariant.set(key, []);
    byVariant.get(key).push({
      locationId: row.location?._id || row.location,
      locationCode: row.location?.code,
      locationName: row.location?.name,
      stock: row.stock,
    });
  }
  return byVariant;
}

async function attachStockByLocation(product) {
  if (!product) return product;
  const map = await listStockByProduct(product._id);
  const obj = product.toObject ? product.toObject() : { ...product };
  obj.variants = (obj.variants || []).map((v) => ({
    ...v,
    stockByLocation: map.get(String(v._id)) || [],
  }));
  return obj;
}

/**
 * Pick an active location that can fulfill every line; prefer highest total available.
 * lines: [{ productId, variantId, quantity, title? }]
 */
async function pickFulfillmentLocation(lines) {
  const locations = await Location.find({ isActive: true });
  if (!locations.length) {
    throw new ApiError(400, 'No active fulfillment locations');
  }

  const variantIds = [...new Set(lines.map((l) => String(l.variantId)))];
  const inventoryRows = await Inventory.find({
    variantId: { $in: variantIds },
    location: { $in: locations.map((l) => l._id) },
  });

  const stockMap = new Map();
  for (const row of inventoryRows) {
    stockMap.set(`${row.location}:${row.variantId}`, row.stock);
  }

  let best = null;
  let bestScore = -1;

  for (const loc of locations) {
    let ok = true;
    let score = 0;
    for (const line of lines) {
      const available =
        stockMap.get(`${loc._id}:${line.variantId}`) ?? 0;
      if (available < line.quantity) {
        ok = false;
        break;
      }
      score += available;
    }
    if (ok && score > bestScore) {
      best = loc;
      bestScore = score;
    }
  }

  if (!best) {
    throw new ApiError(400, 'Insufficient stock at any single location');
  }
  return best;
}

async function decrementStockAtLocation(orderItems, locationId) {
  for (const item of orderItems) {
    if (!item.product || !item.variantId) continue;
    await adjustStock({
      productId: item.product,
      variantId: item.variantId,
      locationId,
      delta: -item.quantity,
    });
    const product = await Product.findById(item.product);
    if (product) {
      product.totalSold += item.quantity;
      await product.save();
    }
  }
}

async function restockAtLocation(orderItems, locationId) {
  for (const item of orderItems) {
    if (!item.product || !item.variantId) continue;
    await adjustStock({
      productId: item.product,
      variantId: item.variantId,
      locationId,
      delta: item.quantity,
    });
    const product = await Product.findById(item.product);
    if (product) {
      product.totalSold = Math.max(0, product.totalSold - item.quantity);
      await product.save();
    }
  }
}

module.exports = {
  recomputeVariantTotal,
  setStock,
  adjustStock,
  listStockByProduct,
  attachStockByLocation,
  pickFulfillmentLocation,
  decrementStockAtLocation,
  restockAtLocation,
};
