const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');

const storeChat = async (data) => {
  try {
    const senderId = data.senderId;
    const message = data.message;
    const timestamp = data.timeStamp;
    const offerId = data.offerId;
    const roomId = data.roomId;

    await client.query(
      `INSERT INTO chat_history (message, sender_id, timestamp, room_id, offer_id) VALUES ($1, $2, $3, $4, $5)`,
      [message, senderId, timestamp, roomId, offerId]
    );
  } catch (err) {
    console.error('❌ Error in storeChatWorker:', err.message);
    throw err; // Let consumeQueue handle ack/nack
  }
};

const store_chat_worker = async () => {
  await consumeQueue('send_message_queue', storeChat);
};

module.exports = {store_chat_worker };
