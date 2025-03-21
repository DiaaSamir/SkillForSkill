const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const { promisify } = require('util');
const {
  user_login_schema,
  user_signup_scehma,
  reset_password_schema,
  forgot_password_schema,
} = require('../validators/userSchema');
const {
  email_signup_verification,
} = require('../validators/emailVerifySchema');
const client = require('../db');
const Email = require('../utils/email');
const { hashCode } = require('../utils/hashingAndReturningCodes');
const { compareCode } = require('../utils/compareHashedCodes');
const { hashPassword } = require('../utils/hashPasswords');
const { compareHashedPasswords } = require('../utils/compareHashedPasswords');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

//****************************************************************************************************************** */

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

//******************************************************************************************************************* */

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError(
        'You are not logged in, please log in to process your request!',
        400
      )
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  console.log(decoded.id);
  const userQuery = await client.query(`SELECT * FROM users WHERE id = $1`, [
    decoded.id,
  ]);

  const user = userQuery.rows[0];

  if (!user || user.length === 0) {
    return next(
      new AppError('The user belongs to this token is no longer available', 400)
    );
  }

  req.user = user;
  next();
});

exports.signup = catchAsync(async (req, res, next) => {
  const { error } = user_signup_scehma.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const { first_name, last_name, email, password, password_confirm } = req.body;

  if (password !== password_confirm) {
    return next(new AppError('Passwords are not the same', 400));
  }
  const hashedPassword = await hashPassword(password);

  const newUser = await client.query(
    `INSERT INTO users (first_name, last_name, email, password, created_at, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING first_name, last_name, email, created_at`,
    [first_name, last_name, email, hashedPassword, new Date(), 'User']
  );

  const user = newUser.rows[0];

  createSendToken(user, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { error } = user_login_schema.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const { email, password } = req.body;

  const userLogInQuery = await client.query(
    `SELECT * FROM users WHERE email = $1 `,
    [email]
  );

  const user = userLogInQuery.rows[0];

  if (!user) {
    return next(new AppError('Incrrect credentials, try again later!', 400));
  }

  const userRealPassword = user.password;

  const isPasswordCorrect = await compareHashedPasswords(
    password,
    userRealPassword
  );

  if (!isPasswordCorrect) {
    return next(new AppError('Incorrect credentials', 400));
  }

  // Extract only required fields (exclude password)
  const userResponse = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    created_at: user.created_at,
  };

  createSendToken(userResponse, 201, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { error } = forgot_password_schema.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const { email } = req.body;

  const userQuery = await client.query(`SELECT * FROM users WHERE email = $1`, [
    email,
  ]);

  const user = userQuery.rows[0];

  if (!user) {
    return res.status(200).json({
      status: 'success',
      message: 'Check your email for the reset code!',
    });
  }

  //Generate random 6-digit code
  const { code, hashedCode, codeExpires } = hashCode();

  await new Email(user, code, codeExpires).sendPasswordReset();

  await client.query(
    `UPDATE users SET reset_password_code = $1, reset_password_expires = $2 WHERE email = $3`,
    [hashedCode, codeExpires, email]
  );

  res.status(200).json({
    status: 'success',
    message: 'Check your email for the reset code!',
  });
});

//****
// newPassword
// newPasswordConfrim
// resetCode
//email
//  */
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { error } = reset_password_schema.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const { resetCode, newPassword, email } = req.body;

  const userQuery = await client.query(
    `SELECT * FROM users WHERE email = $1 AND reset_password_expires > NOW()`,
    [email]
  );

  const user = userQuery.rows[0];

  if (!user) {
    return next(new AppError('Invalid or expired reset code', 400));
  }

  const isResetCodeCorrect = compareCode(resetCode, user.reset_password_code);

  if (!isResetCodeCorrect) {
    return next(new AppError('Invalid code provided', 400));
  }

  const hashedPassword = await hashPassword(newPassword);
  await client.query(
    `UPDATE users SET password = $1, reset_password_code = $2, reset_password_expires = $3 WHERE email = $4`,
    [hashedPassword, null, null, email]
  );

  res.status(200).json({
    status: 'success',
    message: 'Password has been reset successfully',
  });
});

exports.verifyEmailRequest = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const userQuery = await client.query(`SELECT * FROM users WHERE id = $1`, [
    userId,
  ]);

  const user = userQuery.rows[0];

  if (!user) {
    return next(new AppError('There was a problem retrieving the user', 400));
  }

  if (user.is_email_verified === true) {
    return next(new AppError('Your email is already verified', 400));
  }

  const { code, hashedCode, codeExpires } = hashCode();

  await new Email(user, null, null, code).sendEmailVerificationCode();

  await client.query(
    `UPDATE users SET verification_code_email = $1, email_verification_code_expires = $2 WHERE id = $3`,
    [hashedCode, codeExpires, userId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Verification code has been sent to your email!',
  });
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const userQuery = await client.query(`SELECT * FROM users WHERE id =$1 `, [
    userId,
  ]);

  const user = userQuery.rows[0];

  if (!user) {
    return next(new AppError('User not found!', 404));
  }

  if (user.is_email_verified === true) {
    return next(new AppError('Your email is already verified', 400));
  }

  if (
    !user.email_verification_code_expires ||
    user.email_verification_code_expires < new Date()
  ) {
    return next(new AppError('Verification code is invalid or expired', 400));
  }

  const { error } = email_signup_verification.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const { email_verification_code } = req.body;

  const isVerificationCodeCorrect = compareCode(
    email_verification_code,
    user.email_verification_code
  );

  if (!isVerificationCodeCorrect) {
    return next(new AppError('Verification code is invalid or expired', 400));
  }

  await client.query(
    `UPDATE users SET verification_code_email = $1, email_verification_code_expires = $2, is_email_verified= $3 WHERE id =$4`,
    [null, null, true, userId]
  );

  res.status(200).json({
    status: 'success',
    message: 'You have verified your email successfully!',
  });
});

exports.emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each user to 3 requests per hour
  message: {
    status: 'fail',
    message: 'Too many verification requests. Try again after 1 hour.',
  },
  keyGenerator: (req) => req.user.id, // Track limits using user ID
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable legacy X-RateLimit headers
});
