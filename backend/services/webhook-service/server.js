import dotenv from 'dotenv';
import { createApp } from '../../serviceApp.js';
import { connectDB } from '../../config/db.js';
import { connectRabbitMQ, closeConnection } from '../../rabbitmq/connection.js';
import { startWebhookConsumer } from '../../rabbitmq/consumers/webhookConsumer.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp([]);

async function startService() {
  await connectDB();
  await connectRabbitMQ();
  await startWebhookConsumer();
  app.listen(PORT, () => {
    console.log(`[webhook-service] worker ready on port ${PORT}`);
  });
}

process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

startService();
