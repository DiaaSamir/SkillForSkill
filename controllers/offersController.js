const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const client = require('../db');
const {
  make_offer_validator,
  offer_reject_response,
  offer_accept_response,
  update_counter_offer,
  make_counter_offer_validator,
} = require('../validators/offersSchema');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const checkIfUserVerified = require('../utils/checkIfUserVerified');
const { sendToQueue } = require('../utils/rabbitmq');
const factory = require('./handlerFactory');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

function validateMilestonesEditOnlyDuration(original, incoming) {
  // For each milestone in incoming, check if its title exists in the original milestones
  for (const inc of incoming) {
    const found = original.find((orig) => orig.title === inc.title);
    if (!found) return false; // If any incoming title is not found in original, return false
  }
  return true; // All incoming titles are valid
}

// Function to merge durations from incoming milestones into original milestones
function mergeMilestonesDurations(originalMilestones, incomingMilestones) {
  // Create a Map from incoming milestones for quick lookup by title
  const incomingMap = new Map();
  incomingMilestones.forEach((m) => {
    incomingMap.set(m.title, m.duration);
  });

  // Map over original milestones and replace duration if it exists in incomingMap
  return originalMilestones.map((m) => {
    if (incomingMap.has(m.title)) {
      return {
        title: m.title,
        duration: incomingMap.get(m.title),
      };
    }
    // Return original milestone if no updated duration was provided
    return m;
  });
}

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
        'You are already working on a project. Please complete it before starting a new one.',
        400
      )
    );
  }

  const postQuery = await client.query(
    `SELECT id, user_id, skill_id, required_skill_id, milestones FROM posts WHERE id = $1`,
    [postId]
  );

  if (postQuery.rows.length === 0) {
    return next(new AppError('No posts found', 404));
  }

  const post = postQuery.rows[0];

  const offersQuery = await client.query(
    `SELECT sender_id, post_id, status FROM offers WHERE sender_id = $1 AND post_id = $2 AND status = $3`,
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

  if (user.skill_id !== post.required_skill_id) {
    return next(
      new AppError("You don't have the skill required in the post!", 400)
    );
  }

  const { message, start_date, milestones } = req.body;

  const parsedStartDate = new Date(start_date);
  let senderDuration = 0;

  // Calculate total duration from sender's milestones
  for (const m of milestones) {
    senderDuration += m.duration;
  }

  // Calculate end date based on sender's milestones
  const endDate = new Date(parsedStartDate);
  endDate.setDate(endDate.getDate() + senderDuration);

  await client.query(
    `INSERT INTO offers (sender_id, reciever_id, created_at, start_date, end_date, message, post_id, milestones)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      post.user_id,
      new Date(),
      parsedStartDate,
      endDate,
      message,
      postId,
      JSON.stringify(milestones),
    ]
  );

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
      offers.id,
      offers.created_at,
      offers.start_date,
      offers.end_date,
      offers.message,
      offers.milestones,
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
      offers.milestones,
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
    `SELECT
      offers.id,
      offers.sender_id,
      offers.reciever_id,
      offers.status,
      offers.is_countered,
      offers.end_date,
      offers.milestones AS user_2_milestones,
      posts.milestones AS user_1_milestones,
      posts.end_date AS user_1_deadline
    FROM offers
    JOIN posts ON offers.post_id = posts.id
    WHERE offers.id =$1 AND offers.reciever_id = $2 `,
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

  await client.query(`UPDATE users SET available = $1 WHERE id = $2`, [
    false,
    offer.sender_id,
  ]);
  await client.query(`UPDATE users SET available = $1 WHERE id = $2`, [
    false,
    offer.reciever_id,
  ]);
  await client.query(`UPDATE posts SET available = $1 WHERE user_id = $2`, [
    false,
    offer.reciever_id,
  ]);

  //To get the exact time of accepting the offer to send it to the queue
  const acceptedAt = new Date();

  //SEND email for offer sneder and update db
  await sendToQueue('accept_offer_queue', {
    offerId: offerId,
    recieverId: offer.reciever_id,
    senderId: offer.sender_id,
  });

  //Update project and project_milestones table
  await sendToQueue('project_worker', {
    offerId: offerId,
    user_2_deadline: offer.end_date,
    user_1_id: offer.reciever_id,
    user_2_id: offer.sender_id,
    user_1_milestones: offer.user_1_milestones,
    user_1_deadline: offer.user_1_deadline,
    user_2_milestones: offer.user_2_milestones,
    acceptedAt,
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
  const offerId = req.params.id;
  const userId = req.user.id;

  // Query the offer to verify existence and get its milestones
  const offerQuery = await client.query(
    `SELECT id, sender_id, reciever_id, status, is_countered, milestones FROM offers WHERE id = $1 AND reciever_id = $2`,
    [offerId, userId]
  );

  if (offerQuery.rows.length === 0) {
    return next(new AppError('No offers found!', 404));
  }

  const offer = offerQuery.rows[0];

  // Check if offer has already been countered
  if (offer.is_countered === true) {
    return next(
      new AppError(
        "You have already countered the offer, wait for the other user's response!",
        400
      )
    );
  }

  // Validate incoming request body against Joi schema
  const { error } = make_counter_offer_validator.validate(req.body);
  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const { message, start_date, milestones } = req.body;

  const originalMilestones = offer.milestones;

  // Validate that the incoming milestones titles exist in the original milestones
  if (!validateMilestonesEditOnlyDuration(originalMilestones, milestones)) {
    return next(
      new AppError(
        'You are only allowed to edit durations of the original milestones!',
        400
      )
    );
  }

  // Merge the incoming durations with the original milestones
  const mergedMilestones = mergeMilestonesDurations(
    originalMilestones,
    milestones
  );

  // Calculate total duration from merged milestones durations
  let totalDuration = 0;
  for (const m of mergedMilestones) {
    totalDuration += m.duration;
  }

  // Calculate the end date based on start_date and totalDuration
  const parsedStartDate = new Date(start_date);
  const parsedEndDate = new Date(parsedStartDate);
  parsedEndDate.setDate(parsedEndDate.getDate() + totalDuration);

  // Insert the counter offer into the database with merged milestones
  const counterOfferQuery = await client.query(
    `INSERT INTO counter_offers (start_date, end_date, message, milestones) VALUES ($1, $2, $3, $4) RETURNING id`,
    [parsedStartDate, parsedEndDate, message, JSON.stringify(mergedMilestones)]
  );

  const counter_offer_id = counterOfferQuery.rows[0];

  // Send message to queue for further processing (e.g., notifications)
  await sendToQueue('counter_offer_queue', {
    recieverId: offer.reciever_id,
    senderId: offer.sender_id,
    offerId: offer.id,
    counterOfferId: counter_offer_id.id,
  });

  // Send success response to client
  res.status(201).json({
    status: 'success',
    message:
      "You have countered the offer successfully, please wait for the other user's response",
  });
});

exports.updateMySentOffer = catchAsync(async (req, res, next) => {
  const { error } = update_counter_offer.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const { message, start_date, milestones } = req.body;
  const userId = req.user.id;
  const offerId = req.params.id;

  const offerQuery = await client.query(
    `SELECT id, status, is_countered FROM offers WHERE id = $1 AND sender_id = $2`,
    [offerId, userId]
  );

  if (offerQuery.rows.length === 0) {
    return next(new AppError('No offers found!', 404));
  }

  const offer = offerQuery.rows[0];

  if (offer.status !== 'Pending') {
    return next(
      new AppError("You can't update a rejected or accepted offer!", 400)
    );
  }

  let updatedMilestones = null;
  let calculatedEndDate = null;

  if (milestones) {
    if (!Array.isArray(milestones) || milestones.length === 0) {
      return next(new AppError('You must provide at least one milestone', 400));
    }

    for (const m of milestones) {
      if (!m.duration || typeof m.duration !== 'number' || m.duration <= 0) {
        return next(
          new AppError(
            'Each milestone must have a valid duration (in days)',
            400
          )
        );
      }
    }

    let currentDate = new Date(start_date);
    updatedMilestones = [];

    for (const m of milestones) {
      const milestoneStart = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + m.duration);
      const milestoneEnd = new Date(currentDate);

      updatedMilestones.push({
        title: m.title,
        duration: m.duration,
        start_date: milestoneStart.toISOString(),
        end_date: milestoneEnd.toISOString(),
      });

      calculatedEndDate = milestoneEnd.toISOString();
    }
  }

  const updateOffer = await client.query(
    `
    UPDATE offers
      SET
        message = COALESCE($1, message),
        start_date = COALESCE($2, start_date),
        end_date = COALESCE($3, end_date),
        milestones = COALESCE($4, milestones)
    WHERE id = $5 RETURNING *
    `,
    [
      message,
      start_date,
      calculatedEndDate, // يتم التحديث تلقائيًا
      updatedMilestones ? JSON.stringify(updatedMilestones) : null,
      offerId,
    ]
  );

  if (updateOffer.rows.length === 0) {
    return next(
      new AppError('Error in updating your offer, please try again later!', 400)
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'You have updated your offer successfully',
  });
});

//Counter Offer reciever(Which is offer sender in this case) can get his counter offers for his offers
exports.getMyCounterOffers = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const counterOffersQuery = await client.query(
    `
    SELECT
      counter_offer_sender.first_name AS counter_offer_sender,
      counter_offers.message AS counter_offer_message,
      counter_offers.start_date AS counter_offer_start_date,
      counter_offers.end_date AS counter_offer_end_date,
      counter_offers.milestones AS counter_offer_milestones
    FROM offers
    JOIN users AS counter_offer_sender ON offers.reciever_id =  counter_offer_sender.id
    JOIN counter_offers AS counter_offers ON offers.counter_offer_id = counter_offers.id
    WHERE offers.sender_id = $1 AND offers.status = $2
    `,
    [userId, 'Pending']
  );

  if (counterOffersQuery.rows.length === 0) {
    return next(new AppError('No counter offers yet!', 404));
  }

  const counterOffers = counterOffersQuery.rows;

  res.status(200).json({
    status: 'success',
    counterOffers,
  });
});

//Counter Offer reciever(Which is offer sender in this case) can get his offer by Id
exports.getMyOneCounterOffer = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const counterOfferId = req.params.id;

  const counterOffersQuery = await client.query(
    `
    SELECT
      counter_offer_sender.first_name AS counter_offer_sender,
      counter_offers.message AS counter_offer_message,
      counter_offers.start_date AS counter_offer_start_date,
      counter_offers.end_date AS counter_offer_end_date,
      counter_offers.milestones AS counter_offer_milestones
    FROM offers
    JOIN users AS counter_offer_sender ON offers.reciever_id =  counter_offer_sender.id
    JOIN counter_offers AS counter_offers ON offers.counter_offer_id = counter_offers.id
    WHERE offers.counter_offer_id = $1 AND offers.sender_id = $2 AND offers.status = $3
    `,
    [counterOfferId, userId, 'Pending']
  );

  if (counterOffersQuery.rows.length === 0) {
    return next(new AppError('No counter offers yet!', 404));
  }

  const counterOffers = counterOffersQuery.rows;

  res.status(200).json({
    status: 'success',
    counterOffers,
  });
});

//Counter offer sender(which is offer reciever) can get his sent offers
exports.getMySentCounterOffers = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const counterOffersQuery = await client.query(
    `
    SELECT
      co.start_date AS counter_offer_start_date,
      co.end_date AS counter_offer_end_date,
      co.message AS counter_offer_message,
      co.milestones AS counter_offer_milestones
    FROM offers
    JOIN counter_offers AS co ON offers.counter_offer_id = co.id
    WHERE offers.reciever_id = $1 AND offers.is_countered = $2 AND offers.status = $3
    `,
    [userId, true, 'Pending']
  );

  if (counterOffersQuery.rows.length === 0) {
    return next(new AppError("You haven't sent any counter offers yet!", 404));
  }

  const counterOffers = counterOffersQuery.rows;

  res.status(200).json({
    status: 'success',
    counterOffers,
  });
});

//Counter offer sender(which is offer reciever) can get his sent offer by Id
exports.getMyOneSentCounterOffer = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const counterOfferId = req.params.id;

  const counterOfferQuery = await client.query(
    `
    SELECT
      co.start_date AS counter_offer_start_date,
      co.end_date AS counter_offer_end_date,
      co.message AS counter_offer_message,
      co.milestones AS counter_offer_milestones
    FROM offers
    JOIN counter_offers AS co ON offers.counter_offer_id = co.id
    WHERE offers.reciever_id = $1 AND offers.is_countered = $2 AND offers.status = $3 AND offers.counter_offer_id = $4
    `,
    [userId, true, 'Pending', counterOfferId]
  );

  if (counterOfferQuery.rows.length === 0) {
    return next(new AppError('No counter offers found!', 404));
  }

  const counterOffer = counterOfferQuery.rows[0];

  res.status(200).json({
    status: 'success',
    counterOffer,
  });
});

//Counter Offer sender(Which is offer reciever in this case) can update his offer
exports.updateMySentCounterOffer = catchAsync(async (req, res, next) => {
  const { error } = update_counter_offer.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const { message, start_date, end_date, milestones } = req.body;
  const userId = req.user.id;
  const counterOfferId = req.params.id;

  const counterOfferQuery = await client.query(
    `SELECT id, status, is_countered FROM offers WHERE counter_offer_id = $1 AND reciever_id = $2`,
    [counterOfferId, userId]
  );

  if (counterOfferQuery.rows.length === 0) {
    return next(new AppError('No counter offers found!', 404));
  }

  const counterOffer = counterOfferQuery.rows[0];

  if (counterOffer.status !== 'Pending') {
    return next(
      new AppError("You can't update a rejected or accepted offer!", 400)
    );
  }

  if (counterOffer.is_countered === false) {
    return next(new AppError('The offer is not countered yet!', 400));
  }

  let updatedMilestones = null;
  let calculatedEndDate = null;

  if (milestones) {
    if (!Array.isArray(milestones) || milestones.length === 0) {
      return next(new AppError('You must provide at least one milestone', 400));
    }

    for (const m of milestones) {
      if (!m.duration || typeof m.duration !== 'number' || m.duration <= 0) {
        return next(
          new AppError(
            'Each milestone must have a valid duration (in days)',
            400
          )
        );
      }
    }

    let currentDate = new Date(start_date);
    updatedMilestones = [];

    for (const m of milestones) {
      const milestoneStart = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + m.duration);
      const milestoneEnd = new Date(currentDate);

      updatedMilestones.push({
        title: m.title,
        duration: m.duration,
        start_date: milestoneStart.toISOString(),
        end_date: milestoneEnd.toISOString(),
      });

      calculatedEndDate = milestoneEnd.toISOString();
    }
  }

  const updateCounterOfferQuery = await client.query(
    `
    UPDATE counter_offers
      SET
        message = COALESCE($1, message),
        start_date = COALESCE($2, start_date),
        end_date = COALESCE($3, end_date),
        milestones = COALESCE($4, milestones)
    WHERE id = $5 RETURNING *
    `,
    [
      message,
      start_date,
      end_date,
      updatedMilestones ? JSON.stringify(updatedMilestones) : null,
      counterOfferId,
    ]
  );

  if (updateCounterOfferQuery.rows.length === 0) {
    return next(
      new AppError(
        'Error in updating your counter offer, please try again later!',
        400
      )
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'You have updated your counter offer successfully',
  });
});

//Counter Offer sender(Which is offer reciever in this case) can delete his offer
exports.deleteMySentCounterOffer = catchAsync(async (req, res, next) => {
  const { error } = offer_accept_response.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const userId = req.user.id;
  const counterOfferId = req.params.id;

  const counterOfferQuery = await client.query(
    `SELECT
       id,
       status,
       is_countered,
       sender_id AS reciever,
       reciever_id AS sender
     FROM offers
     WHERE counter_offer_id = $1 AND reciever_id = $2`,
    [counterOfferId, userId]
  );

  if (counterOfferQuery.rows.length === 0) {
    return next(new AppError('No counter offers found!', 404));
  }

  const counterOffer = counterOfferQuery.rows[0];

  if (counterOffer.status !== 'Pending') {
    return next(
      new AppError("You can't update a rejected or accepted offer!", 400)
    );
  }

  if (counterOffer.is_countered === false) {
    return next(new AppError('The offer is not countered yet!', 400));
  }

  await client.query(
    `UPDATE offers SET counter_offer_id = $1, is_countered = $2, project_phase = $3, WHERE counter_offer_id = $4 AND reciever_id = $5`,
    [null, false, null, counterOfferId, userId]
  );

  res.status(200).json({
    status: 'success',
    message: 'You have deleted the counter offer successfully',
  });
});

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
      offers.post_id AS post_id,
      offers.sender_id AS reciever,
      offers.reciever_id AS sender,
      offers.start_date AS offer_start_date,
      offers.end_date AS offer_end_date,
      offers.milestones AS offer_milestones,
      offers.status,
      offers.is_countered,
      co.message AS counter_offer_message,
      co.start_date AS counter_offer_start_date,
      co.end_date AS counter_offer_end_date,
      co.milestones AS counter_offer_milestones
    FROM offers
    
    JOIN counter_offers AS co ON offers.counter_offer_id = co.id
    WHERE offers.counter_offer_id = $1 AND offers.sender_id = $2
    `,
    [counterOfferId, userId]
  );

  //3)check if it exists
  if (counterOfferQuery.rows.length === 0) {
    return next(new AppError('No counter offers found for this offer!', 404));
  }

  const counterOffer = counterOfferQuery.rows[0];

  //Check if its already accepted or rejected

  if (counterOffer.is_countered === false) {
    return next(
      new AppError('Offer is not countered to accept or reject!', 400)
    );
  }

  if (counterOffer.status === 'Accepted') {
    return next(new AppError('You have already accepted the offer!', 400));
  }

  if (counterOffer.status === 'Rejected') {
    return next(new AppError("You can't accept a rejected offer!", 400));
  }

  const counterOfferStartDate =
    counterOffer.counter_offer_start_date ?? counterOffer.offer_start_date;

  const counterOfferEndDate =
    counterOffer.counter_offer_end_date ?? counterOffer.offer_end_date;

  const counterOfferMilestones =
    counterOffer.counter_offer_milestones ?? counterOffer.offer_milestones;

  //4) check if anything is provided in req.body(nothing should be sent with req.body)
  const { error } = offer_accept_response.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  try {
    await client.query('BEGIN');
    //update users set them to unavailable
    await client.query(`UPDATE users SET available = $1 WHERE id IN($2, $3)`, [
      false,
      counterOffer.sender,
      counterOffer.reciever,
    ]);

    //update post to unavailable
    await client.query(
      `UPDATE posts SET available = $1 WHERE id = $2 AND user_id = $3`,
      [false, counterOffer.post_id, counterOffer.reciever]
    );

    //update project status in offer table to Accepted and prohect_phase to In-progress and then update the offer new details
    await client.query(
      `UPDATE offers SET status = $1, milestones = $2, start_date = $3, end_date= $4 WHERE id = $5`,
      [
        'Accepted',
        JSON.stringify(counterOfferMilestones),
        counterOfferStartDate,
        counterOfferEndDate,
        counterOffer.offer_id,
      ]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    return next(new AppError('Error in updating users and offer!', 400));
  }
  //5)If yes, then send the rest for the worker to handle the rest
  await sendToQueue('accept_counter_offer_queue', {
    offerId: counterOffer.offer_id,
    recieverId: counterOffer.reciever,
    senderId: counterOffer.sender,
  });

  const acceptedAt = new Date();

  //Update project and project_milestones table
  await sendToQueue('project_counter_offer_worker', {
    offerId: counterOffer.offer_id,
    postId: counterOffer.post_id,
    user_2_deadline: counterOfferEndDate,
    user_1_id: counterOffer.sender,
    user_2_id: counterOffer.reciever,
    user_2_milestones: counterOfferMilestones,
    acceptedAt,
  });

  //6)Send a response for the user
  res.status(200).json({
    status: 'success',
    message: 'You have accepted the offer successfully',
  });
});

