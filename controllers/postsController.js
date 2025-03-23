const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const {
  create_post,
  delete_post,
  update_post,
  get_posts_with_specific_skills,
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

//***************************************OPERATIONS FOR USERS******************************************************** */
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
    return;
  }

  await checkIfUserVerified.isUserVerified(userId, next);

  const { required_SkillName, description, title } = req.body;

  const userQuery = await client.query(
    `SELECT id, skill_id FROM users WHERE id = $1`,
    [userId]
  );

  const user = userQuery.rows[0];

  const skillQuery = await client.query(
    `SELECT id FROM skills WHERE name = $1`,
    [required_SkillName]
  );

  const requiredSkill = skillQuery.rows[0];

  await client.query(
    `INSERT INTO posts (user_id, skill_id, required_skill_id, description, created_at, title) VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, user.skill_id, requiredSkill.id, description, new Date(), title]
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

  await checkIfUserVerified.isUserVerified(userId, next);

  const postId = req.params.id;
  const postQuery = await client.query(
    `SELECT 
      posts.description,
      posts.title,
      posts.created_at,
      users.first_name,
      users.last_name,
      user_skill.name AS user_skill,
      required_skill.name AS required_skill
    FROM posts 
    JOIN skills AS user_skills ON posts.skill_id = user_skill.id 
    JOIN skills AS required_skills ON posts.required_skill_id = required_skill.id
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

exports.getAllMyPosts = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  await checkIfUserVerified.isUserVerified(userId, next);

  const postsQuery = await client.query(
    `SELECT 
    posts.description,
    posts.title,
    posts.created_at,
    users.first_name,
    users.last_name,
    user_skill.name AS user_skill,
    required_skill.name AS required_skill
  FROM posts 
  JOIN skills AS user_skill ON posts.skill_id = user_skill.id 
  JOIN skills AS required_skill ON posts.required_skill_id = required_skill.id
  JOIN users ON posts.user_id = users.id 
  WHERE posts.user_id = $1`,
    [userId]
  );

  if (postsQuery.rows.length === 0) {
    return next(new AppError('No posts yet!', 404));
  }

  const posts = postsQuery.rows;

  res.status(200).json({
    status: 'success',
    posts,
  });
});

exports.getOnePost = catchAsync(async (req, res, next) => {
  const postId = req.params.id;

  const postQuery = await client.query(
    `
    SELECT
      posts.description,
      posts.title,
      posts.created_at,
      users.first_name,
      users.last_name,
      user_skill.name AS user_skill,
      required_skill.name AS required_skill
    FROM posts
    JOIN skills AS user_skill ON posts.skill_id = user_skill.id
    JOIN skills AS required_skill ON posts.required_skill_id = required_skill.id
    JOIN users ON posts.user_id = users.id
    WHERE posts.id = $1
    `,
    [postId]
  );

  if (postQuery.rows.length === 0) {
    return next(new AppError('No posts found!', 404));
  }

  const post = postQuery.rows[0];

  res.status(200).json({
    status: 'success',
    post,
  });
});

exports.getAllPosts = catchAsync(async (req, res, next) => {
  const postsQuery = await client.query(
    `
    SELECT
      posts.description,
      posts.title,
      posts.created_at,
      users.first_name,
      users.last_name,
      user_skill.name AS user_skill,
      required_skill.name AS required_skill
    FROM posts
    JOIN skills AS user_skill ON posts.skill_id = user_skill.id
    JOIN skills AS required_skill ON posts.required_skill_id = required_skill.id
    JOIN users ON posts.user_id = users.id
    WHERE posts.available = $1
    `,
    [true]
  );

  if (postsQuery.rows.length === 0) {
    return next(new AppError('No posts yet!', 404));
  }

  const posts = postsQuery.rows;

  res.status(200).json({
    status: 'success',
    posts,
  });
});

//This is used when  a user is searching for posts with related skills (skills he can offer and skills he wants)
exports.getPostsWithSpecificSkills = catchAsync(async (req, res, next) => {
  const { error } = get_posts_with_specific_skills.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const userId = req.user.id;

  await checkIfUserVerified.isUserVerified(userId, next);

  const userQuery = await client.query(
    `
    SELECT
      *
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  const user = userQuery.rows[0];

  const { required_SkillName } = req.body;

  const skillQuery = await client.query(
    `SELECT * FROM skills WHERE name = $1`,
    [required_SkillName]
  );

  const skill = skillQuery.rows[0];

  const postsQuery = await client.query(
    `
      SELECT
        posts.skill_id,
        posts.required_skill_id,
        posts.description,
        posts.title,
        posts.created_at,
        users.first_name AS user_first_name,
        users.last_name AS user_last_name,
        user_skill.name AS user_skill,
        required_skill.name AS required_skill
        FROM posts

        JOIN users ON posts.user_id = users.id
        JOIN skills AS user_skill ON posts.skill_id = user_skill.id
        JOIN skills AS required_skill ON posts.required_skill_id = required_skill.id

        WHERE posts.skill_id = $1 AND posts.required_skill_id = $2
    
    `,
    [skill.id, user.skill_id]
  );

  if (postsQuery.rows.length === 0) {
    return next(new AppError('No posts found', 404));
  }

  const posts = postsQuery.rows;

  res.status(200).json({
    status: 'success',
    posts,
  });
});
