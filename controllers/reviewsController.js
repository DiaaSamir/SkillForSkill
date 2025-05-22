const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const { make_review } = require('../validators/reviewsSchema');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const client = require('../db');

const checkIfUserHasAlreadyReviewedTheSameUser = async (reviewer, reviewee) => {
  const reviewQuery = await client.query(
    `SELECT 1 FROM reviews WHERE reviewer = $1 AND reviewee = $2`,
    [reviewer, reviewee]
  );

  if (reviewQuery.rows.length > 0) {
    throw new AppError('You have already reviewed this user before!', 400);
  }
};

exports.makeReview = catchAsync(async (req, res, next) => {
  const { error } = make_review.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }
  const reviewer = req.user.id;
  const reviewee = req.params.userId;
  const { rating, review } = req.body;

  await checkIfUserHasAlreadyReviewedTheSameUser(reviewer, reviewee);

  const makeReviewQuery = await client.query(
    `INSERT INTO reviews (reviewer, reviewee, rating, review, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING rating, review`,
    [reviewer, reviewee, rating, review, new Date()]
  );

  if (makeReviewQuery.rows.length === 0) {
    return next(
      new AppError('Error in adding review. please try again later!', 400)
    );
  }

  res.status(201).json({
    status: 'success',
    message: 'You have reviewed this user successfully',
  });
});

exports.getUserReviews = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  const userReviewsQuery = await client.query(
    `
  SELECT
    reviewer.first_name AS reviewer,
    reviewee.first_name AS reviewee,
    reviews.rating,
    reviews.review
  FROM reviews

  JOIN users AS reviewer ON reviews.reviewer = reviewer.id
  JOIN users AS reviewee ON reviews.reviewee = reviewee.id

  WHERE reviewee.id = $1
    `,
    [userId]
  );

  if (userReviewsQuery.rows.length === 0) {
    return next(new AppError('No reviews for this user yet!', 404));
  }

  const userReviews = userReviewsQuery.rows;

  res.status(200).json({
    status: 'success',
    userReviews,
  });
});

exports.getOneUserReview = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;
  const reviewId = req.params.reviewId;

  const userReviewsQuery = await client.query(
    `
  SELECT
    reviewer.first_name AS reviewer,
    reviewee.first_name AS reviewee,
    reviews.rating,
    reviews.review
  FROM reviews

  JOIN users AS reviewer ON reviews.reviewer = reviewer.id
  JOIN users AS reviewee ON reviews.reviewee = reviewee.id

  WHERE reviews.reviewee = $1 AND reviews.id = $2
    `,
    [userId, reviewId]
  );

  if (userReviewsQuery.rows.length === 0) {
    return next(new AppError('No reviews for this user yet!', 404));
  }

  const userReview = userReviewsQuery.rows[0];

  res.status(200).json({
    status: 'success',
    userReview,
  });
});

exports.updateMyReview = catchAsync(async (req, res, next) => {});

//************************************************************************** */

exports.deleteReview = catchAsync(async (req, res, next) => {});
exports.updateReview = catchAsync(async (req, res, next) => {});
