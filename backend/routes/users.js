const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const patch = {};
    if (req.body?.name !== undefined) patch.name = sanitize(req.body.name);
    if (req.body?.email !== undefined) patch.email = sanitize(req.body.email);

    // Store simple defaults so forms can auto-fill for this user later.
    if (req.body?.preferences && typeof req.body.preferences === 'object') {
      patch.preferences = {
        defaultCountry: sanitize(req.body.preferences.defaultCountry || ''),
        defaultCurrency: sanitize(req.body.preferences.defaultCurrency || 'USD') || 'USD',
        defaultWalletAddress: sanitize(req.body.preferences.defaultWalletAddress || ''),
      };
    }

    patch.updatedAt = Date.now();

    const user = await User.findByIdAndUpdate(req.user.id, patch, { new: true }).select('-password');
    res.json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

module.exports = router;
