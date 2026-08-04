const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const listInventoryQuerySchema = Joi.object({
  locationId: objectId,
  productId: objectId,
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(100),
});

const setInventorySchema = Joi.object({
  productId: objectId.required(),
  variantId: objectId.required(),
  stock: Joi.number().integer().min(0).required(),
  locationId: objectId,
});

module.exports = {
  listInventoryQuerySchema,
  setInventorySchema,
};
