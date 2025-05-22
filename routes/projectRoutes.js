const express = require('express');
const authController = require('../controllers/authController');
const projectsController = require('../controllers/projectsController');

const router = express.Router();

router
  .route('/my-finshed-projects')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    projectsController.getMyFinishedProjects
  );

router
  .route('my-finished-project/:id')
  .get(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    projectsController.getMyOneFinishedProject
  );

router
  .route('/submit-project-link/:id')
  .post(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    projectsController.submitProjectLink
  );

module.exports = router;
