const client = require('../db');
const AppError = require('./appError');

const checkIfUserVerified = async (userId) => {
  const userQuery = await client.query(
    `SELECT id, is_email_verified FROM users WHERE id= $1`,
    [userId]
  );
  const user = userQuery.rows[0];

  return user.is_email_verified === false;
};

exports.isUserVerified = async (userId, next) => {
  const isUserVerified = await checkIfUserVerified(userId);

  if (isUserVerified) {
    return next(
      new AppError(
        'Your email is not verified, you have to verify your email to procceed!',
        400
      )
    );
  }
};
