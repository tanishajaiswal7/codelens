import dotenv from 'dotenv';
import { createApp } from '../../serviceApp.js';
import { connectDB } from '../../config/db.js';
import { connectRabbitMQ, closeConnection } from '../../rabbitmq/connection.js';
import reviewRoutes from './routes/reviewRoutes.js';
import reReviewRoute from './routes/reReviewRoute.js';
import { startReviewConsumer } from './consumers/reviewConsumer.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp([
  { path: '/api/review', router: reviewRoutes },
  { path: '/api/review/re-review', router: reReviewRoute },
]);

async function startService() {
  await connectDB();
  await connectRabbitMQ();
  await startReviewConsumer();
  app.listen(PORT, () => {
    console.log(`[review-service] HTTP server and consumer ready on port ${PORT}`);
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
