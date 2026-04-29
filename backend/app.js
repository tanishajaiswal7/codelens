import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './services/auth-service/routes/authRoutes.js';
import reviewRoutes from './services/review-service/routes/reviewRoutes.js';
import reReviewRoute from './services/review-service/routes/reReviewRoute.js';
import socraticRoutes from './services/socratic-service/routes/socraticRoutes.js';
import historyRoutes from './services/history-service/routes/historyRoutes.js';
import settingsRoutes from './services/settings-service/routes/settingsRoutes.js';
import jobRoutes from './services/job-service/routes/jobRoutes.js';
import githubAuthRoutes from './services/github-auth-service/routes/githubAuthRoutes.js';
import githubPRRoutes from './services/github-pr-service/routes/githubPRRoutes.js';
import fileBrowserRoutes from './services/github-filebrowser-service/routes/fileBrowserRoutes.js';
import workspaceRoutes from './services/workspace-service/routes/workspaceRoutes.js';
import workspacePRRoutes from './services/workspace-service/routes/workspacePRRoutes.js';
import dashboardRoutes from './services/dashboard-service/routes/dashboardRoutes.js';
import notificationRoutes from './services/notification-service/routes/notificationRoutes.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trust proxy headers when running behind a reverse proxy (e.g., Render, Heroku)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

// Security: Helmet to set security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Re-review sends original + updated code and suggestion context, so allow a modest payload size.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// Rate limiter middleware
app.use(rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/github/auth', githubAuthRoutes);
app.use('/api/github/pr', githubPRRoutes);
app.use('/api/github/files', fileBrowserRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/review/re-review', reReviewRoute);
app.use('/api/jobs', jobRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/workspace', workspacePRRoutes);
app.use('/api/socratic', socraticRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// Response header middleware for rate limit info
app.use((req, res, next) => {
  if (res.locals.rateLimitRemaining !== undefined) {
    res.setHeader('X-RateLimit-Remaining', res.locals.rateLimitRemaining);
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling (must be last)
app.use(errorHandler);

export default app;
