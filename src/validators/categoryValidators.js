const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  slug: Joi.string().trim().lowercase(),
  description: Joi.string().allow('', null),
  image: Joi.string().uri().allow('', null),
  isActive: Joi.boolean(),
  sortOrder: Joi.number().integer(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  slug: Joi.string().trim().lowercase(),
  description: Joi.string().allow('', null),
  image: Joi.string().uri().allow('', null),
  isActive: Joi.boolean(),
  sortOrder: Joi.number().integer(),
}).min(1);

module.exports = { createCategorySchema, updateCategorySchema };
