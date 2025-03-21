const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const client = require('../db');
const factory = require('./handlerFactory');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const {
  skill_add_update_for_admins,
  user_add_or_update_skill_validator,
} = require('../validators/skillsSchema');

//************************Operations of directly adding, deleting, getting, updating skills*********************************** */

exports.getSkill = factory.getOne('skills');

exports.getAllSkills = factory.getAll('skills');

exports.deleteSkill = factory.deleteOne('skills');

exports.createSkill = catchAsync(async (req, res, next) => {
  const { error } = skill_add_update_for_admins.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }
  const { name } = req.body;

  const skillQuery = await client.query(`SELECT * FROM skills WHERE name =$1`, [
    name,
  ]);

  if (skillQuery.rows.length > 0) {
    return next(
      new AppError('This skill already exists! try another one', 400)
    );
  }

  const addSkillQuery = await client.query(
    `INSERT INTO skills (name) VALUES ($1) RETURNING name`,
    [name]
  );

  const addSkill = addSkillQuery.rows[0];

  if (!addSkill) {
    return next(new AppError('Error in creating skill', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'You have created a skill successfully',
    addSkill,
  });
});

exports.updateSkill = catchAsync(async (req, res, next) => {
  const { error } = skill_add_update.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const skillId = req.params.id;
  const { name } = req.body;

  const updateSkillQuery = await client.query(
    `UPDATE skills SET name = $1 WHERE id = $2 RETURNING name`,
    [name, skillId]
  );

  const skill = updateSkillQuery.rows[0];

  if (!skill) {
    return next(new AppError('Error in updating skill name', 400));
  }

  res.status(200).json({
    status: 'success',
    skill,
  });
});

//*************************************Operations which allow admins to add , delete or update user's skills********************************************/

exports.updateSkillForUser = catchAsync(async (req, res, next) => {
  const { error } = user_add_or_update_skill_validator.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const userId = req.params.id;
  const { skillName } = req.body;

  const skillQuery = await client.query(
    `SELECT * FROM skills WHERE name = $1`,
    [skillName]
  );

  const skill = skillQuery.rows[0];

  if (!skill || skill.length === 0) {
    return next(new AppError('Wrong skill name!', 400));
  }

  await client.query(
    `UPDATE users_skills SET skill_id = $1 WHERE user_id = $2`,
    [skill.id, userId]
  );

  res.status(200).json({
    status: 'suucess',
    message: "You have updated user's skill successfully",
  });
});

exports.addSkillForUser = catchAsync(async (req, res, next) => {
  const { error } = user_add_or_update_skill_validator.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const userId = req.params.id;
  const { skillName } = req.body;

  const userSkillQuery = await client.query(
    `SELECT * FROM users_skills WHERE user_id = $1`,
    [userId]
  );

  if (userSkillQuery.rows.length > 0) {
    return next(new AppError('This user already registered a skill', 400));
  }

  const skillQuery = await client.query(`SELECT * FROM skills WHERE name =$1`, [
    skillName,
  ]);
  const skill = skillQuery.rows[0];

  if (!skill || skill.length === 0) {
    return next(new AppError('Wrong skill name!', 400));
  }

  await client.query(
    `INSERT INTO users_skills (user_id, skill_id) VALUES ($1, $2)`,
    [userId, skill.id]
  );

  res.status(200).json({
    status: 'success',
    message: 'A new skill has been added successfully',
  });
}); //

exports.deleteSkillForUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  await client.query(`DELETE FROM users_skills WHERE user_id = $1`, [userId]);

  res.status(200).json({
    status: 'success',
    message: 'Deleted successfully',
  });
});
//**************************Operations which allow users to add a new skill to their profile or updating it************************************** */

exports.userAddSkill = catchAsync(async (req, res, next) => {
  const { error } = user_add_or_update_skill_validator.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }
  const { skillName } = req.body;
  const userId = req.user.id;

  const userQuery = await client.query(
    `SELECT * FROM users_skills WHERE id = $1`,
    [userId]
  );

  if (userQuery.rows.length > 0) {
    return next(new AppError('You have already registered a skill!', 400));
  }

  const skillQuery = await client.query(`SELECT * FROM skills WHERE name =$1`, [
    skillName,
  ]);
  const skill = skillQuery.rows[0];

  if (!skill || skill.length === 0) {
    return next(new AppError('Wrong skill name!', 400));
  }

  await client.query(
    `INSERT INTO users_skills (user_id, skill_id) VALUES ($1, $2)`,
    [userId, skill.id]
  );

  res.status(200).json({
    status: 'success',
    message: 'A new skill has been added successfully',
  });
});

exports.userUpdateSkill = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const userSkillQuery = await client.query(
    `SELECT * FROM users_skills WHERE user_id = $1`,
    [userId]
  );

  const userSkill = userSkillQuery.rows[0];

  if (!userSkill || userSkill.length === 0) {
    return next(
      new AppError('Please add a skill first before updating it!', 400)
    );
  }

  const { error } = user_add_or_update_skill_validator.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }
  const { skillName } = req.body;

  const skillQuery = await client.query(
    `SELECT * FROM skills WHERE name = $1`,
    [skillName]
  );
  const skill = skillQuery.rows[0];

  if (!skill || skill.length === 0) {
    return next(new AppError('Wrong skill name!', 400));
  }

  await client.query(
    `UPDATE users_skills SET skill_id = $1 WHERE user_id = $2`,
    [skill.id, userId]
  );

  res.status(200).json({
    status: 'success',
    message: 'You have updated your skill successfully',
  });
});
