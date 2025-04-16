const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const client = require('../db');
const {
  make_offer_validator,
  offer_reject_response,
  offer_accept_response,
} = require('../validators/offersSchema');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const checkIfUserVerified = require('../utils/checkIfUserVerified');
const { sendToQueue } = require('../utils/rabbitmq');
const factory = require('./handlerFactory');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);
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

  //4) Get start_date, end_date, message From req.body
  const { message, start_date, end_date } = req.body;
  const parsedStartDate = new Date(start_date);
  const parsedEndDate = new Date(end_date);
  await client.query(
    `INSERT INTO offers (sender_id, reciever_id, created_at, start_date, end_date, message, post_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      post.user_id,
      new Date(),
      parsedStartDate,
      parsedEndDate,
      message,
      postId,
    ]
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

exports.acceptOffer = catchAsync(async (req, res, next) => {
  const { error } = offer_accept_response.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const offerId = req.params.id;
  const userId = req.user.id;

  const offerQuery = await client.query(
    `SELECT id, sender_id, reciever_id, status, is_countered FROM offers WHERE id =$1 AND reciever_id = $2 `,
    [offerId, userId]
  );

  if (offerQuery.rows.length === 0) {
    return next(new AppError('No offers found!', 404));
  }

  const offer = offerQuery.rows[0];

  if (offer.status === 'Accepted') {
    return next(new AppError('You have already accepted the offer!', 400));
  } else if (offer.status === 'Rejected') {
    return next(new AppError("You can't reject an accepted offer!", 400));
  }

  if (offer.is_countered === true) {
    return next(
      new AppError(
        'Your offer has been countered, please review the new offer first!',
        400
      )
    );
  }

  await sendToQueue('accept_offer_queue', {
    offerId: offerId,
    recieverId: offer.reciever_id,
    senderId: offer.sender_id,
  });

  res.status(200).json({
    status: 'success',
    message: 'You have accepted the offer successfully',
  });
});

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

exports.counterOffer = catchAsync(async (req, res, next) => {
  //1) Get the offer using id
  const offerId = req.params.id;
  const userId = req.user.id;

  //2)check if the offer is not pending(Accpted or Rejected) then return an error
  const offerQuery = await client.query(
    `SELECT id, sender_id, reciever_id, status,is_countered FROM offers WHERE id = $1 AND reciever_id = $2`,
    [offerId, userId]
  );

  if (offerQuery.rows.length === 0) {
    return next(new AppError('No offers found!', 404));
  }

  const offer = offerQuery.rows[0];

  if (offer.is_countered === true) {
    return next(
      new AppError(
        "You have already countered the offer, wait for the other user's response!",
        400
      )
    );
  }

  //3)Validate the req.body
  const { error } = make_offer_validator.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }
  //4) Get start_date, end_date, message From req.body
  const { message, start_date, end_date } = req.body;

  const parsedStartDate = new Date(start_date);
  const parsedEndDate = new Date(end_date);

  //5) Insert into counter_offers table the details of the new counter offer
  const counterOfferQuery = await client.query(
    `INSERT INTO counter_offers (start_date, end_date, message) VALUES ($1, $2, $3) RETURNING id`,
    [parsedStartDate, parsedEndDate, message]
  );

  const counter_offer_id = counterOfferQuery.rows[0];

  //6) Counter offer queue will handle the rest
  await sendToQueue('counter_offer_queue', {
    recieverId: offer.reciever_id,
    senderId: offer.sender_id,
    offerId: offer.id,
    counterOfferId: counter_offer_id.id,
  });

  //7)Send the response for the user
  res.status(201).json({
    status: 'success',
    message:
      "You have countered the offer successfully, please wait for the other user's response",
  });
});

//Counter Offer reciever(Which is offer sender in this case) can get his offers
exports.getMyCounterOffer = catchAsync(async (req, res, next) => {});

//Counter Offer reciever(Which is offer sender in this case) can get his offer by Id
exports.getMyOneCounterOffer = catchAsync(async (req, res, next) => {});

//Counter Offer sender(Which is offer reciever in this case) can delete his offer
exports.updateMyCounterOffer = catchAsync(async (req, res, next) => {});

//Counter Offer sender(Which is offer reciever in this case) can delete his offer
exports.deleteMyCounterOffer = catchAsync(async (req, res, next) => {});

//Counter offer reciever can accept the offer
exports.acceptCounterOffer = catchAsync(async (req, res, next) => {
  //1)Get counter off and user IDs
  const counterOfferId = req.params.id;
  const userId = req.user.id;

  //2)Query for the counter offer
  const counterOfferQuery = await client.query(
    `
    SELECT
      offers.id AS offer_id,
      offers.sender_id AS reciever,
      offers.reciever_id AS sender,
      co.message AS counter_offer_message,
      co.start_date AS counter_offer_start_date,
      co.end_date AS counter_offer_end_date
    FROM offers
    
    JOIN counter_offers AS co ON offers.counter_offer_id = co.id
    WHERE offers.counter_offer_id = $1 AND offers.sender_id = $2
    `,
    [counterOfferId, userId]
  );

  //3)check if it exists
  if (counterOfferQuery.rows.length === 0) {
    return next(new AppError('No counter offers found!', 404));
  }

  const counterOffer = counterOfferQuery.rows[0];

  //4) check if anything is provided in req.body(nothing should be sent with req.body)
  const { error } = offer_accept_response.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  console.log(
    counterOffer.counter_offer_start_date,
    counterOffer.counter_offer_end_date
  );
  //5)If yes, then send the rest for the worker to handle the rest
  await sendToQueue('accept_counter_offer_queue', {
    recieverId: counterOffer.reciever,
    senderId: counterOffer.sender,
    offerId: counterOffer.offer_id,
    counterOfferMessage: counterOffer.counter_offer_message,
    counterOfferStartDate: counterOffer.counter_offer_start_date,
    counterOfferEndDate: counterOffer.counter_offer_end_date,
  });

  //6)Send a response for the user
  res.status(200).json({
    status: 'success',
    message: 'You have accepted the offer successfully',
  });
});

//Counter offer reciever can reject the offer
exports.rejectCounterOffer = catchAsync(async (req, res, next) => {});

//******************************FOR ADMINS ONLY***************************************** */
exports.getAllCounterOffer = catchAsync(async (req, res, next) => {});

exports.getOneCounterOffer = catchAsync(async (req, res, next) => {});

exports.deleteOneCounterOffer = catchAsync(async (req, res, next) => {});

exports.updateOneCounterOffer = catchAsync(async (req, res, next) => {});

exports.openTicket;
