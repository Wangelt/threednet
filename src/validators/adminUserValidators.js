const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const listAdminUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const createAdminUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).max(128).required(),
  locationId: objectId.required(),
});

const updateAdminUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  email: Joi.string().email({ tlds: { allow: false } }),
  locationId: objectId,
})
  .min(1)
  .messages({ 'object.min': 'At least one of name, email, or locationId is required' });

const blockAdminUserSchema = Joi.object({
  isBlocked: Joi.boolean().required(),
});

const adminUserIdParamsSchema = Joi.object({
  id: objectId.required(),
});

module.exports = {
  listAdminUsersQuerySchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  blockAdminUserSchema,
  adminUserIdParamsSchema,
};
