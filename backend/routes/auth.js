const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { createUserEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ ok: false, message: 'User already exists' });
    }
    const user = new User({ name, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Dispatch user registration event (non-blocking)
    dispatchToOpenClaw(createUserEvent('registered', user, {
      method: 'password',
    }));
    
    res
      .status(201)
      .json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const rawIdentifier = req.body?.email || req.body?.username || '';
    const identifier = String(rawIdentifier).trim();
    const password = String(req.body?.password || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: 'Email/username and password are required' });
    }

    const identifierLower = identifier.toLowerCase();
    let user = await User.findOne({
      $or: [
        { email: identifierLower },
        { email: identifier },
        { username: identifier },
      ],
    });

    // Optional emergency admin bootstrap from env vars.
    // This keeps production recoverable if the admin user record is missing.
    const envAdminUsername = String(process.env.ADMIN_USERNAME || '').trim();
    const envAdminPassword = String(process.env.ADMIN_PASSWORD || '').trim();
    const envAdminEmail = String(process.env.ADMIN_EMAIL || 'admin@pvabazaar.org').trim().toLowerCase();
    const envAdminUsernameLower = envAdminUsername.toLowerCase();
    const adminIdentifierMatch = Boolean(envAdminUsername) && (
      identifier === envAdminUsername ||
      identifierLower === envAdminUsernameLower ||
      identifierLower === envAdminEmail
    );

    let envAdminAuthenticated = false;

    if (envAdminPassword && adminIdentifierMatch && password === envAdminPassword) {
      user = await User.findOne({
        $or: [
          { username: envAdminUsername },
          { email: envAdminEmail },
          { email: envAdminUsernameLower },
        ],
      });

      if (!user) {
        user = new User({
          name: 'PVA Admin',
          username: envAdminUsername,
          email: envAdminEmail || envAdminUsernameLower,
          password: envAdminPassword,
          role: 'admin',
        });
      } else {
        if (!user.username) user.username = envAdminUsername;
        // Keep env-admin login deterministic: refresh password from env when override path is used.
        user.password = envAdminPassword;
        user.role = 'admin';
      }

      await user.save();
      envAdminAuthenticated = true;
    }

    if (!user) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    if (!envAdminAuthenticated && !(await user.comparePassword(password))) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Dispatch user login event (non-blocking)
    dispatchToOpenClaw(createUserEvent('authenticated', user, {
      method: 'password',
    }));
    
    res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ ok: true, user });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
