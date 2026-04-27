import dotenv from 'dotenv';
import { createApp } from '../../serviceApp.js';
import { connectDB } from '../../config/db.js';
import { connectRabbitMQ, closeConnection } from '../../rabbitmq/connection.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { startDashboardConsumer } from '../../rabbitmq/consumers/dashboardConsumer.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp([{ path: '/api/dashboard', router: dashboardRoutes }]);

async function startService() {
  await connectDB();
  await connectRabbitMQ();
  await startDashboardConsumer();
  app.listen(PORT, () => {
    console.log(`[dashboard-service] HTTP server and consumer ready on port ${PORT}`);
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
