const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const createReviewSchema = Joi.object({
  productId: objectId.required(),
  orderId: Joi.alternatives().try(objectId, Joi.string()).required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().max(100).allow('', null),
  comment: Joi.string().max(1000).allow('', null),
  images: Joi.array().items(Joi.string()).max(5),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  title: Joi.string().max(100).allow('', null),
  comment: Joi.string().max(1000).allow('', null),
  images: Joi.array().items(Joi.string()).max(5),
}).min(1);

const reviewQuerySchema = Joi.object({
  sort: Joi.string()
    .valid('newest', 'highest', 'lowest', 'helpful')
    .default('newest'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
};
