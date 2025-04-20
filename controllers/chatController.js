const { getIO } = require('../utils/socket');
const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const { send_message } = require('../validators/chatSchema');
const client = require('../db');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');
const { sendToQueue } = require('../utils/rabbitmq');

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { error } = send_message.validate(req.body);
  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const offerId = req.params.id;
  const offerQuery = await client.query(
    `SELECT id, sender_id, reciever_id, status FROM offers WHERE id = $1`,
    [offerId]
  );

  if (offerQuery.rows.length === 0) {
    return next(new AppError('No offers found!', 404));
  }

  const offer = offerQuery.rows[0];
  const senderId = req.user.id;
  const { message } = req.body;

  if (offer.status === 'Rejected') {
    return next(
      new AppError("You can't send a message in rejected offer's chat!", 403)
    );
  }
  if (offer.status === 'Pending') {
    return next(new AppError('Offer is still pending!', 403));
  }

  if (offer.sender_id !== senderId && offer.reciever_id !== senderId) {
    return next(
      new AppError(
        'You are not authorized to send a message in this chat room!',
        403
      )
    );
  }

  const msgDetails = {
    senderId,
    message,
    timeStamp: new Date(),
  };

  const roomId = `offer_${offer.id}_${offer.sender_id}_${offer.reciever_id}`;
  const io = getIO();

  // Simulate server joining the room
  const serverSocketId = 'server-simulator';
  io.sockets.adapter.rooms.set(roomId, new Set([serverSocketId]));
  const roomExists = io.sockets.adapter.rooms.has(roomId);

  if (!roomExists) {
    return next(new AppError('Wrong room id!', 400));
  }

  io.to(roomId).emit('message', msgDetails);

  await sendToQueue('send_message_queue', {
    roomId,
    message,
    senderId,
    offerId,
    timeStamp: msgDetails.timeStamp,
  });

  console.log(msgDetails);
  res.status(201).json({
    status: 'success',
    data: msgDetails,
  });
});

//*************************************FOR ADMINS************************* */
exports.getChatOfAnOffer = catchAsync(async (req, res, next) => {
  const offerId = req.params.id;

  const messagesQuery = await client.query(
    `
    SELECT
      message_sender.first_name AS message_sender,
      chat_history.message AS message,
      chat_history.timestamp AS timestamp
    FROM chat_history
    JOIN users AS message_sender ON chat_history.sender_id = message_sender.id
    WHERE chat_history.offer_id = $1
    `,
    [offerId]
  );

  if (messagesQuery.rows.length === 0) {
    return next(new AppError('No messages found for this offer!', 404));
  }

  const messages = messagesQuery.rows;

  res.status(200).json({
    status: 'success',
    messages,
  });
});
