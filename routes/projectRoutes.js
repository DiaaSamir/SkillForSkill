const express = require('express');
const authController = require('../controllers/authController');
const projectsController = require('../controllers/projectsController');

const router = express.Router();

router
  .route('/submit-project-link/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    projectsController.submitProjectLink
  );

module.exports = router;
