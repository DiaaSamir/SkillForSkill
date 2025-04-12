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

// Route to test the chat functionality by rendering the chat page
router.route('/test-chat').get(authController.protect, (req, res) => {
  // In real use, you might retrieve these from a database or business logic.
  // For example:
  const offerId = '8';
  const senderId = '6';
  const receiverId = '1';
  // userId is coming from the authenticated user (req.user)
  res.render('chatOfferTest', {
    offerId,
    senderId,
    receiverId,
    userId: req.user.id,
  });
});
module.exports = router;
