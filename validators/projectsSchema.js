const Joi = require('joi');

const submit_project_link = Joi.object({
  project_link: Joi.string().min(10).max(255).required().messages({
    'string.base': 'String is required',
    'string.min': 'Project link is too short!',
    'string.max': 'Project link is too long!',
    'any.required': 'Please provide a link for your project!',
  }),
}).unknown(false);

module.exports = { submit_project_link };
