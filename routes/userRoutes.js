const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();
router
  .route('/update-my-first-and-last-name')
  .patch(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    userController.updateMyFirstAndLastName
  );
router
  .route('/update-my-email-request')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    userController.updateMyEmailRequest
  );

router
  .route('/update-my-email')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    userController.updateMyEmail
  );

router
  .route('/update-my-password')
  .patch(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    userController.updateMyPassword
  );

router
  .route('/')
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    userController.getAllUsers
  );

router
  .route('/:id')
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    userController.getOneUser
  );

router
  .route('/:id')
  .patch(
    authController.protect,
    authController.restrictTo('Admin'),
    userController.updateUser
  );
router
  .route('/:id')
  .delete(
    authController.protect,
    authController.restrictTo('Admin'),
    userController.deleteUser
  );

module.exports = router;
