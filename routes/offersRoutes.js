const express = require('express');
const authController = require('../controllers/authController');
const offersController = require('../controllers/offersController');

const router = express.Router();

router
  .route('/make-offer/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.makeOffer
  );

router
  .route('/get-my-offers')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.getMyOffers
  );

module.exports = router;
