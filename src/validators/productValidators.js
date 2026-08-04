const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const variantSchema = Joi.object({
  _id: objectId,
  label: Joi.string().required(),
  material: Joi.string().allow('', null),
  color: Joi.string().allow('', null),
  size: Joi.string().allow('', null),
  price: Joi.number().min(0).required(),
  stock: Joi.number().integer().min(0).default(0),
  sku: Joi.string().allow('', null),
});

const dimensionSchema = Joi.object({
  length: Joi.number(),
  width: Joi.number(),
  height: Joi.number(),
  unit: Joi.string().default('cm'),
  weight: Joi.number(),
});

const createProductSchema = Joi.object({
  title: Joi.string().trim().min(2).max(160).required(),
  slug: Joi.string().trim().lowercase(),
  description: Joi.string().required(),
  shortDesc: Joi.string().max(160).allow('', null),
  category: objectId.required(),
  tags: Joi.array().items(Joi.string().trim().lowercase()),
  images: Joi.array().items(Joi.string()),
  variants: Joi.array().items(variantSchema).min(1).required(),
  dimensions: dimensionSchema,
  printTime: Joi.string().allow('', null),
  isCustomizable: Joi.boolean(),
  isActive: Joi.boolean(),
  isFeatured: Joi.boolean(),
  metaTitle: Joi.string().allow('', null),
  metaDescription: Joi.string().allow('', null),
  locationId: objectId,
});

const updateProductSchema = createProductSchema.fork(
  ['title', 'description', 'category', 'variants'],
  (schema) => schema.optional()
).min(1);

const productQuerySchema = Joi.object({
  q: Joi.string().allow(''),
  category: objectId,
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  material: Joi.string(),
  rating: Joi.number().min(0).max(5),
  inStock: Joi.boolean().truthy('true').falsy('false'),
  featured: Joi.boolean().truthy('true').falsy('false'),
  sort: Joi.string().valid(
    'newest',
    'price_asc',
    'price_desc',
    'rating',
    'popular'
  ),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(12),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
};
