const express = require('express');
const authController = require('../controllers/authController');
const offersController = require('../controllers/offersController');

const router = express.Router();

router
  .route('/get-my-offers')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.getMyOffers
  );

router
  .route('/c/recieved')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.getMyCounterOffers
  );

router
  .route('/c/a')
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    offersController.getAllCounterOffersForAdmin
  );

router
  .route('/c/sent/all-counter-offers')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.getMySentCounterOffers
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
  .route('/c/recieved/:id')
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
    offersController.updateMySentCounterOffer
  );

router
  .route('/c/delete/:id')
  .delete(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.deleteMySentCounterOffer
  );

router
  .route('/c/sent/:id')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.getMyOneSentCounterOffer
  );

router
  .route('/c/a/:id')
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    offersController.getOneCounterOfferForAdmin
  );

router
  .route('/c/a/update/:id')
  .patch(
    authController.protect,
    authController.restrictTo('Admin'),
    offersController.updateOneCounterOfferForAdmin
  );

router
  .route('/c/a/delete/:id')
  .delete(
    authController.protect,
    authController.restrictTo('Admin'),
    offersController.deleteOneCounterOfferForAdmin
  );

router
  .route('/make-offer/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.makeOffer
  );

router
  .route('/update-my-offer/:id')
  .patch(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    offersController.updateMySentOffer
  );

module.exports = router;
