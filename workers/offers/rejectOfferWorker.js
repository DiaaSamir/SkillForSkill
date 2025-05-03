const catchAsync = require('express-async-handler');
const Email = require('../../utils/email');
const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');
const AppError = require('../../utils/appError');

//data:{recieverId}
const sendEmailAfterRejection = async (data) => {
  try {
    //Begin transaction
    await client.query('BEGIN');

    const offerQuery = await client.query(
      `
    SELECT
        offers.sender_id,
        sender.first_name AS sender,
        reciever.first_name AS reciever
    FROM offers
    JOIN users AS sender ON offers.sender_id = sender.id
    JOIN users AS reciever ON offers.reciever_id = reciever.id
    WHERE offers.reciever_id = $1 AND offers.id = $2   
        `,
      [data.recieverId, data.offerId]
    );

    if (offerQuery.rows.length === 0) {
      return next(new AppError('No offers found!', 404));
    }

    const offer = offerQuery.rows[0];

    const senderSkillQuery = await client.query(
      `SELECT users.email, sender_skill.name AS sender_skill FROM users JOIN skills AS sender_skill ON users.skill_id = sender_skill.id WHERE users.id = $1`,
      [offer.sender_id]
    );

    if (senderSkillQuery.rows.length === 0) {
      return next(new AppError('No user found!', 404));
    }

    const senderSkill = senderSkillQuery.rows[0];

    const recieverSkillQuery = await client.query(
      `SELECT reciever_skill.name AS reciever_skill FROM users JOIN skills AS reciever_skill ON users.skill_id = reciever_skill.id WHERE users.id = $1`,
      [data.recieverId]
    );

    const recieverSkill = recieverSkillQuery.rows[0];

    await new Email(
      senderSkill,
      null,
      null,
      null,
      offer.sender,
      offer.reciever,
      senderSkill.sender_skill,
      recieverSkill.reciever_skill
    ).sendOfferRejectionForUser();

    //If no errors happen then commit
    await client.query('COMMIT');
  } catch (err) {
    //Rollback if errors happen
    await client.query('ROLLBACK');
    console.error('❌ Error in rejectOfferWorker:', err.message);
    throw err;
  }
};
const startRejectOfferWoker = async () => {
  await consumeQueue('reject_offer_queue', sendEmailAfterRejection);
};

module.exports = { startRejectOfferWoker };
