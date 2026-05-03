import dotenv from 'dotenv';
import { createApp } from '../../serviceApp.js';
import { connectDB } from '../../config/db.js';
import { connectRabbitMQ, closeConnection } from '../../rabbitmq/connection.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import workspacePRRoutes from './routes/workspacePRRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp([
  { path: '/api/workspace', router: workspaceRoutes },
  { path: '/api/workspace', router: workspacePRRoutes },
]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectRabbitWithRetry(maxRetries = 8, delayMs = 2500) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await connectRabbitMQ();
      console.log('[workspace-service] RabbitMQ connected');
      return true;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      console.error(`[workspace-service] RabbitMQ connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (isLastAttempt) {
        return false;
      }
      await wait(delayMs);
    }
  }

  return false;
}

async function startService() {
  try {
    await connectDB();

    const rabbitConnected = await connectRabbitWithRetry();
    if (!rabbitConnected) {
      console.warn('[workspace-service] RabbitMQ unavailable. Continuing without queue features until it is available.');
    }

    app.listen(PORT, () => {
      console.log(`[workspace-service] HTTP server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[workspace-service] Startup failed:', err.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

startService().catch((err) => {
  console.error('[workspace-service] Unhandled startup error:', err.message);
  process.exit(1);
});
