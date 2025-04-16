const Email = require('../../utils/email');
const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');
const { getIO } = require('../../utils/socket');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);
const acceptCounterOffer = async (data) => {
  try {
    const recieverId = data.recieverId;
    const senderId = data.senderId;
    const offerId = data.offerId;
    let counterOfferMessage = data.counterOfferMessage;
    let counterOffeStartDate = data.counterOfferStartDate;
    let counterOfferEndDate = data.counterOfferEndDate;

    // تحويل تواريخ البداية والنهاية باستخدام dayjs لتنسيق موحد
    counterOffeStartDate = dayjs.utc(counterOffeStartDate).format('YYYY-MM-DD');
    counterOfferEndDate = dayjs.utc(counterOfferEndDate).format('YYYY-MM-DD');
    //Get offer details
    const offerQuery = await client.query(
      `SELECT start_date, end_date, post_id, message FROM offers WHERE id = $1`,
      [offerId]
    );

    if (offerQuery.rows.length === 0) {
      throw new Error('Error in retrieving offer!');
    }

    const offer = offerQuery.rows[0];

    if (counterOfferMessage === null) {
      counterOfferMessage = offer.message;
    }
    if (counterOffeStartDate === null) {
      counterOffeStartDate = offer.start_date;
    }
    if (counterOfferEndDate === null) {
      counterOfferEndDate = offer.end_date;
    }

    //Get the reciever
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
      users.first_name,
      sender_skill.name AS sender_skill
    FROM users

    JOIN skills AS sender_skill ON users.skill_id = sender_skill.id
    WHERE users.id = $1
    `,
      [senderId]
    );

    //Check if it exsits
    if (senderQuery.rows.length === 0) {
      throw new Error('Error in retrieving users!');
    }

    const sender = senderQuery.rows[0];

    //update users set them to unavailable

    await client.query(`UPDATE users SET available = $1 WHERE id IN($2, $3)`, [
      false,
      senderId,
      recieverId,
    ]);

    //update post to unavailable
    await client.query(`UPDATE posts SET available = $1 WHERE id = $2`, [
      false,
      offer.post_id,
    ]);

    //update project status in offer table to Accepted and prohect_phase to In-progress and then update the offer new details
    await client.query(
      `UPDATE offers SET status = $1, project_phase = $2, message = $3, start_date = $4, end_date= $5 WHERE id = $6`,
      [
        'Accepted',
        'In-progress',
        counterOfferMessage,
        counterOffeStartDate,
        counterOfferEndDate,
        offerId,
      ]
    );

    //send email for the users
    await new Email(
      sender,
      null,
      null,
      null,
      sender.first_name,
      reciever.first_name,
      sender.sender_skill,
      reciever.reciever_skill
    ).sendAcceptedCounterOfferForUser();

    //Add both users for the chat room
    const roomId = `counter_offer_${data.offerId}_${data.senderId}_${data.recieverId}`;

    const io = getIO();

    io.to(data.senderId.toString()).emit('offerAccepted', { roomId });
    io.to(data.recieverId.toString()).emit('offerAccepted', { roomId });

    io.to(roomId).emit('message', {
      message: 'You can now start chatting!',
      timestamp: new Date(),
    });

    // Simulate server joining the room
    const serverSocketId = 'server-simulator';
    io.sockets.adapter.rooms.set(roomId, new Set([serverSocketId]));

    // Check if the specific room exists
    const roomExists = io.sockets.adapter.rooms.has(roomId);

    console.log(`Does room ${roomId} exist?`, roomExists);
  } catch (err) {
    console.error('❌ Error in afterCounterOffer:', err.message);
    throw err; // Let consumeQueue handle ack/nack
  }
};

const start_accept_counter_offer_worker = async () => {
  await consumeQueue('accept_counter_offer_queue', acceptCounterOffer);
};

module.exports = { start_accept_counter_offer_worker };
