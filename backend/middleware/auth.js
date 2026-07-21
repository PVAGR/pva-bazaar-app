// backend/middleware/auth.js - Complete authentication middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const { ensureSeedUsers, findUser } = require('../lib/mockUserStore');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRY = '7d';

/**
 * Generate JWT token
 */
function generateToken(userId, expiresIn = JWT_EXPIRY) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
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
      try {
        const raw = Buffer.from(token.slice(6), 'base64').toString('utf8');
        const payload = JSON.parse(raw);
        const localUserId = String(payload.id || payload.userId || payload.sub || '').trim();
        if (!localUserId) {
          return res.status(401).json({ error: 'Invalid local session token' });
        }

        await ensureSeedUsers();
        const localUser = await findUser({ _id: localUserId });
        if (!localUser) {
          return res.status(401).json({ error: 'User not found' });
        }

        req.user = localUser;
        return next();
      } catch (err) {
        return res.status(401).json({ error: err.message || 'Invalid local session token' });
      }
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
        error: 'Invalid authentication token user id'
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
