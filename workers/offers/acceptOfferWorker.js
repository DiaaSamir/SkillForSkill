const catchAsync = require('express-async-handler');
const Email = require('../../utils/email');
const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');
const { getIO } = require('../../utils/socket');
const AppError = require('../../utils/appError');

const afterAcceptingOffer = catchAsync(async (data) => {
  //get the sender first name , email and skill name to send an email for the sender that is his offer has been accepted
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
    [data.sender_id]
  );

  //assign values
  const sender = senderQuery.rows[0];

  //get the reciever first name , email and skill name to send an email for the sender
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
    [data.recieverId]
  );

  const reciever = recieverQuery.rows[0];

  //Update the both reciever and sender availabe column to be false
  await client.query(`UPDATE users SET available = $1 WHERE id = $1`, [
    false,
    data.senderId,
  ]);

  await client.query(`UPDATE users SET available = $1 WHERE id = $1`, [
    false,
    data.recieverId,
  ]);

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

  // Create a room specific to the offer
  const roomId = `offer_${data.offerId}_${data.senderId}_${data.recieverId}`;

  // Get the Socket.IO instance to emit events
  const io = getIO();

  // Join both the sender and receiver to the offer's room
  io.to(data.senderId).join(roomId);
  io.to(data.recieverId).join(roomId);

  // Emit a message to both users that the chat can now begin
  io.to(roomId).emit('message', {
    message: 'You can now start chatting!',
    timestamp: new Date(),
  });
});

const start_accept_offer_worker = async () => {
  await consumeQueue('accept_offer_queue', afterAcceptingOffer);
};

start_accept_offer_worker();
