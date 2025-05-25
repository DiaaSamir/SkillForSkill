const client = require('../db');
const AppError = require('./appError');
const catchAsync = require('express-async-handler');

exports.handleCheckIfUserBanned = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const userQuery = await client.query(
    `SELECT is_user_banned FROM users WHERE id = $1`,
    [userId]
  );

  const is_user_banned = userQuery.rows[0].is_user_banned;

  if (is_user_banned) {
    throw new AppError(
      'You are banned. Please wait until your ban period ends before accessing this feature.',
      403
    );
  }

  next();
});
