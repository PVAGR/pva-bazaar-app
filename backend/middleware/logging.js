/**
 * Request Logging Middleware
 * 
 * Provides structured logging for all HTTP requests with:
 * - Request details (method, path, IP)
 * - Response status and time
 * - Error tracking
 * - Performance monitoring
 * 
 * Dependencies: Requires 'morgan' package
 * Note: morgan is listed in the root package.json dependencies
 */

const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create write stream for access logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Define custom tokens
morgan.token('req-body', (req) => {
  // Only log body for non-sensitive routes
  if (req.path.includes('/auth/') || req.path.includes('/login') || req.path.includes('/register')) {
    return '[REDACTED]';
  }
  return JSON.stringify(req.body);
});

morgan.token('response-time-colored', (req, res) => {
  const responseTime = morgan['response-time'](req, res);
  if (!responseTime) return '-';
  
  const time = parseFloat(responseTime);
  if (time < 100) return `\x1b[32m${responseTime}ms\x1b[0m`; // Green
  if (time < 500) return `\x1b[33m${responseTime}ms\x1b[0m`; // Yellow
  return `\x1b[31m${responseTime}ms\x1b[0m`; // Red
});

// Custom format for detailed logging
const detailedFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Colored format for console
const consoleFormat = ':method :url :status :response-time-colored';

/**
 * Request logger middleware
 * Logs all requests to console and file
 */
const requestLogger = [
  // Log to console with colors
  morgan(consoleFormat, {
    skip: (req, res) => {
      // Skip health check pings to reduce noise
      return req.path === '/api/health/ping';
    }
  }),
  
  // Log to file with detailed info
  morgan(detailedFormat, {
    stream: accessLogStream,
    skip: (req, res) => {
      // Log everything to file, including health checks
      return false;
    }
  })
];

/**
 * Error logger middleware
 * Logs errors with context
 */
const errorLogger = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    method: req.method,
    path: req.path,
    error: {
      message: err.message,
      stack: err.stack,
      status: err.status || 500
    },
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  // Log to console
  console.error('\x1b[31m%s\x1b[0m', '🚨 Error:', JSON.stringify(errorLog, null, 2));

  // Log to file
  const errorLogStream = fs.createWriteStream(
    path.join(logsDir, 'error.log'),
    { flags: 'a' }
  );
  errorLogStream.write(JSON.stringify(errorLog) + '\n');
  errorLogStream.end();

  next(err);
};

/**
 * Performance monitoring middleware
 * Tracks slow requests
 */
const SLOW_REQUEST_THRESHOLD = 1000; // ms

const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (duration > SLOW_REQUEST_THRESHOLD) {
      const slowLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        status: res.statusCode,
        warning: 'SLOW_REQUEST'
      };

      console.warn('⚠️ Slow request detected:', JSON.stringify(slowLog));

      // Log to slow requests file
      const slowLogStream = fs.createWriteStream(
        path.join(logsDir, 'slow-requests.log'),
        { flags: 'a' }
      );
      slowLogStream.write(JSON.stringify(slowLog) + '\n');
      slowLogStream.end();
    }
  });

  next();
};

/**
 * Request counter for metrics
 */
const requestMetrics = {
  total: 0,
  byMethod: {},
  byStatus: {},
  errors: 0
};

const metricsMiddleware = (req, res, next) => {
  requestMetrics.total++;
  requestMetrics.byMethod[req.method] = (requestMetrics.byMethod[req.method] || 0) + 1;

  res.on('finish', () => {
    const statusCategory = Math.floor(res.statusCode / 100) + 'xx';
    requestMetrics.byStatus[statusCategory] = (requestMetrics.byStatus[statusCategory] || 0) + 1;
    
    if (res.statusCode >= 400) {
      requestMetrics.errors++;
    }
  });

  next();
};

/**
 * Get current metrics
 */
function getMetrics() {
  return {
    ...requestMetrics,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
}

/**
 * Reset metrics (useful for testing)
 */
function resetMetrics() {
  requestMetrics.total = 0;
  requestMetrics.byMethod = {};
  requestMetrics.byStatus = {};
  requestMetrics.errors = 0;
}

module.exports = {
  requestLogger,
  errorLogger,
  performanceMonitor,
  metricsMiddleware,
  getMetrics,
  resetMetrics
};
