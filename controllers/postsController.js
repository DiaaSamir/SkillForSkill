const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const { create_post } = require('../validators/postsSchema');
const checkIfUserVerified = require('../utils/checkIfUserVerified');
const client = require('../db');

exports.createPost = catchAsync(async (req, res, next) => {
  const { error } = create_post.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const userId = req.user.id;

  const isUserVerified = await checkIfUserVerified.checkIfUserVerified(userId);

  if (isUserVerified) {
    return next(
      new AppError(
        'Your email is not verified, you have to verify your email to procceed!',
        400
      )
    );
  }

  const { skillName, required_SkillName, description, title } = req.body;

  //Query to return an array of results which contain both names provided in req.body
  const skillsQuery = await client.query(
    `SELECT * FROM skills WHERE name IN ($1, $2)`,
    [skillName, required_SkillName]
  );

  const skills = skillsQuery.rows;

  // Find each skill directly by name
  const skill = skills.find((skill) => skill.name === skillName);

  const requiredSkill = skills.find(
    (skill) => skill.name === required_SkillName
  );
  console.log(skill, requiredSkill);
  // Handle if any skill is missing
  if (!skill || !requiredSkill) {
    return next(new AppError('Invalid skill(s) provided!', 400));
  }

  const skillId = skill.id;
  const requiredSkillId = requiredSkill.id;

  await client.query(
    `INSERT INTO POSTS (user_id, skill_id, required_skill_id, description, created_at, title) VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, skillId, requiredSkillId, description, new Date(), title]
  );

  res.status(200).json({
    status: 'success',
    message: `Your post has been created successfully! You're offering '${skillName}' in exchange for '${required_SkillName}'. Good luck finding a match!`,
  });
});
