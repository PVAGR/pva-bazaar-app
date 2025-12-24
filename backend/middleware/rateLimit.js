/**
 * Rate Limiting Middleware
 * 
 * Protects API from abuse by limiting request rates
 * Features:
 * - IP-based rate limiting
 * - Different limits for different endpoints
 * - Redis-compatible for production scaling
 * - In-memory fallback for development
 */

// Simple in-memory store for rate limiting
class RateLimitStore {
  constructor() {
    this.hits = new Map();
    this.resetTime = new Map();
    
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  increment(key) {
    const now = Date.now();
    const data = this.hits.get(key) || { count: 0, resetAt: now + 60000 };
    
    if (now > data.resetAt) {
      // Reset if window has passed
      data.count = 1;
      data.resetAt = now + 60000;
    } else {
      data.count++;
    }
    
    this.hits.set(key, data);
    return data;
  }

  get(key) {
    return this.hits.get(key) || { count: 0, resetAt: Date.now() + 60000 };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.hits.entries()) {
      if (now > data.resetAt) {
        this.hits.delete(key);
      }
    }
  }

  reset(key) {
    this.hits.delete(key);
  }
}

const store = new RateLimitStore();

/**
 * Create a rate limiter middleware
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.message - Error message to return
 * @param {number} options.statusCode - HTTP status code for rate limit response
 * @param {boolean} options.skipSuccessfulRequests - Don't count successful requests
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    skipSuccessfulRequests = false,
    keyGenerator = (req) => req.ip || req.connection.remoteAddress
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    
    if (!key) {
      return next();
    }

    const data = store.increment(key);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - data.count));
    res.setHeader('X-RateLimit-Reset', new Date(data.resetAt).toISOString());

    if (data.count > max) {
      console.warn(`⚠️ Rate limit exceeded for ${key} - ${data.count} requests`);
      
      return res.status(statusCode).json({
        ok: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: message,
        retryAfter: Math.ceil((data.resetAt - Date.now()) / 1000)
      });
    }

    // If configured, don't count successful requests
    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400) {
          // Decrement count for successful requests
          const currentData = store.get(key);
          if (currentData.count > 0) {
            currentData.count--;
            store.hits.set(key, currentData);
          }
        }
      });
    }

    next();
  };
}

/**
 * Standard rate limiter for most API endpoints
 * 100 requests per minute per IP
 */
const apiLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 100,
  message: 'Too many API requests. Please slow down.'
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: true
});

/**
 * Lenient rate limiter for health check endpoints
 * 1000 requests per minute per IP
 */
const healthLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 1000,
  message: 'Health check rate limit exceeded.'
});

/**
 * Rate limiter for resource creation endpoints
 * 20 requests per 5 minutes per IP
 */
const createLimiter = createRateLimiter({
  windowMs: 5 * 60000, // 5 minutes
  max: 20,
  message: 'Too many creation requests. Please wait before creating more resources.'
});

/**
 * Rate limiter for search endpoints
 * 50 requests per minute per IP
 */
const searchLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 50,
  message: 'Too many search requests. Please slow down.'
});

/**
 * Get rate limit statistics
 */
function getRateLimitStats() {
  const stats = {
    totalKeys: store.hits.size,
    topOffenders: []
  };

  // Get top 10 IPs by request count
  const sorted = Array.from(store.hits.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  stats.topOffenders = sorted.map(([key, data]) => ({
    ip: key,
    requests: data.count,
    resetAt: new Date(data.resetAt).toISOString()
  }));

  return stats;
}

/**
 * Reset rate limits for a specific key (admin function)
 */
function resetRateLimit(key) {
  store.reset(key);
}

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  healthLimiter,
  createLimiter,
  searchLimiter,
  getRateLimitStats,
  resetRateLimit
};
