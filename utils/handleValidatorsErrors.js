const AppError = require('./appError');
const handleValidatorsErrors = (error, next) => {
  if (error) {

    return next(
      new AppError(error.details.map((err) => err.message).join(', '), 400)
    );
  }
};

module.exports = { handleValidatorsErrors };
