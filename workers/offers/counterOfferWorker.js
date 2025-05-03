const Email = require('../../utils/email');
const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');
const { getIO } = require('../../utils/socket');

//{reciecerId, senderId, offerId}
const counter_offer_worker = async (data) => {
  try {
    const offerId = data.offerId;
    const recieverId = data.recieverId;
    const senderId = data.senderId;

    await client.query(`BEGIN`);
    //Get sender and reciever based on their Id
    //The process here is reversed (Reciever = Sender And Vice Versa) because this is a counter offer
    const senderQuery = await client.query(
      `
        SELECT
            users.first_name,
            users.email,
            sender_skill.name AS sender_skill
        FROM users

        JOIN skills AS sender_skill ON users.skill_id = sender_skill.id
        WHERE users.id = $1
        `,
      [recieverId]
    );

    if (senderQuery.rows.length === 0) {
      throw new Error('Error in retrieving user');
    }
    const sender = senderQuery.rows[0];

    //Get reciever data
    const recieverQuery = await client.query(
      `
        SELECT
            users.first_name,
            users.email,
            reciever_skill.name AS reciever_skill
        FROM users

        JOIN skills AS reciever_skill ON users.skill_id = reciever_skill.id
        WHERE users.id = $1
        `,
      [senderId]
    );

    if (recieverQuery.rows.length === 0) {
      throw new Error('Error in retrieving user');
    }

    const reciever = recieverQuery.rows[0];

    //Update is_countered column = true in offers table to indicate that the offer is countered
    await client.query(`UPDATE offers SET is_countered = $1 WHERE id = $2`, [
      true,
      offerId,
    ]);

    //Handle sending email for the user about the new offer
    await new Email(
      reciever,
      null,
      null,
      null,
      sender.first_name,
      reciever.first_name,
      sender.sender_skill,
      reciever.reciever_skill
    ).sendCounterOffer();

    await client.query(`COMMIT`);
  } catch (err) {
    await client.query(`ROLLBACK`);
    console.error('❌ Error in counterOfferWorker:', err.message);
    throw err; // Let consumeQueue handle ack/nack
  }
};

const start_counter_offer_worker = async () => {
  await consumeQueue('counter_offer_queue', counter_offer_worker);
};

module.exports = { start_counter_offer_worker };
