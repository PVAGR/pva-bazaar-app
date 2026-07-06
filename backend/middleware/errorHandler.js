// backend/middleware/errorHandler.js - Global error handling
const Sentry = require('@sentry/node');

/**
 * Error logger middleware
 */
function errorLogger(err, req, res, next) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.id,
    error: err.message,
    stack: err.stack,
  };

  console.error('❌ Error:', errorInfo);

  // Send to Sentry if configured
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, { extra: errorInfo });
  }

  next(err);
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  // Default error response
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  }

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    code = 'VALIDATION_ERROR';
  }

  if (err.code === 11000) {
    status = 409;
    message = `Duplicate field: ${Object.keys(err.keyValue)[0]}`;
    code = 'DUPLICATE_ENTRY';
  }

  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  // Send response
  res.status(status).json({
    ok: false,
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Async route wrapper to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
    method: req.method,
    path: req.path,
  });
}

module.exports = {
  errorLogger,
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
