const Joi = require('joi');
const dayjs = require('dayjs');

const make_offer_validator = Joi.object({
  message: Joi.string().min(50).max(250).required().messages({
    'string.base': 'Your message must be a string',
    'string.min':
      'Message is too short. Please provide at least 50 characters.',
    'string.max': 'Message is too long. Please keep it under 250 characters.',
    'any.required': 'Please provide a message for your offer.',
  }),

  start_date: Joi.string()
    .custom((value, helpers) => {
      const date = dayjs(value, 'YYYY-MM-DD', true); // true = strict parsing
      if (!date.isValid()) {
        return helpers.message(
          'Start date must be a valid date in YYYY-MM-DD format'
        );
      }
      if (date.isBefore(dayjs().startOf('day'))) {
        return helpers.message('Start date cannot be in the past');
      }
      return value;
    })
    .required()
    .messages({
      'any.required': 'Please provide a start date for your offer!',
    }),
  milestones: Joi.array()
    .min(1)
    .max(3)
    .items(
      Joi.object({
        title: Joi.string().required(),
        duration: Joi.number().min(1).required(),
      }).unknown(false)
    )
    .required()
    .messages({
      'array.base': 'Milestones should be an array!',
      'array.min': 'You must provide at least one milestone!',
      'array.max': 'Maximum of 3 milestones allowed!',
      'any.required': 'Please provide milestones for your offer!',
    }),
}).unknown(false);

const offer_reject_response = Joi.object({}).unknown(false);

const offer_accept_response = Joi.object({}).unknown(false);

const update_counter_offer = Joi.object({
  message: Joi.string().min(50).max(250).messages({
    'string.base': 'Your message must be a string',
    'string.min':
      'Message is too short. Please provide at least 50 characters.',
    'string.max': 'Message is too long. Please keep it under 250 characters.',
  }),

  milestones: Joi.array()
    .min(1)
    .max(3)
    .items(
      Joi.object({
        title: Joi.string().required(),
        duration: Joi.number().min(1).required(),
      }).unknown(false)
    )
    .required()
    .messages({
      'array.base': 'Milestones should be an array!',
      'array.min': 'You must provide at least one milestone!',
      'array.max': 'Maximum of 3 milestones allowed!',
      'any.required': 'Please provide milestones for your offer!',
    }),
  start_date: Joi.string()
    .custom((value, helpers) => {
      const date = dayjs(value, 'YYYY-MM-DD', true); // true = strict parsing
      if (!date.isValid()) {
        return helpers.message(
          'Start date must be a valid date in YYYY-MM-DD format'
        );
      }
      if (date.isBefore(dayjs().startOf('day'))) {
        return helpers.message('Start date cannot be in the past');
      }
      return value;
    })
    .required()
    .messages({
      'any.required': 'Start date is required!',
    }),
}).unknown(false);

const make_counter_offer_validator = Joi.object({
  message: Joi.string().min(25).max(250).required().messages({
    'string.base': 'Your message must be a string',
    'string.min':
      'Message is too short. Please provide at least 25 characters.',
    'string.max': 'Message is too long. Please keep it under 250 characters.',
    'any.required': 'Please provide a message for your offer.',
  }),

  start_date: Joi.string()
    .custom((value, helpers) => {
      const date = dayjs(value, 'YYYY-MM-DD', true); // true = strict parsing
      if (!date.isValid()) {
        return helpers.message(
          'Start date must be a valid date in YYYY-MM-DD format'
        );
      }
      if (date.isBefore(dayjs().startOf('day'))) {
        return helpers.message('Start date cannot be in the past');
      }
      return value;
    })
    .required()
    .messages({
      'any.required': 'Please provide a start date for your offer!',
    }),

  milestones: Joi.array()
    .min(1)
    .max(3)
    .items(
      Joi.object({
        title: Joi.string().required().messages({
          'base.string': 'Title must be a string!',
          'any.required': 'Title is required!',
        }),
        duration: Joi.number().min(1).required().messages({
          'base.number': 'Duration must be a number!',
          'any.required': 'You must provide a new duration',
        }),
      }).unknown(false)
    )
    .required()
    .messages({
      'array.base': 'Milestones should be an array!',
      'array.min': 'You must provide at least one milestone!',
      'array.max': 'Maximum of 3 milestones allowed!',
      'any.required': 'Please provide milestones for your offer!',
    }),
}).unknown(false);

module.exports = {
  make_offer_validator,
  offer_reject_response,
  offer_accept_response,
  update_counter_offer,
  make_counter_offer_validator,
};
