const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const client = require('../db');

exports.getOne = (tableName) =>
  catchAsync(async (req, res, next) => {
    const id = req.params.id;

    const getOneQuery = await client.query(
      `SELECT * FROM ${tableName} WHERE id = $1 `,
      [id]
    );

    const getOne = getOneQuery.rows[0];

    if (!getOne || getOne.length === 0) {
      return next(new AppError(`No ${tableName} found!`, 404));
    }

    res.status(200).json({
      status: 'success',
      getOne,
    });
  });

exports.getAll = (tableName) =>
  catchAsync(async (req, res, next) => {
    const getAllQuery = await client.query(`SELECT * FROM ${tableName}`);

    const getAll = getAllQuery.rows;

    if (!getAll || getAll.length === 0) {
      return next(new AppError(`No ${tableName} found!`, 404));
    }

    res.status(200).json({
      status: 'success',
      getAll,
    });
  });

exports.deleteOne = (tableName) =>
  catchAsync(async (req, res, next) => {
    const id = req.params.id;

    await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);

    res.status(200).json({
      status: 'success',
      message: 'Deleted successfully',
    });
  });
