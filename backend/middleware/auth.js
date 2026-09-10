// backend/middleware/auth.js - Complete authentication middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const { ensureSeedUsers, findUser } = require('../lib/mockUserStore');
const { getJwtSecret } = require('../lib/jwtSecret');

const JWT_EXPIRY = '7d';

/**
 * Generate JWT token
 */
function generateToken(userId, expiresIn = JWT_EXPIRY) {
  return jwt.sign({ id: userId }, getJwtSecret(), { algorithm: 'HS256', expiresIn });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Authenticate token middleware
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Missing authentication token' });
    }

    if (String(token || '').startsWith('local.')) {
      // Device-local tokens are unsigned and fully browser-fabricated. The
      // server never accepts them: a browser cannot mint an authenticated
      // session or a role for itself. Sign in with a real server account.
      return res.status(401).json({
        ok: false,
        error: 'Device-local sessions are not accepted by the server. Sign in with a server account.',
        code: 'LOCAL_TOKEN_REJECTED',
      });
    }

    const decoded = verifyToken(token);
    let user = null;
    if (decoded?.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
      user = await User.findById(decoded.id).select('-password');
    } else if (decoded?.authStore === 'file' || decoded?.authStore === 'local' || decoded?.id) {
      await ensureSeedUsers();
      user = await findUser({ _id: String(decoded.id || '').trim() });
    }

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid authentication token user id',
        sessionExpired: true,
        message: 'Your session is invalid. Please log in again.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

/**
 * Verify API key for partner integrations
 */
async function authenticateApiKey(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const APIKey = require('../models/APIKey');
    const key = await APIKey.findOne({ key: token, active: true })
      .populate('userId');

    if (!key) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check rate limit
    const now = Date.now();
    const recentRequests = key.requestLog.filter(t => now - t < 60000);

    if (recentRequests.length >= key.rateLimit.requestsPerMinute) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        resetIn: Math.ceil((recentRequests[0] + 60000 - now) / 1000),
      });
    }

    // Log request
    key.requestLog.push(now);
    if (key.requestLog.length > 1000) key.requestLog.shift();
    await key.save();

    req.apiKey = key;
    req.user = key.userId;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Admin-only middleware
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Seller-only middleware
 */
function requireSeller(req, res, next) {
  if (req.user?.role !== 'seller' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Seller access required' });
  }
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  /** Alias used by broker-hub routes (commodities, contacts, templates). */
  authMiddleware: authenticateToken,
  authenticateApiKey,
  requireAdmin,
  requireSeller,
};
