const Joi = require('joi');

const skillSchema = Joi.string()
  .valid(
    'Backend',
    'Frontend',
    'Full Stack',
    'Graphic Design',
    'Video Editing',
    '3D Modeling',
    'Motion Graphics',
    'Logo Design',
    'Animation',
    'UI/UX Design'
  )
  .required()
  .messages({
    'string.base': 'String is required',
    'any.only': 'Please enter a valid skill!',
    'any.required': 'You have to provide a skill',
  });

module.exports = { skillSchema };
