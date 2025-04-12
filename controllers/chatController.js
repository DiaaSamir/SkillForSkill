const { getIO } = require('../utils/socket');
const catchAsync = require('express-async-handler');
const AppError = require('../utils/appError');
const { send_message } = require('../validators/chatSchema');
const client = require('../db');
const { handleValidatorsErrors } = require('../utils/handleValidatorsErrors');

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { error } = send_message.validate(req.body);
  if (error) {
    handleValidatorsErrors(error, next);
    return;
  }

  const offerId = req.params.id;
  const offerQuery = await client.query(
    `SELECT id, sender_id, reciever_id FROM offers WHERE id = $1`,
    [offerId]
  );

  if (offerQuery.rows.length === 0) {
    return next(new AppError('No offers found!', 404));
  }

  const offer = offerQuery.rows[0];
  const senderId = req.user.id;
  const { message } = req.body;

  const msgDetails = {
    senderId,
    message,
    timeStamp: new Date(),
  };

  const roomId = `offer_${offer.id}_${offer.sender_id}_${offer.reciever_id}`;
  const io = getIO();

  const roomExists = io.sockets.adapter.rooms.has(roomId);


  if (!roomExists) {
    return next(new AppError('Wrong room id!', 400));
  }


  io.to(roomId).emit('message', msgDetails);

  console.log(msgDetails);
  res.status(201).json({
    status: 'success',
    data: msgDetails,
  });
});
