const Joi = require('joi');
const { skillSchema } = require('./skillSchemaDefinition');

const create_post = Joi.object({
  skillName: skillSchema,
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
}).unknown(false);

module.exports = { create_post };
