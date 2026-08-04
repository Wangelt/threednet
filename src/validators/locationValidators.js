const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const listLocationsQuerySchema = Joi.object({
  includeInactive: Joi.boolean().truthy('true').falsy('false').default(false),
});

const createLocationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  code: Joi.string().trim().uppercase().min(2).max(16).required(),
  city: Joi.string().trim().allow('', null),
  address: Joi.string().trim().allow('', null),
  isActive: Joi.boolean().default(true),
});

const updateLocationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  code: Joi.string().trim().uppercase().min(2).max(16),
  city: Joi.string().trim().allow('', null),
  address: Joi.string().trim().allow('', null),
  isActive: Joi.boolean(),
})
  .min(1)
  .messages({ 'object.min': 'At least one field is required' });

const locationIdParamsSchema = Joi.object({
  id: objectId.required(),
});

module.exports = {
  listLocationsQuerySchema,
  createLocationSchema,
  updateLocationSchema,
  locationIdParamsSchema,
};
