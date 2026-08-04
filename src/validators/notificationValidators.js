const Joi = require('joi');

const notificationQuerySchema = Joi.object({
  isRead: Joi.boolean().truthy('true').falsy('false'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

module.exports = { notificationQuerySchema };
