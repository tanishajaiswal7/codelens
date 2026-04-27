import dotenv from 'dotenv';
import { createApp } from '../../serviceApp.js';
import { connectDB } from '../../config/db.js';
import { connectRabbitMQ, closeConnection } from '../../rabbitmq/connection.js';
import historyRoutes from './routes/historyRoutes.js';
import { startHistoryConsumer } from '../../rabbitmq/consumers/historyConsumer.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp([{ path: '/api/history', router: historyRoutes }]);

async function startService() {
  await connectDB();
  await connectRabbitMQ();
  await startHistoryConsumer();
  app.listen(PORT, () => {
    console.log(`[history-service] HTTP server and consumer ready on port ${PORT}`);
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
