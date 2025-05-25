const { consumeQueue } = require('../../utils/rabbitmq');
const client = require('../../db');
const penaltyController = require('../../controllers/penaltyController');

const handleMissedDeadline = async (data) => {
  try {
    const userId = data.userId;

    await penaltyController.handleUserPenalty(userId);
  } catch (err) {
    console.error('❌ Error in handleMissedDeadlineWorker:', err.message);
    throw err;
  }
};

const start_handle_missed_deadline_worker = async () => {
  await consumeQueue('missed_deadline', handleMissedDeadline);
};

module.exports = { start_handle_missed_deadline_worker };
