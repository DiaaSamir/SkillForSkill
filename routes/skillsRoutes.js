const express = require('express');
const skillsController = require('../controllers/skillsController');
const authController = require('../controllers/authController');
const router = express.Router();

router
  .route('/')
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    skillsController.getAllSkills
  )
  .post(
    authController.protect,
    authController.restrictTo('Admin'),
    skillsController.createSkill
  );

router
  .route('/register-skill')
  .post(
    authController.protect,
    authController.restrictTo('Admin', 'User'),
    skillsController.userAddSkill
  );

router
  .route('/update-my-skill')
  .patch(
    authController.protect,
    authController.restrictTo('User', 'Admin'),
    skillsController.userUpdateSkill
  );

router
  .route('/user-skills/:id')
  .patch(
    authController.protect,
    authController.restrictTo('Admin'),
    skillsController.updateSkillForUser
  )
  .post(
    authController.protect,
    authController.restrictTo('Admin'),
    skillsController.addSkillForUser
  )
  .delete(
    authController.protect,
    authController.restrictTo('Admin'),
    skillsController.deleteSkillForUser
  );

router
  .route('/:id')
  .patch(
    authController.protect,
    authController.restrictTo('Admin'),
    skillsController.updateSkill
  )
  .delete(
    authController.protect,
    authController.restrictTo('Admin'),
    skillsController.deleteSkill
  )
  .get(
    authController.protect,
    authController.restrictTo('Admin'),
    skillsController.getSkill
  );

module.exports = router;
