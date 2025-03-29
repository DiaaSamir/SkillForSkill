const catchAsync = require('express-async-handler');
const Email = require('../../utils/email');
const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');
const AppError = require('../../utils/appError');
