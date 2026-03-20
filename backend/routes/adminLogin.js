const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

function isObjectIdHex(v) {
  return typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
}

function issueAdminToken(userId, jwtSecret) {
  return jwt.sign({ id: String(userId), role: 'admin' }, jwtSecret, { expiresIn: '12h' });
}

function setAdminCookie(res, token) {
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000,
  });
}

function getAdminBootstrapCode() {
  return String(process.env.ADMIN_BOOTSTRAP_CODE || process.env.ADMIN_SECRET_CODE || '').trim();
}

async function countAdminUsers() {
  return User.countDocuments({ role: 'admin' });
}

// GET /api/admin/bootstrap-status - determines if first-time admin signup is allowed.
router.get('/bootstrap-status', async (_req, res) => {
  try {
    const adminCount = await countAdminUsers();
    const configuredBootstrapCode = getAdminBootstrapCode();
    return res.json({
      ok: true,
      adminCount,
      needsBootstrap: adminCount === 0,
      bootstrapCodeRequired: adminCount > 0,
      bootstrapCodeConfigured: Boolean(configuredBootstrapCode),
    });
  } catch (error) {
    console.error('Admin bootstrap-status error:', error);
    return res.status(500).json({ ok: false, message: 'Failed to load bootstrap status' });
  }
});

// POST /api/admin/signup - create an admin account for first-time setup or controlled bootstrap.
router.post('/signup', async (req, res) => {
  try {
    const jwtSecret = String(process.env.JWT_SECRET || '').trim();
    if (!jwtSecret) {
      return res.status(503).json({ ok: false, message: 'JWT secret not configured on server' });
    }

    const name = String(req.body?.name || '').trim();
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    const bootstrapCode = String(req.body?.bootstrapCode || '').trim();

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, message: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters' });
    }

    const adminCount = await countAdminUsers();
    if (adminCount > 0) {
      const configuredCode = getAdminBootstrapCode();
      if (!configuredCode) {
        return res.status(403).json({ ok: false, message: 'Admin bootstrap is locked. Contact an existing admin.' });
      }
      if (!bootstrapCode || bootstrapCode !== configuredCode) {
        return res.status(403).json({ ok: false, message: 'Invalid bootstrap code' });
      }
    }

    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
      return res.status(409).json({ ok: false, message: 'Email already in use' });
    }
    if (username) {
      const existingByUsername = await User.findOne({ username });
      if (existingByUsername) {
        return res.status(409).json({ ok: false, message: 'Username already in use' });
      }
    }

    const user = new User({
      name,
      username: username || undefined,
      email,
      password,
      role: 'admin',
    });
    await user.save();

    const token = issueAdminToken(user._id, jwtSecret);
    setAdminCookie(res, token);

    return res.status(201).json({
      ok: true,
      message: 'Admin account created',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || '',
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Admin signup error:', error);
    return res.status(500).json({ ok: false, message: error.message || 'Signup failed' });
  }
});

// POST /api/admin/login - Secure admin login
router.post('/login', async (req, res) => {
  try {
    const rawIdentifier = req.body?.username || req.body?.email || req.body?.identifier || '';
    const identifier = String(rawIdentifier).trim();
    const password = String(req.body?.password || '').trim();
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: 'Username/email and password are required' });
    }
    
    if (!jwtSecret) {
      return res.status(503).json({ ok: false, message: 'JWT secret not configured on server' });
    }
    
    const identifierLower = identifier.toLowerCase();
    const adminUserLower = String(adminUser || '').toLowerCase();

    const envAdminMatch = Boolean(adminUser && adminPass) && (
      (identifier === adminUser || identifierLower === adminUserLower) && password === adminPass
    );

    if (!envAdminMatch) {
      const user = await User.findOne({
        $or: [
          { email: identifierLower },
          { username: identifier },
        ],
      });

      if (!user || user.role !== 'admin') {
        return res.status(401).json({ ok: false, message: 'Invalid username or password' });
      }

      const validPassword = await user.comparePassword(password);
      if (!validPassword) {
        return res.status(401).json({ ok: false, message: 'Invalid username or password' });
      }

      const token = issueAdminToken(user._id, jwtSecret);
      setAdminCookie(res, token);
      return res.json({
        ok: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username || '',
          role: user.role,
        },
      });
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
    const token = issueAdminToken(subjectId, jwtSecret);
    setAdminCookie(res, token);
    
    res.json({ ok: true, message: 'Login successful', token });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ ok: false, message: 'Login failed', error: error.message });
  }
});

module.exports = router;
