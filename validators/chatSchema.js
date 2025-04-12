const Joi = require('joi');

const send_message = Joi.object({
  message: Joi.string().max(255).required().messages({
    'string.max': 'The message cannot exceed 255 characters.',
    'any.required': 'Message cannot be empty!',
  }),
});

module.exports = { send_message };
