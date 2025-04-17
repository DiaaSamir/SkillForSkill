const catchAsync = require('express-async-handler');
const Email = require('../../utils/email');
const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');

const rejectCounterOffer = async (data) => {
  try {
    const senderId = data.senderId;
    const recieverId = data.recieverId;
    const offerId = data.offerId;

    //Get the reciever
    const recieverQuery = await client.query(
      `
    SELECT
      users.first_name,
      users.email
    FROM users
    WHERE users.id = $1
    `,
      [recieverId]
    );

    //Check if the reciever exists
    if (recieverQuery.rows.length === 0) {
      throw new Error('Error in retrieving users!');
    }

    const reciever = recieverQuery.rows[0];

    //Get the sender
    const senderQuery = await client.query(
      `
    SELECT
      users.email,
      users.first_name
    FROM users
    WHERE users.id = $1
    `,
      [senderId]
    );

    //Check if it exsits
    if (senderQuery.rows.length === 0) {
      throw new Error('Error in retrieving users!');
    }

    const sender = senderQuery.rows[0];

    //Update offer status to unavailable
    await client.query(`UPDATE offers SET status = $1 WHERE id = $2`, [
      'Rejected',
      offerId,
    ]);

    //send the email for the offer sender
    await new Email(
      sender,
      null,
      null,
      null,
      sender.first_name,
      reciever.first_name
    ).sendRejectedCounterofferForUser();
  } catch (err) {
    console.error('❌ Error in rejectCounterOffer:', err.message);
    throw err; // Let consumeQueue handle ack/nack
  }
};

const start_reject_counter_offer_worker = async () => {
  await consumeQueue('reject_counter_offer_queue', rejectCounterOffer);
};

module.exports = { start_reject_counter_offer_worker };
