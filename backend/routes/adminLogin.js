const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

function isObjectIdHex(v) {
  return typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
}

// POST /api/admin/login - Secure admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!adminUser || !adminPass) {
      return res.status(503).json({ ok: false, message: 'Admin login not configured on server' });
    }
    
    if (!jwtSecret) {
      return res.status(503).json({ ok: false, message: 'JWT secret not configured on server' });
    }
    
    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ ok: false, message: 'Invalid username or password' });
    }

    // If configured, this is the preferred way to bind "admin login" to a real user identity.
    // This avoids 500s in routes that do User.findById(req.user.id) or store ObjectId userId.
    const adminUserIdFromEnv = process.env.ADMIN_USER_ID;
    let subjectId = isObjectIdHex(adminUserIdFromEnv) ? adminUserIdFromEnv : null;

    // Otherwise, ensure an admin user exists (idempotent) and use its _id.
    if (!subjectId) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@pvabazaar.org';
      let user = await User.findOne({ email: adminEmail });
      if (!user) {
        // This account is not intended for /api/auth/login, so the password can be random.
        const randomPassword = crypto.randomBytes(24).toString('hex');
        user = new User({ name: 'Admin', email: adminEmail, password: randomPassword });
        await user.save();
      }
      subjectId = String(user._id);
    }

    // Issue JWT (12h) - in production, prefer HttpOnly cookie
    const token = jwt.sign({ id: subjectId, role: 'admin' }, jwtSecret, { expiresIn: '12h' });
    
    // Set HttpOnly cookie for session
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });
    
    res.json({ ok: true, message: 'Login successful', token });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ ok: false, message: 'Login failed', error: error.message });
  }
});

module.exports = router;
