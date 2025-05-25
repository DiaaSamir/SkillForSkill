const express = require('express');
const authController = require('../controllers/authController');
const offersController = require('../controllers/offersController');
const checkIfUserBanned = require('../utils/checkIfUserBanned');

const router = express.Router();

// Apply protect and restrictTo('User', 'Admin') to all routes by default
router.use(
  authController.protect,
  checkIfUserBanned.handleCheckIfUserBanned,
  authController.restrictTo('User', 'Admin')
);

router.route('/get-my-offers').get(offersController.getMyOffers);

router.route('/c/recieved').get(offersController.getMyCounterOffers);

router
  .route('/c/sent/all-counter-offers')
  .get(offersController.getMySentCounterOffers);

router.route('/get-offer/:id').get(offersController.getMyOneOffer);

router.route('/reject-offer/:id').post(offersController.rejectOffer);

router.route('/accept-offer/:id').post(offersController.acceptOffer);

router.route('/counter-offer/:id').post(offersController.counterOffer);

router.route('/c/accept/:id').post(offersController.acceptCounterOffer);

router.route('/c/reject/:id').post(offersController.rejectCounterOffer);

router.route('/c/recieved/:id').get(offersController.getMyOneCounterOffer);

router.route('/c/update/:id').patch(offersController.updateMySentCounterOffer);

router.route('/c/delete/:id').delete(offersController.deleteMySentCounterOffer);

router.route('/c/sent/:id').get(offersController.getMyOneSentCounterOffer);

router.route('/make-offer/:id').post(offersController.makeOffer);

router.route('/update-my-offer/:id').patch(offersController.updateMySentOffer);

// Admin-only routes
router.use('/c/a', authController.restrictTo('Admin'));

router.route('/c/a').get(offersController.getAllCounterOffersForAdmin);

router.route('/c/a/:id').get(offersController.getOneCounterOfferForAdmin);

router
  .route('/c/a/update/:id')
  .patch(offersController.updateOneCounterOfferForAdmin);

router
  .route('/c/a/delete/:id')
  .delete(offersController.deleteOneCounterOfferForAdmin);

module.exports = router;
