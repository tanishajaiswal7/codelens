import dotenv from 'dotenv';
import { createApp } from '../../serviceApp.js';
import { connectDB } from '../../config/db.js';
import { connectRabbitMQ, closeConnection } from '../../rabbitmq/connection.js';
import socraticRoutes from './routes/socraticRoutes.js';
import { startSocraticConsumer } from './consumers/socraticConsumer.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp([{ path: '/api/socratic', router: socraticRoutes }]);

async function startService() {
  await connectDB();
  await connectRabbitMQ();
  await startSocraticConsumer();
  app.listen(PORT, () => {
    console.log(`[socratic-service] HTTP server and consumer ready on port ${PORT}`);
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
