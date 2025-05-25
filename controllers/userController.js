const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const client = require('../db');
const factory = require('../controllers/handlerFactory');
const { hashCode } = require('../utils/Auths/hashingAndReturningCodes');
const { compareCode } = require('../utils/Auths/compareHashedCodes');
const { hashPassword } = require('../utils/Auths/hashPasswords');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const {
  compareHashedPasswords,
} = require('../utils/Auths/compareHashedPasswords');
const {
  email_reset_verification_request,
  email_reset_verification,
} = require('../validators/emailVerifySchema');
const {
  update_password_schema,
  update_first_and_last_name,
} = require('../validators/userSchema');
const Email = require('../utils/email');

//********************************************************************************* */
exports.getAllUsers = factory.getAll('users');

exports.getOneUser = factory.getOne('users');

exports.deleteUser = factory.deleteOne('users');

exports.updateUser = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.password_confirm) {
    return next(
      new AppError("You can't update users' passwords in this route:(", 400)
    );
  }

  const userId = req.params.id;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No fields provided for update', 400));
  }

  // Build the dynamic query
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${index}`);
    values.push(value);
    index++;
  }

  values.push(userId);
  const query = `
    UPDATE users 
    SET ${fields.join(', ')}
    WHERE id = $${index} 
    RETURNING id, first_name, last_name, email, role
  `;

  const userQuery = await client.query(query, values);

  if (userQuery.rowCount === 0) {
    return next(new AppError('User not found or no changes made', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    user: userQuery.rows[0],
  });
});

//******************************************************************************** */
exports.updateMyEmailRequest = catchAsync(async (req, res, next) => {
  const { error } = email_reset_verification_request.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const userId = req.user.id;

  const userQuery = await client.query(`SELECT * FROM users WHERE id= $1`, [
    userId,
  ]);

  const user = userQuery.rows[0];

  if (!user) {
    return next(
      new AppError('Error in retrieving user, please try again later', 400)
    );
  }

  const { newEmail } = req.body;

  if (newEmail === user.email) {
    return next(
      new AppError('New email cannot be the same as current email!', 400)
    );
  }

  const isEmailAlreadyExistsQuery = await client.query(
    `SELECT * FROM users WHERE email = $1`,
    [newEmail]
  );

  const isEmailAlreadyExists = isEmailAlreadyExistsQuery.rows;

  if (isEmailAlreadyExists.length > 0) {
    return next(new AppError('Email already in use!', 400));
  }

  const { code, hashedCode, codeExpires } = hashCode();

  await client.query(
    `UPDATE users SET  email_reset_verification_code = $1, email_reset_verification_code_expires = $2, new_email = $3 WHERE id = $4`,
    [hashedCode, codeExpires, newEmail, userId]
  );

  await new Email(
    { first_name: user.first_name, email: newEmail },
    null,
    null,
    code
  ).sendEmailResetVerificationCode();

  res.status(200).json({
    status: 'success',
    message: 'An email has benn sent with the verification code',
  });
});

exports.updateMyEmail = catchAsync(async (req, res, next) => {
  const { error } = email_reset_verification.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const userId = req.user.id;

  const userQuery = await client.query(`SELECT * FROM users WHERE id = $1 `, [
    userId,
  ]);

  const user = userQuery.rows[0];

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (
    !user.email_reset_verification_code_expires ||
    user.email_reset_verification_code_expires < new Date()
  ) {
    return next(new AppError('Reset code is invalid or expired', 400));
  }

  const { code } = req.body;

  const isCodeCorrect = compareCode(code, user.email_reset_verification_code);

  if (!isCodeCorrect) {
    return next(new AppError('Reset code is invalid or expired!', 400));
  }

  await client.query(
    `UPDATE users SET email = $1, new_email = $2, email_reset_verification_code = $3, email_reset_verification_code_expires = $4 WHERE id = $5`,
    [user.new_email, null, null, null, userId]
  );

  res.status(200).json({
    status: 'success',
    message: 'You have updated you email successfully! ',
  });
});

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  const { error } = update_password_schema.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const userId = req.user.id;

  const userQuery = await client.query(`SELECT * FROM users WHERE id = $1`, [
    userId,
  ]);

  const user = userQuery.rows[0];

  if (!user) {
    return next(new AppError('User not found', 404));
  }
  const { oldPassword, newPassword } = req.body;

  const isOldPasswordCorrect = await compareHashedPasswords(
    oldPassword,
    user.password
  );

  if (!isOldPasswordCorrect) {
    return next(
      new AppError(
        "Incorrect old password. If you’ve forgotten your password, you can reset it using the 'Forgot Password' option",
        400
      )
    );
  }

  const hashedPassword = await hashPassword(newPassword);

  await client.query(`UPDATE users SET password =$1 WHERE id = $2`, [
    hashedPassword,
    userId,
  ]);

  res.status(200).json({
    status: 'success',
    message: 'You have updated your password successfully',
  });
});

exports.updateMyFirstAndLastName = catchAsync(async (req, res, next) => {
  const { error } = update_first_and_last_name.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
  }

  const userId = req.user.id;

  const userQuery = await client.query(`SELECT * FROM users WHERE id = $1 `, [
    userId,
  ]);

  const user = userQuery.rows[0];

  if (!user) {
    return next(new AppError('User not found', 400));
  }

  const { first_name, last_name } = req.body;

  const updateUserQuery = await client.query(
    `UPDATE users SET first_name =$1, last_name = $2 WHERE id = $3 RETURNING first_name, last_name`,
    [first_name, last_name, userId]
  );

  const updatedUser = updateUserQuery.rows[0];

  res.status(200).json({
    status: 'success',
    message: 'You have updated your first and last name successfully',
    updatedUser,
  });
});
