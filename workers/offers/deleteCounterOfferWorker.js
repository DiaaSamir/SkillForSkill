const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');

const deleteCounterOffer = async (data) => {
  const senderId = data.senderId;
  const offerId = data.offerId;
  const counteOfferId = data.counteOfferId;

  await client.query(
    `UPDATE offers SET is_countered = $1, WHERE counter_offer_id = $4 AND reciever_id = $5`,
    [null, false, null, counterOfferId, userId]
  );
};

const start_delete_counter_offer_worker = async () => {
  await consumeQueue('delete_counter_offer_queue', deleteCounterOffer);
};

module.exports = { start_delete_counter_offer_worker };
