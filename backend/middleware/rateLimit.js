const rateLimit = require('express-rate-limit');

function isOpenClawPath(req) {
  const path = String(req?.path || req?.originalUrl || '');
  return path.startsWith('/api/openclaw') || path.startsWith('/openclaw');
}

// General API limiter: 300 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  skip: (req) => isOpenClawPath(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ ok: false, error: 'rate_limited' });
  },
});

// Auth/admin limiter: 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ ok: false, error: 'rate_limited' });
  },
});

// Checkout limiter: 30 requests per 15 minutes per IP
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ ok: false, error: 'rate_limited' });
  },
});

// Webhook limiter: 1000 requests per 15 minutes per IP (high, but not unlimited)
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ ok: false, error: 'rate_limited' });
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  checkoutLimiter,
  webhookLimiter,
};
