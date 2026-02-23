const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const adminSession = require('../middleware/adminSession');

function getAdminSubjectId() {
  const fromEnv = process.env.ADMIN_USER_ID;
  if (fromEnv && /^[a-f\d]{24}$/i.test(fromEnv)) return fromEnv;
  return '000000000000000000000001';
}

// POST /api/admin/token - Production-safe admin auth via secret code
router.post('/token', (req, res) => {
  const { secret } = req.body;
  
  if (!secret) {
    return res.status(400).json({ ok: false, message: 'Secret required' });
  }
  
  // Compare with environment variable (set in Vercel/production)
  const adminSecret = process.env.ADMIN_SECRET_CODE;
  
  if (!adminSecret) {
    return res.status(503).json({ 
      ok: false, 
      message: 'Admin authentication not configured on server' 
    });
  }
  
  // Constant-time comparison to prevent timing attacks
  const secretsMatch = secret.length === adminSecret.length && 
    Buffer.compare(Buffer.from(secret), Buffer.from(adminSecret)) === 0;
  
  if (!secretsMatch) {
    return res.status(401).json({ ok: false, message: 'Invalid secret' });
  }
  
  // Generate JWT with 12-hour expiration
  const token = jwt.sign(
    { id: getAdminSubjectId(), role: 'admin' }, 
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
  
  res.json({ ok: true, token });
});

// GET /api/admin/status - Check if user is authenticated admin
router.get('/status', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.json({ ok: true, status: 'admin-ok-dev', user: { id: 'dev', role: 'admin' }, timestamp: new Date().toISOString() });
  }
  return auth(req, res, (err) => {
    if (err) return next(err);
    return adminOnly(req, res, () => {
      res.json({ ok: true, status: 'admin-ok', user: req.user, timestamp: new Date().toISOString() });
    });
  });
});

// GET /api/admin/secure-status - Check admin session via cookie
router.get('/secure-status', adminSession, (req, res) => {
  res.json({ ok: true, status: 'admin-ok', user: req.admin, timestamp: new Date().toISOString() });
});

module.exports = router;
