const Joi = require('joi');

const make_review = Joi.object({
  rating: Joi.number().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number between 1 and 5.',
    'number.min': 'Rating must be at least 1.',
    'number.max': 'Rating cannot be more than 5.',
    'any.required': 'Rating is required.',
  }),

  review: Joi.string().min(25).max(255).required().messages({
    'string.base': 'Review must be a text string.',
    'string.empty': 'Review cannot be empty.',
    'string.min': 'Review must be at least 25 characters long.',
    'string.max': 'Review cannot exceed 255 characters.',
    'any.required': 'Review is required.',
  }),
}).unknown(false);
module.exports = { make_review };
