const express = require('express');
const authController = require('../controllers/authController');
const postsController = require('../controllers/postsController');

const router = express.Router();

router
  .route('/add-post')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    postsController.createPost
  );

module.exports = router;
