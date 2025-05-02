const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const client = require('../db');

exports.getMyFinishedProjects = catchAsync(async (req, res, next) => {});

exports.getMyOneFinishedProject = catchAsync(async (req, res, next) => {});

exports.submitProjectLink = catchAsync(async (req, res, next) => {});
