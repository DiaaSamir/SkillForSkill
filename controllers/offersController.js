const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const client = require('../db');
const {
  make_offer_validator,
  offer_reject_response,
} = require('../validators/offersSchema');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const checkIfUserVerified = require('../utils/checkIfUserVerified');
const { sendToQueue } = require('../utils/rabbitmq');
const factory = require('./handlerFactory');

exports.makeOffer = catchAsync(async (req, res, next) => {
  const { error } = make_offer_validator.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const userId = req.user.id;
  const postId = req.params.id;

  await checkIfUserVerified.isUserVerified(userId, next);

  const userQuery = await client.query(
    `SELECT
      users.id,
      users.first_name,
      users.available,
      users.skill_id,
      sender_skill.name AS sender_skill
     FROM users
     JOIN skills AS sender_skill ON users.skill_id = sender_skill.id
     WHERE users.id = $1`,
    [userId]
  );

  const user = userQuery.rows[0];

  if (user.available === false) {
    return next(
      new AppError(
        'You are already working on a project. Please complete it before starting a new one. ',
        400
      )
    );
  }

  const postQuery = await client.query(
    `SELECT id, user_id, skill_id,required_skill_id FROM posts WHERE id = $1`,
    [postId]
  );

  if (postQuery.rows.length === 0) {
    return next(new AppError('No posts found', 404));
  }

  const post = postQuery.rows[0];

  const offersQuery = await client.query(
    `SELECT sender_id, post_id ,status FROM offers WHERE sender_id = $1 AND post_id = $2 AND status = $3`,
    [userId, postId, 'Pending']
  );

  if (offersQuery.rows.length > 0) {
    return next(
      new AppError(
        'You have already sent an offer to this user, please wait for a response first!',
        400
      )
    );
  }

  //Check if the user have the same skill required in the post
  if (user.skill_id !== post.required_skill_id) {
    return next(
      new AppError("You don't have the skill required in the post!", 400)
    );
  }

  const { start_date, end_date, message } = req.body;

  await client.query(
    `INSERT INTO offers (sender_id, reciever_id, created_at, start_date, end_date, message, post_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, post.user_id, new Date(), start_date, end_date, message, postId]
  );

  //Using rabbitmq to send email to the user
  await sendToQueue('offer_queue', {
    recieverId: post.user_id,
    senderFirstName: user.first_name,
    recieverSkill: post.skill_id,
    senderSkill: user.sender_skill,
  });

  res.status(200).json({
    status: 'success',
    message: "You have created the offer, wait for the other user's response",
  });
});

exports.getMyOffers = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const offerQuery = await client.query(
    `
    SELECT
      offers.created_at,
      offers.start_date,
      offers.end_date,
      offers.message,
      posts.title AS post_title,
      users.first_name AS sender_name,
      users.email AS sender_email
    FROM offers
      JOIN posts ON offers.post_id = posts.id
      JOIN users ON offers.sender_id = users.id
    WHERE offers.reciever_id = $1 AND status = $2
    `,
    [userId, 'Pending']
  );

  if (offerQuery.rows.length === 0) {
    return next(new AppError('No offers yet!', 404));
  }

  const offers = offerQuery.rows;

  res.status(200).json({
    status: 'success',
    offers,
  });
});

exports.getMyOneOffer = catchAsync(async (req, res, next) => {
  const offerId = req.params.id;
  const userId = req.user.id;

  const offerQuery = await client.query(
    `
    SELECT
      sender.first_name AS sender_first_name,
      receiver.first_name AS receiver_first_name,
      offers.created_at,
      offers.start_date,
      offers.end_date,
      post.title AS post_title,
      offers.message
    FROM offers
    JOIN users AS sender ON offers.sender_id = sender.id
    JOIN users AS receiver ON offers.reciever_id = receiver.id
    JOIN posts AS post ON offers.post_id = post.id
    WHERE offers.id = $1 AND offers.reciever_id = $2
    `,
    [offerId, userId]
  );

  if (offerQuery.rows.length === 0) {
    return next(new AppError('No offers yet!', 404));
  }

  const offer = offerQuery.rows[0];

  res.status(200).json({
    status: 'success',
    offer,
  });
});

exports.acceptOffer = catchAsync(async (req, res, next) => {});

exports.rejectOffer = catchAsync(async (req, res, next) => {
  const { error } = offer_reject_response.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const offerId = req.params.id;
  const userId = req.user.id;

  const offerQuery = await client.query(
    `SELECT status FROM offers WHERE id = $1 AND reciever_id = $2`,
    [offerId, userId]
  );

  if (offerQuery.rows.length === 0) {
    return next(new AppError('Offer not found!', 404));
  }

  const offer = offerQuery.rows[0];
  if (offer.status === 'Rejected') {
    return next(new AppError('You have already rejected the offer!', 400));
  } else if (offer.status === 'Accepted') {
    return next(new AppError("You can't accept a rejected offer!", 400));
  }

  const offerRejectQuery = await client.query(
    `UPDATE offers SET status = $1 WHERE id = $2 AND reciever_id = $3`,
    ['Rejected', offerId, userId]
  );

  sendToQueue('reject_offer_queue', {
    offerId: offerId,
    recieverId: userId,
  });
  res.status(200).json({
    status: 'success',
    message: 'You have rejected the offer successfully',
  });
});

exports.counterOffer = catchAsync(async (req, res, next) => {});
