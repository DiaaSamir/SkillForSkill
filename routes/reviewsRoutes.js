const express = require('express');
const authController = require('../controllers/authController');
const reviewsController = require('../controllers/reviewsController');

const router = express.Router();

router
  .route('/get-user-reviews/:id')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    reviewsController.getUserReviews
  );

router
  .route('/get-user-reviews/:userId/:reviewId')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    reviewsController.getOneUserReview
  );

router
  .route('/make-review/:userId')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    reviewsController.makeReview
  );
module.exports = router;
