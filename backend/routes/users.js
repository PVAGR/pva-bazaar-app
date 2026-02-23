const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

function sanitizeDeep(v) {
  if (typeof v === 'string') return sanitize(v);
  if (Array.isArray(v)) return v.map(sanitizeDeep);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = sanitizeDeep(val);
    return out;
  }
  return v;
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
      const prefs = req.body.preferences;

      // Use dot-path updates so we don't overwrite other preferences (e.g. drafts).
      if (prefs.defaultCountry !== undefined) patch['preferences.defaultCountry'] = sanitize(prefs.defaultCountry || '');
      if (prefs.defaultCurrency !== undefined) {
        patch['preferences.defaultCurrency'] = sanitize(prefs.defaultCurrency || 'USD') || 'USD';
      }
      if (prefs.defaultWalletAddress !== undefined) {
        patch['preferences.defaultWalletAddress'] = sanitize(prefs.defaultWalletAddress || '');
      }
      if (prefs.defaultTags !== undefined) patch['preferences.defaultTags'] = sanitize(prefs.defaultTags || '');
      if (prefs.defaultStreamPlatform !== undefined) {
        patch['preferences.defaultStreamPlatform'] = sanitize(prefs.defaultStreamPlatform || 'none') || 'none';
      }
      if (prefs.defaultPublicVisibility !== undefined) {
        patch['preferences.defaultPublicVisibility'] = !!prefs.defaultPublicVisibility;
      }

      // Guided onboarding metadata (optional).
      // We keep it flexible but sanitized (no scripts) and only store expected keys.
      if (prefs.onboarding !== undefined) {
        const incoming = prefs.onboarding && typeof prefs.onboarding === 'object' ? prefs.onboarding : {};
        const safe = sanitizeDeep(incoming);
        if (safe.dismissedAt !== undefined) patch['preferences.onboarding.dismissedAt'] = safe.dismissedAt ? new Date(safe.dismissedAt) : null;
        if (safe.completedAt !== undefined) patch['preferences.onboarding.completedAt'] = safe.completedAt ? new Date(safe.completedAt) : null;
        // lastSeenAt is safe to bump anytime onboarding is touched.
        patch['preferences.onboarding.lastSeenAt'] = safe.lastSeenAt ? new Date(safe.lastSeenAt) : new Date();
      }
    }

    patch.updatedAt = Date.now();

    const user = await User.findByIdAndUpdate(req.user.id, patch, { new: true }).select('-password');
    res.json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

module.exports = router;
