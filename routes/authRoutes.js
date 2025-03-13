const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.route('/sign-up').post(authController.signup);
router.route('/log-in').post(authController.login);
router.route('/forgot-password').post(authController.forgotPassword);
router.route('/reset-password').patch(authController.resetPassword);
router
  .route('/verify-email-request')
  .post(
    authController.protect,
    authController.emailVerificationLimiter,
    authController.verifyEmailRequest
  );
router
  .route('/verify-email')
  .post(authController.protect, authController.verifyEmail);
module.exports = router;
