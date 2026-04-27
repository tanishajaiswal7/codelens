import dotenv from 'dotenv';
import { createApp } from '../../serviceApp.js';
import { connectDB } from '../../config/db.js';
import { connectRabbitMQ, closeConnection } from '../../rabbitmq/connection.js';
import githubPRRoutes from './routes/githubPRRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp([{ path: '/api/github/pr', router: githubPRRoutes }]);

async function startService() {
  await connectDB();
  await connectRabbitMQ();
  app.listen(PORT, () => {
    console.log(`[github-pr-service] HTTP server listening on port ${PORT}`);
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
