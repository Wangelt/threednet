const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().required(),
  description: Joi.string().allow('', null),
  discountType: Joi.string().valid('flat', 'percentage').required(),
  discountValue: Joi.number().min(0).required(),
  maxDiscount: Joi.number().min(0),
  minOrderValue: Joi.number().min(0).default(0),
  expiresAt: Joi.date().greater('now').required(),
  usageLimit: Joi.number().integer().min(1).allow(null),
  usageLimitPerUser: Joi.number().integer().min(1).default(1),
  applicableTo: Joi.object({
    type: Joi.string().valid('all', 'category', 'product').default('all'),
    categories: Joi.array().items(objectId),
    products: Joi.array().items(objectId),
  }).default({ type: 'all', categories: [], products: [] }),
  isActive: Joi.boolean().default(true),
});

const updateCouponSchema = createCouponSchema.fork(
  ['code', 'discountType', 'discountValue', 'expiresAt'],
  (s) => s.optional()
).keys({
  expiresAt: Joi.date(),
}).min(1);

const validateCouponSchema = Joi.object({
  code: Joi.string().trim().required(),
  subtotal: Joi.number().min(0),
});

module.exports = {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
};
