/**
 * Global error handler middleware
 * Catches all errors and returns safe error responses
 * Never exposes stack traces to client in production
 */
export const errorHandler = (err, req, res, next) => {
  // Log error details server-side for debugging
  console.error('[Error]', {
    timestamp: new Date().toISOString(),
    message: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Check for custom error codes first
  if (err.code === 'GITHUB_NOT_CONNECTED') {
    return res.status(403).json({
      error: 'GitHub account not connected',
      code: 'GITHUB_NOT_CONNECTED'
    });
  }

  if (err.code === 'GITHUB_TOKEN_INVALID') {
    return res.status(401).json({
      error: 'GitHub token expired or revoked. Please reconnect.',
      code: 'GITHUB_TOKEN_INVALID'
    });
  }

  // Default error response
  let statusCode = err.status || err.statusCode || 500;
  let message = 'Something went wrong';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    statusCode = 400;
    message = 'Email already exists';
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    statusCode = 400;
    message = 'Email already exists';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // In production, never expose error details
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    error: message,
  };

  // Only include details in development
  if (!isProduction && err.message) {
    response.details = err.message;
  }

  res.status(statusCode).json(response);
};
