const Joi = require('joi');

const open_ticket = Joi.object({
  message: Joi.string().max(255).required().messages({
    'string.max': 'The message cannot exceed 255 characters.',
    'any.required': 'Message cannot be empty!',
  }),
}).unknown(false);

const close_ticket = Joi.object({}).unknown(false);

module.exports = { open_ticket, close_ticket };
