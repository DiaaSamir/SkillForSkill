const Joi = require('joi');

const email_signup_verification = Joi.object({
  email_verification_code: Joi.string().length(6).required().messages({
    'string.length': 'Please enter a valid code',
    'any.required': 'Verification code is required to verify your email!',
  }),
}).unknown(false);

const email_reset_verification_request = Joi.object({
  newEmail: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email',
    'any.required': 'Email is required',
  }),
}).unknown(false);

const email_reset_verification = Joi.object({
  code: Joi.string().length(6).required().messages({
    'string.length': 'Invalid Code!',
    'any.required': 'Reset code is required!',
  }),
}).unknown(false);

module.exports = {
  email_signup_verification,
  email_reset_verification_request,
  email_reset_verification,
};
