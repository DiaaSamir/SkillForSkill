/* eslint-disable no-unused-vars */
const AppError = require('../utils/appError');

const handleErrors = (err) => {
  let message = err.message;

  if (err.name === 'CastError') {
    message = `Invalid ${err.path}: ${err.value}.`;
  } else if (err.name === 'ValidationError') {
    message = `Invalid input: ${Object.values(err.errors)
      .map((e) => e.message)
      .join(', ')}`;
  } else if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please log in again!';
  } else if (err.name === 'TokenExpiredError') {
    message = 'Your token has expired! Please log in again.';
  } else if (err.message.includes(' is not allowed')) {
    message = 'You have entered a field that is not allowed in this page';
  } else if (err.code === '23505') {
    // **PostgreSQL duplicate key error**
    if (err.constraint === 'users_email_key') {
      message = 'Email already exists. Please use a different email!';
    } else {
      message = 'Duplicate entry detected!';
    }
  }else if(err.name)

  return new AppError(message, err.statusCode || 500);
};

// Global Error Middleware
const globalErrorHandler = (err, req, res, next) => {
  const error = handleErrors(err);

  if (process.env.NODE_ENV === 'development') {
    // **Detailed error for debugging**
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
      error, // Full error object
      stack: err.stack, // Stack trace for debugging
    });
  }

  // **Production mode (cleaner response)**
  return res.status(error.statusCode).json({
    status: 'error',
    message: error.message, // Only show message, no stack trace
  });
};

module.exports = globalErrorHandler;
