const client = require('../db');
const AppError = require('../utils/appError');
const catchAsync = require('express-async-handler');

exports.handleUserPenalty = async (userId) => {
  const userWarningQuery = await client.query(
    `SELECT warning_counter FROM users WHERE id = $1`,
    [userId]
  );
  if (userWarningQuery.rows.length === 0) {
    throw new AppError('No users found!', 404);
  }

  const warnings = userWarningQuery.rows[0].warning_counter || 0;

  if (warnings < 2) {
    await client.query(
      `UPDATE users SET warning_counter = COALESCE(warning_counter, 0) + 1 WHERE id = $1`,
      [userId]
    );
  } else {
    const bannedTill = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await client.query(
      `UPDATE users SET is_user_banned = $1, banned_till = $2, warning_counter = 0 WHERE id = $3`,
      [true, bannedTill, userId]
    );
  }
};

exports.payToRemoveSystemNegativeReviews = catchAsync(
  async (req, res, next) => {}
);
