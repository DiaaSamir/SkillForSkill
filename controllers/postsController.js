const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const {
  create_post,
  delete_post,
  update_post,
} = require('../validators/postsSchema');
const checkIfUserVerified = require('../utils/checkIfUserVerified');
const client = require('../db');

//********************************************************************************************* */

const checkIfTheUserPostedBefore = async (userId) => {
  const userQuery = await client.query(
    `SELECT did_the_user_post FROM users WHERE id = $1`,
    [userId]
  );

  const user = userQuery.rows[0];

  return user.did_the_user_post === true;
};

//*********************************************************************************************** */
exports.createPost = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const userPostedBefore = await checkIfTheUserPostedBefore(userId);

  if (userPostedBefore) {
    return next(
      new AppError(
        'You have already posted, you should either delete the previous post or wait for an offer!',
        400
      )
    );
  }
  const { error } = create_post.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

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

  await client.query(`UPDATE users SET did_the_user_post =$1 WHERE id = $2`, [
    true,
    userId,
  ]);

  res.status(200).json({
    status: 'success',
    message: `Your post has been created successfully! You're offering '${skillName}' in exchange for '${required_SkillName}'. Good luck finding a match!`,
  });
});

exports.deleteMyPost = catchAsync(async (req, res, next) => {
  const { error } = delete_post.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }
  const postId = req.params.id;
  const userId = req.user.id;

  const postQuery = await client.query(`SELECT id FROM posts WHERE id = $1`, [
    postId,
  ]);

  const post = postQuery.rows[0];

  if (!post || post.length === 0) {
    return next(new AppError('No post found!', 404));
  }

  await client.query(`DELETE FROM posts WHERE id = $1 AND user_id = $2`, [
    postId,
    userId,
  ]);

  await client.query(`UPDATE users SET did_the_user_post = $1 WHERE id = $2`, [
    false,
    userId,
  ]);

  res.status(200).json({
    status: 'success',
    message: 'You have deleted your post successfully!',
  });
});

exports.updateMyPost = catchAsync(async (req, res, next) => {
  const postId = req.params.id;
  const userId = req.user.id;

  // Check if the post exists
  const postQuery = await client.query(
    `SELECT id FROM POSTS WHERE id = $1 AND user_id = $2`,
    [postId, userId]
  );

  if (postQuery.rows.length === 0) {
    return next(new AppError('No posts found!', 404));
  }

  // Validate the input
  const { error } = update_post.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  let { required_SkillName, description, title } = req.body;

  // If required_SkillName is provided, validate it
  if (required_SkillName) {
    const skillQuery = await client.query(
      `SELECT id, name FROM skills WHERE name = $1`,
      [required_SkillName]
    );

    if (skillQuery.rows.length === 0) {
      return next(new AppError('No skill found!', 400));
    }

    skillId = skillQuery.rows[0].id;
  }

  // Use COALESCE to keep existing values if no new value is provided
  await client.query(
    `UPDATE posts 
     SET required_skill_id = COALESCE($1, required_skill_id), 
         description = COALESCE($2, description), 
         title = COALESCE($3, title) 
     WHERE id = $4 AND user_id = $5`,
    [skillId, description || null, title || null, postId, userId]
  );

  res.status(200).json({
    status: 'success',
    message: 'You have updated your post successfully',
  });
});

exports.getMypost = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const postId = req.params.id;
  const postQuery = await client.query(
    `SELECT 
      posts.description,
      posts.title,
      posts.created_at,
      users.first_name,
      users.last_name,
      user_skills.name AS user_skill,
      required_skills.name AS required_skill
    FROM posts 
    JOIN skills AS user_skills ON posts.skill_id = user_skills.id 
    JOIN skills AS required_skills ON posts.required_skill_id = required_skills.id
    JOIN users ON posts.user_id = users.id 
    WHERE posts.user_id = $1 AND posts.id = $2`,
    [userId, postId]
  );

  if (postQuery.rows.length === 0) {
    return next(new AppError('No posts yet!', 404));
  }

  const post = postQuery.rows[0];

  res.status(200).json({
    status: 'success',
    post,
  });
});
