const express = require('express');
const authController = require('../controllers/authController');
const postsController = require('../controllers/postsController');
const checkIfUserBanned = require('../utils/checkIfUserBanned');

const router = express.Router();

// Apply protect, checkIfUserBanned, and restrictTo('Admin', 'User') to all routes by default
router.use(
  authController.protect,
  checkIfUserBanned.handleCheckIfUserBanned,
  authController.restrictTo('Admin', 'User')
);

router
  .route('/search-for-specific-skill')
  .post(postsController.getPostsWithSpecificSkills);

router.route('/').get(postsController.getAllPosts);

router.route('/my-posts').get(postsController.getAllMyPosts);

router.route('/add-post').post(postsController.createPost);

router.route('/my-post/:id').get(postsController.getMypost);

router.route('/delete-my-post/:id').delete(postsController.deleteMyPost);

router.route('/update-my-post/:id').patch(postsController.updateMyPost);

router.route('/:id').get(postsController.getOnePost);

module.exports = router;
