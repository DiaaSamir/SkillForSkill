const Joi = require('joi');

const skill_add_update = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'YOu have to provide a name for the skill',
  }),
}).unknown(false);

module.exports = { skill_add_update };
