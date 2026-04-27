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

async function startService() {
  await connectDB();
  await connectRabbitMQ();
  app.listen(PORT, () => {
    console.log(`[workspace-service] HTTP server listening on port ${PORT}`);
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
