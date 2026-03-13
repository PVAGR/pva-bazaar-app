const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createUserEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

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
    const { name, email, preferences } = req.body;
    const update = { updatedAt: Date.now() };
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;

    // Merge top-level preference keys (dot-notation to avoid clobbering nested fields)
    if (preferences && typeof preferences === 'object') {
      const allowed = ['defaultCountry', 'defaultCurrency', 'defaultWalletAddress', 'defaultTags', 'defaultStreamPlatform', 'defaultPublicVisibility', 'onboarding', 'drafts'];
      for (const key of allowed) {
        if (key in preferences) {
          update[`preferences.${key}`] = preferences[key];
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true },
    ).select('-password');

    if (user) {
      dispatchToOpenClaw(createUserEvent('updated', user, {
        updatedFields: Object.keys(update).filter(k => k !== 'updatedAt'),
      }));
    }

    res.json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

module.exports = router;
