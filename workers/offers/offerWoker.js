const catchAsync = require('express-async-handler');
const Email = require('../../utils/email');
const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');
const AppError = require('../../utils/appError');

const sendEmailAfterOffer = async (data) => {
  try {
    const recieverQuery = await client.query(
      `
    SELECT
        users.email,
        users.first_name,
        reciever_skill.name AS reciever_skill
    FROM users
    JOIN skills AS reciever_skill ON users.skill_id = reciever_skill.id
    WHERE users.id =$1
        `,
      [data.recieverId]
    );

    if (recieverQuery.rows.length === 0) {
      return next(new AppError('Something went wrong!', 404));
    }

    const reciever = recieverQuery.rows[0];

    try {
      await new Email(
        reciever,
        null,
        null,
        null,
        data.senderFirstName,
        reciever.first_name,
        data.senderSkill,
        reciever.reciever_skill
      ).SendOfferForReciever();
    } catch (emailErr) {
      console.error('📧 Failed to send email:', emailErr.message);
    }
  } catch (err) {
    console.error('❌ Error in offerWorker:', err.message);
    throw err;
  }
};

const startWoker = async () => {
  console.log('🚀 Starting Offer Worker...');
  await consumeQueue('offer_queue', sendEmailAfterOffer);
};

module.exports = { startWoker };
