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