//Counter offer reciever can reject the offer
exports.rejectCounterOffer = catchAsync(async (req, res, next) => {
  //Get counter offer id and user id
  const counteOfferId = req.params.id;
  const userId = req.user.id;

  //check if anything is anything comes with the request(nothing should be provided)
  const { error } = offer_reject_response.validate(req.body);

  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  //Query for the counter offer
  const counterOfferQuery = await client.query(
    `
    SELECT
      offers.id,
      offers.sender_id AS reciever,
      offers.reciever_id AS sender,
      offers.counter_offer_id,
      offers.status,
      offers.is_countered
    FROM offers
    WHERE offers.counter_offer_id = $1 AND offers.sender_id = $2
    `,
    [counteOfferId, userId]
  );

  //If no counter offers found return an error
  if (counterOfferQuery.rows.length === 0) {
    return next(new AppError('No counter offers found for this offer!', 404));
  }

  const counterOffer = counterOfferQuery.rows[0];
  //Check if status is not accepted or rejected already and check if it is even countered
  if (counterOffer.status === 'Accepted') {
    return next(new AppError("You can't reject an accepted offer!", 400));
  }

  if (counterOffer.status === 'Rejected') {
    return next(new AppError('You have already rejected the offer!', 400));
  }

  if (counterOffer.is_countered === false) {
    return next(
      new AppError('Offer is not countered to accept or reject!', 400)
    );
  }
  //Send values to the queue to handle sending email and update db
  await sendToQueue('reject_counter_offer_queue', {
    offerId: counterOffer.id,
    senderId: counterOffer.sender,
    recieverId: counterOffer.reciever,
  });

  //Send response for the user
  res.status(200).json({
    status: 'success',
    message: 'You have rejected the offer successfully!',
  });
});

//******************************FOR ADMINS ONLY***************************************** */
exports.getAllCounterOffersForAdmin = factory.getAll('counter_offers');

exports.getOneCounterOfferForAdmin = factory.getOne('counter_offers');

exports.deleteOneCounterOfferForAdmin = factory.deleteOne('counter_offers');

exports.updateOneCounterOfferForAdmin = catchAsync(async (req, res, next) => {
  const { error } = update_counter_offer.validate(req.body);
  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }
  const counterOfferId = req.params.id;

  const { message, start_date, end_date } = req.body;

  const updateCounterOfferQuery = await client.query(
    `
    UPDATE counter_offers
      SET
        message = COALESCE($1, message)
        start_date = COALESCE($2, start_date)
        end_date = COALESCE($3, end_date)
      WHERE id = $4 RETURNING *
    `,
    [message, start_date, end_date, counterOfferId]
  );

  if (updateCounterOfferQuery.rows.length === 0) {
    return next(new AppError('Error in updating counter offer!', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'Updated successfully',
  });
});
