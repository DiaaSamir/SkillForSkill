const express = require('express');
const authController = require('../controllers/authController');
const ticketsController = require('../controllers/ticketsController');

const router = express.Router();

router
  .route('/open-tickets')
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    ticketsController.getAllOpenTickets
  );

router
  .route('/all-tickets')
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    ticketsController.getAllTickets
  );

router
  .route('/open-ticket/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    ticketsController.openTicket
  );

router
  .route('/:id')
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    ticketsController.getOneTicket
  );

router
  .route('/close/:id')
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    ticketsController.closeTicket
  );

router
  .route('/delete/:id')
  .delete(
    authController.protect,
    authController.restrictTo('Admin'),
    ticketsController.deleteTicket
  );
module.exports = router;
