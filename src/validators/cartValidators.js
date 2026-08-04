const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const addToCartSchema = Joi.object({
  productId: objectId.required(),
  variantId: objectId.required(),
  quantity: Joi.number().integer().min(1).default(1),
});

const updateCartSchema = Joi.object({
  itemId: objectId.required(),
  quantity: Joi.number().integer().min(1).required(),
});

const removeCartSchema = Joi.object({
  itemId: objectId.required(),
});

const applyCouponSchema = Joi.object({
  code: Joi.string().trim().required(),
});

module.exports = {
  addToCartSchema,
  updateCartSchema,
  removeCartSchema,
  applyCouponSchema,
};
