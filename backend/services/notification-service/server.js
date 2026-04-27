import dotenv from 'dotenv';
import { createApp } from '../../serviceApp.js';
import { connectDB } from '../../config/db.js';
import { connectRabbitMQ, closeConnection } from '../../rabbitmq/connection.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { startNotificationConsumer } from '../../rabbitmq/consumers/notificationConsumer.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp([{ path: '/api/notifications', router: notificationRoutes }]);

async function startService() {
  await connectDB();
  await connectRabbitMQ();
  await startNotificationConsumer();
  app.listen(PORT, () => {
    console.log(`[notification-service] HTTP server and consumer ready on port ${PORT}`);
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
