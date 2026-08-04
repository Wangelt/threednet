const Joi = require('joi');

const createCustomOrderSchema = Joi.object({
  description: Joi.string().trim().min(10).max(5000).required(),
  referenceImages: Joi.array().items(Joi.string()).max(5),
  preferredMaterial: Joi.string().allow('', null),
  preferredColor: Joi.string().allow('', null),
  dimensions: Joi.object({
    length: Joi.number().positive(),
    width: Joi.number().positive(),
    height: Joi.number().positive(),
    unit: Joi.string().default('cm'),
  }),
  quantity: Joi.number().integer().min(1).default(1),
  deadlinePreference: Joi.string().allow('', null),
  budgetRange: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0),
  }),
  preferredContact: Joi.string().valid('whatsapp', 'email').default('email'),
  additionalNotes: Joi.string().max(2000).allow('', null),
});

const updateCustomOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'pending_review',
      'quoted',
      'accepted',
      'rejected',
      'in_production',
      'shipped',
      'delivered'
    )
    .required(),
  quote: Joi.object({
    amount: Joi.number().min(0).required(),
    estimatedDays: Joi.number().integer().min(1).required(),
    adminNote: Joi.string().allow('', null),
  }).when('status', {
    is: 'quoted',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  note: Joi.string().allow('', null),
});

const customOrderQuerySchema = Joi.object({
  status: Joi.string(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  createCustomOrderSchema,
  updateCustomOrderStatusSchema,
  customOrderQuerySchema,
};
