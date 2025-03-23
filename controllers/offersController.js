const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const client = require('../db');
const { make_offer_validator } = require('../validators/offersSchema');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const checkIfUserVerified = require('../utils/checkIfUserVerified');

// const check_If_User_Working_On_An_Offer_Already = async (userId) => {
//   const userQuery = await client.query(
//     `SELECT id, available FROM users WHERE id = $1`,
//     [userId]
//   );

//   const user = userQuery.rows[0];

//   if (user.available === false) {
//     return next(new AppError('You already working on a project'))
//   }
// };

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
    `SELECT id, available, skill_id FROM users WHERE id = $1`,
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
    `SELECT id, user_id, required_skill_id FROM posts WHERE id = $1`,
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
    WHERE offers.reciever_id = $1
    `,
    [userId]
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
