const catchAsync = require('express-async-handler');
const Email = require('../../utils/email');
const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');
const { getIO } = require('../../utils/socket');
const AppError = require('../../utils/appError');

const afterAcceptingOffer = async (data) => {
  try {
    const senderQuery = await client.query(
      `SELECT users.first_name, users.email, sender_skill.name AS sender_skill
       FROM users
       JOIN skills AS sender_skill ON users.skill_id = sender_skill.id
       WHERE users.id = $1`,
      [data.senderId]
    );

    if (senderQuery.rows.length === 0) throw new Error('Sender not found');

    const sender = senderQuery.rows[0];

    const recieverQuery = await client.query(
      `SELECT users.first_name, users.email, reciever_skill.name AS reciever_skill
       FROM users
       JOIN skills AS reciever_skill ON users.skill_id = reciever_skill.id
       WHERE users.id = $1`,
      [data.recieverId]
    );

    if (recieverQuery.rows.length === 0) throw new Error('Reciever not found');

    const reciever = recieverQuery.rows[0];

    await client.query(`UPDATE users SET available = $1 WHERE id = $2`, [
      false,
      data.senderId,
    ]);
    await client.query(`UPDATE users SET available = $1 WHERE id = $2`, [
      false,
      data.recieverId,
    ]);
    await client.query(`UPDATE posts SET available = $1 WHERE user_id = $2`, [
      false,
      data.recieverId,
    ]);

    await client.query(
      `UPDATE offers SET status = $1 WHERE id = $2 AND reciever_id = $3`,
      ['Accepted', data.offerId, data.recieverId]
    );

    await new Email(
      sender,
      null,
      null,
      null,
      sender.first_name,
      reciever.first_name,
      sender.sender_skill,
      reciever.reciever_skill
    ).sendAcceptedOfferForSender();

    const roomId = `offer_${data.offerId}_${data.senderId}_${data.recieverId}`;
    console.log(`Room created of accept offer worker; ${roomId}`);
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
    console.error('❌ Error in afterAcceptingOffer:', err.message);
    throw err; // Let consumeQueue handle ack/nack
  }
};
const start_accept_offer_worker = async () => {
  await consumeQueue('accept_offer_queue', afterAcceptingOffer);
};

module.exports = { start_accept_offer_worker };
