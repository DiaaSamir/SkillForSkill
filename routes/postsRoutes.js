const express = require('express');
const authController = require('../controllers/authController');
const postsController = require('../controllers/postsController');

const router = express.Router();

router
  .route('/search-for-specific-skill')
  .post(
    authController.protect,
    authController.restrictTo('Admin', 'User'),
    postsController.getPostsWithSpecificSkills
  );
router
  .route('/')
  .get(
    authController.protect,
    authController.restrictTo('Admin', 'User'),
    postsController.getAllPosts
  );

router
  .route('/my-posts')
  .get(
    authController.protect,
    authController.restrictTo('Admin', 'User'),
    postsController.getAllMyPosts
  );

router
  .route('/add-post')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    postsController.createPost
  );

router
  .route('/my-post/:id')
  .get(
    authController.protect,
    authController.restrictTo('Admin', 'User'),
    postsController.getMypost
  );

router
  .route('/delete-my-post/:id')
  .delete(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    postsController.deleteMyPost
  );

router
  .route('/update-my-post/:id')
  .patch(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    postsController.updateMyPost
  );

router
  .route('/:id')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    postsController.getOnePost
  );

module.exports = router;
