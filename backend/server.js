import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { connectRabbitMQ, closeConnection } from './rabbitmq/connection.js'
import { startReviewConsumer } from './services/review-service/consumers/reviewConsumer.js'
import { startSocraticConsumer } from './services/socratic-service/consumers/socraticConsumer.js'
import { startHistoryConsumer } from './rabbitmq/consumers/historyConsumer.js'
import { startDashboardConsumer } from './rabbitmq/consumers/dashboardConsumer.js'
import { startNotificationConsumer } from './rabbitmq/consumers/notificationConsumer.js'
import { startWebhookConsumer } from './rabbitmq/consumers/webhookConsumer.js'

dotenv.config();

const PORT = process.env.PORT || 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectRabbitWithRetry(maxRetries = 20, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await connectRabbitMQ();
      console.log('[Server] ✓ RabbitMQ connected');
      return;
    } catch (err) {
      const isLast = attempt === maxRetries;
      console.error(`[Server] RabbitMQ connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (isLast) {
        throw err;
      }
      await wait(delayMs);
    }
  }
}

async function startServer() {
  try {
    // 1. Database first
    await connectDB()
    console.log('[Server] ✓ Database connected')

    // 2. RabbitMQ
    await connectRabbitWithRetry()

    // 3. Start ALL consumers
    await startReviewConsumer()
    await startSocraticConsumer()
    await startHistoryConsumer()
    await startDashboardConsumer()
    await startNotificationConsumer()
    await startWebhookConsumer()
    console.log('[Server] ✓ All 6 consumers started')

    // 4. HTTP server last
    app.listen(PORT, () => {
      console.log(`[Server] ✓ Running on port ${PORT}`)
    })

  } catch (err) {
    console.error('[Server] Startup failed:', err.message)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...')
  await closeConnection()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeConnection()
  process.exit(0)
})

startServer();
