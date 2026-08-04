const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const addWishlistSchema = Joi.object({
  productId: objectId.required(),
});

const moveToCartSchema = Joi.object({
  productId: objectId.required(),
  variantId: objectId.required(),
  quantity: Joi.number().integer().min(1).default(1),
});

module.exports = { addWishlistSchema, moveToCartSchema };
