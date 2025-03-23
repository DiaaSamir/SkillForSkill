const Joi = require('joi');

const make_offer_validator = Joi.object({
  message: Joi.string().min(50).max(250).messages({
    'string.base': 'Your message must be a string',
    'string.min':
      'Message is too short. Please provide at least 50 characters to describe your offer clearly.',
    'string.max': 'Message is too long. Please keep it under 200 characters.',
    'any.required': 'Please provide a description for your post.',
  }),

  start_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/) // Matches 'YYYY-MM-DD' format
    .required()
    .messages({
      'string.pattern.base': 'Please enter a valid date in YYYY-MM-DD format',
      'any.required': 'Please provide a start date for your offer!',
    }),

  end_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please enter a valid date in YYYY-MM-DD format',
      'any.required': 'Please provide an end date for your offer!',
    }),
}).unknown(false);

module.exports = { make_offer_validator };
