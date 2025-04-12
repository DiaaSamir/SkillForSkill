const amqp = require('amqplib');

let connection;
let channel;


const connectRabbitMQ = async () => {
  if (channel) return channel; // Reuse channel if already connected

  try {
    connection = await amqp.connect(
      'amqp://newuser:newpassword@localhost:5672'
    ); // RabbitMQ URL

    channel = await connection.createChannel();
    console.log('✅ Connected to RabbitMQ');
    return channel;
  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error);
    throw error;
  }
};

const assertQueue = async (queue) => {
  if (!channel) await connectRabbitMQ();
  await channel.assertQueue(queue, { durable: true });
};

const sendToQueue = async (queue, message) => {
  if (!channel) await connectRabbitMQ();
  await assertQueue(queue);

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
  console.log(`📥 Sent message to ${queue}:`, message);
};

const consumeQueue = async (queue, callback) => {
  if (!channel) await connectRabbitMQ();
  await assertQueue(queue);

  channel.consume(
    queue,
    async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          await callback(data); // ⚠️ ممكن ترمي error
          channel.ack(msg);
          console.log(`📤 Processed message from ${queue}:`, data);
        } catch (err) {
          console.error(
            `❌ Failed to process message from ${queue}:`,
            err.message
          );
          channel.nack(msg, false, false); // لا تعيدها، اعتبرها فشلت
        }
      }
    },
    { noAck: false }
  );
};

module.exports = { connectRabbitMQ, sendToQueue, consumeQueue, assertQueue };
