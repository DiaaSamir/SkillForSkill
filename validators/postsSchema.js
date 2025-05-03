const Joi = require('joi');
const { skillSchema } = require('./skillSchemaDefinition');
const dayjs = require('dayjs');
const create_post = Joi.object({
  required_SkillName: skillSchema,
  description: Joi.string().min(50).max(200).required().messages({
    'string.base': 'String is required',
    'string.min':
      'Description is too short. Please provide at least 50 characters to describe your offer clearly.',
    'string.max':
      'Description is too long. Please keep it under 200 characters.',
    'any.required': 'Please provide a description for your post.',
  }),
  title: Joi.string().min(25).max(70).required().messages({
    'string.base': 'Title must be a text.',
    'string.min': 'Title is too short. Please provide at least 25 characters.',
    'string.max': 'Title is too long. Please keep it under 70 characters.',
    'any.required': 'Please provide a title for your post.',
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

const delete_post = Joi.object({}).unknown(false);

const update_post = Joi.object({
  required_SkillName: skillSchema.optional(),
  description: Joi.string().min(50).max(200).messages({
    'string.base': 'String is required',
    'string.min':
      'Description is too short. Please provide at least 50 characters to describe your offer clearly.',
    'string.max':
      'Description is too long. Please keep it under 200 characters.',
    'any.required': 'Please provide a description for your post.',
  }),
  title: Joi.string().min(25).max(70).messages({
    'string.base': 'Title must be a text.',
    'string.min': 'Title is too short. Please provide at least 25 characters.',
    'string.max': 'Title is too long. Please keep it under 70 characters.',
    'any.required': 'Please provide a title for your post.',
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

const get_posts_with_specific_skills = Joi.object({
  required_SkillName: skillSchema,
}).unknown(false);

module.exports = {
  create_post,
  delete_post,
  update_post,
  get_posts_with_specific_skills,
};
