const express = require('express');
const authController = require('../controllers/authController');
const chatController = require('../controllers/chatController');

const router = express.Router();

// Route to send a message in a specific offer's chat room
router
  .route('/send-message/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    chatController.sendMessage
  );

router
  .route('/get-offer-messages/:id')
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    chatController.getChatOfAnOffer
  );
module.exports = router;
