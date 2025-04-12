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

router
  .route('/get-offer/:id')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.getMyOneOffer
  );

router
  .route('/reject-offer/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.rejectOffer
  );

router
  .route('/accept-offer/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.acceptOffer
  );

module.exports = router;
