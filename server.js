const app = require('./app');
const dotenv = require('dotenv');
const db = require('./db');
const { connectRabbitMQ } = require('./utils/rabbitmq');
const offerWorker = require('./workers/offers/offerWoker');
const rejectOfferWorker = require('./workers/offers/rejectOfferWorker');
const acceptOfferWorker = require('./workers/offers/acceptOfferWorker');
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

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled rejection. Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;
