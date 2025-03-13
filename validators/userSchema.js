const Joi = require('joi');

const user_signup_scehma = Joi.object({
  first_name: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Your first name must be at least 3 characters',
    'string.max': 'Your first name can be 50 characters at most',
    'any.required': 'First name is required!',
  }),

  last_name: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Your last name must be at least 3 characters',
    'string.max': 'Your last name can be 50 characters at maximum',
    'any.required': 'Last name is required!',
  }),

  created_at: Joi.date().messages({
    date: 'Created at must be a date',
  }),

  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email and try again!',
    'any.required': 'Email is required!',
  }),

  phone_number: Joi.string().length(11).messages({
    'string.min': 'Your phone number must be at least 11 digits',
    'string.max': 'Your phone number must be at most 11 digits',
  }),

  password: Joi.string()
    .min(8) // At least 8 characters
    .max(30) // At most 30 characters
    .pattern(
      new RegExp('^(?=.*[A-Za-z])(?=.*\\d)(?=.*[\\W_])[A-Za-z\\d\\W_]{8,}$')
    )
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot be longer than 30 characters',
      'string.pattern.base':
        'Password must contain at least one letter, one number, and one special character (underscore `_` is allowed).',
      'any.required': 'Password is required',
    }),

  password_confirm: Joi.string().required().messages({
    'any.required': 'Please confirm your password!',
  }),
}).unknown(false);

const user_login_schema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email!',
    'any.required': 'Email is required to login!',
  }),

  password: Joi.string().min(8).max(30).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must be at most 30 characters',
    'any.required': 'Password is required to log in!',
  }),
}).unknown(false);

const forgot_password_schema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email!',
    'any.required': 'Email is required to reset your password',
  }),
}).unknown(false);

const reset_password_schema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email!',
    'any.required': 'Email is required',
  }),
  resetCode: Joi.string().length(6).required().messages({
    'string.length': 'Wrong reset code!',
    'any.required': 'Reset code is required',
  }),

  newPassword: Joi.string()
    .min(8) // At least 8 characters
    .max(30) // At most 30 characters
    .pattern(
      new RegExp('^(?=.*[A-Za-z])(?=.*\\d)(?=.*[\\W_])[A-Za-z\\d\\W_]{8,}$')
    )
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot be longer than 30 characters',
      'string.pattern.base':
        'Password must contain at least one letter, one number, and one special character (underscore `_` is allowed).',
      'any.required': 'Password is required',
    }),

  newPasswordConfirm: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match.',
      'any.required': 'You have to confirm your new password.',
    }),
}).unknown(false);

const update_password_schema = Joi.object({
  oldPassword: Joi.string().required().messages({
    'any.required': 'Please provide your old password',
  }),

  newPassword: Joi.string()
    .min(8) // At least 8 characters
    .max(30) // At most 30 characters
    .pattern(
      new RegExp('^(?=.*[A-Za-z])(?=.*\\d)(?=.*[\\W_])[A-Za-z\\d\\W_]{8,}$')
    )
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot be longer than 30 characters',
      'string.pattern.base':
        'Password must contain at least one letter, one number, and one special character (underscore `_` is allowed).',
      'any.required': 'Password is required',
    }),

  newPasswordConfirm: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match.',
      'any.required': 'You have to confirm your new password.',
    }),
}).unknown(false);

const update_first_and_last_name = Joi.object({
  first_name: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Your first name must be at least 3 characters',
    'string.max': 'Your first name can be 50 characters at maximum',
    'any.required': 'First name is required!',
  }),

  last_name: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Your last name must be at least 3 characters',
    'string.max': 'Your last name can be 50 characters at maximum',
    'any.required': 'Last name is required!',
  }),
}).unknown(false);

module.exports = {
  user_login_schema,
  user_signup_scehma,
  reset_password_schema,
  forgot_password_schema,
  update_password_schema,
  update_first_and_last_name,
};
