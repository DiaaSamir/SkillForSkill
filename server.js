const app = require('./app');
const dotenv = require('dotenv');
const db = require('./db');
const { connectRabbitMQ } = require('./utils/rabbitmq');
const { startWoker } = require('./workers/offers/offerWoker');
const { startRejectOfferWoker } = require('./workers/offers/rejectOfferWorker');
const {
  start_accept_offer_worker,
} = require('./workers/offers/acceptOfferWorker');
const {
  start_counter_offer_worker,
} = require('./workers/offers/counterOfferWorker');
const {
  start_accept_counter_offer_worker,
} = require('./workers/offers/acceptCounterOfferWorker');
const {
  start_reject_counter_offer_worker,
} = require('./workers/offers/rejectCounterOfferWorker');

const { store_chat_worker } = require('./workers/chatW/chatWorker');
const {
  start_delete_counter_offer_worker,
} = require('./workers/offers/deleteCounterOfferWorker');
const http = require('http');
const { setupSocket } = require('./utils/socket');

dotenv.config({ path: './config.env' });

const port = process.env.PORT || 3000;

const server = http.createServer(app);

// Setup Socket.IO
setupSocket(server);

server.listen(port, () => {
  console.log(`App listening on ${port}`);
});

connectRabbitMQ()
  .then(() => {
    start_accept_offer_worker();
    startWoker();
    startRejectOfferWoker();
    start_counter_offer_worker();
    start_accept_counter_offer_worker();
    start_reject_counter_offer_worker();
    store_chat_worker();
    start_delete_counter_offer_worker();
  })
  .catch((err) => {
    console.error('❌ Failed to connect RabbitMQ:', err);
  });

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled rejection. Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;
