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

    //send email for the users
    try {
      await new Email(
        sender,
        null,
        null,
        null,
        sender.first_name,
        reciever.first_name
      ).sendAcceptedCounterOfferForUser();
    } catch (emailErr) {
      console.error('📧 Failed to send email:', emailErr.message);
    }

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
    await client.query(`ROLLBACK`);
    console.error('❌ Error in acceptCounterOffer:', err.message);
    throw err; // Let consumeQueue handle ack/nack
  }
};

const start_accept_counter_offer_worker = async () => {
  await consumeQueue('accept_counter_offer_queue', acceptCounterOffer);
};

module.exports = { start_accept_counter_offer_worker };
