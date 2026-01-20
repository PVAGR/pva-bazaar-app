const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /api/admin/login - Secure admin login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass) {
    return res.status(503).json({ ok: false, message: 'Admin login not configured on server' });
  }
  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ ok: false, message: 'Invalid username or password' });
  }
  // Issue JWT (12h) - in production, use HttpOnly cookie
  const token = jwt.sign({ id: 'admin-user', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
  // Set HttpOnly cookie for session
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000 // 12 hours
  });
  res.json({ ok: true, message: 'Login successful' });
});

module.exports = router;
