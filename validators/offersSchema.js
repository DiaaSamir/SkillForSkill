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

  end_date: Joi.string().custom((value, helpers) => {
    const date = dayjs(value, 'YYYY-MM-DD', true);
    if (!date.isValid()) {
      return helpers.message(
        'End date must be a valid date in YYYY-MM-DD format'
      );
    }
    if (date.isBefore(dayjs().startOf('day'))) {
      return helpers.message('End date cannot be in the past');
    }
    return value;
  }),

  milestones: Joi.array()
    .min(1)
    .max(3)
    .items(
      Joi.object({
        title: Joi.string().required(),
        duration: Joi.number().min(1).required(),
      })
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
      })
    )
    .required()
    .messages({
      'array.base': 'Milestones should be an array!',
      'array.min': 'You must provide at least one milestone!',
      'array.max': 'Maximum of 3 milestones allowed!',
      'any.required': 'Please provide milestones for your offer!',
    }),
  start_date: Joi.string().custom((value, helpers) => {
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
  }),

  end_date: Joi.string().custom((value, helpers) => {
    const date = dayjs(value, 'YYYY-MM-DD', true);
    if (!date.isValid()) {
      return helpers.message(
        'End date must be a valid date in YYYY-MM-DD format'
      );
    }
    if (date.isBefore(dayjs().startOf('day'))) {
      return helpers.message('End date cannot be in the past');
    }
    return value;
  }),
}).unknown(false);
module.exports = {
  make_offer_validator,
  offer_reject_response,
  offer_accept_response,
  update_counter_offer,
};
