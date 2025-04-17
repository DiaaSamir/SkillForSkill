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

router
  .route('/counter-offer/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.counterOffer
  );

router
  .route('/c/accept/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.acceptCounterOffer
  );

router
  .route('/c/reject/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.rejectCounterOffer
  );

router
  .route('/c')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.getMyCounterOffers
  );

router
  .route('/c/:id')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.getMyOneCounterOffer
  );

router
  .route('/c/update/:id')
  .patch(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.updateMyCounterOffer
  );

module.exports = router;
