const Joi = require('joi');
const { skillSchema } = require('./skillSchemaDefinition');

const skill_add_update_for_admins = Joi.object({
  name: Joi.string().required().messages({
    'string.base': 'Skill name must be string',
    'any.required': 'You have to provide a name for the skill',
  }),
}).unknown(false);

const user_add_or_update_skill_validator = Joi.object({
  skillName: skillSchema,
}).unknown(false);

module.exports = {
  skill_add_update_for_admins,
  user_add_or_update_skill_validator,
};
