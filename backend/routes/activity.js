const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Artifact = require('../models/Artifact');

// GET /api/activity?limit=4 - Recent user and artifact activity
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 4;
    // Recent users
    const users = await User.find().sort({ createdAt: -1 }).limit(limit).select('name createdAt');
    // Recent artifacts
    const artifacts = await Artifact.find().sort({ createdAt: -1 }).limit(limit).select('title name artisan createdAt');
    // Format for dashboard
    const activity = [
      ...users.map(u => ({
        type: 'user',
        name: u.name,
        action: 'joined the marketplace',
        time: u.createdAt,
        avatar: '/public/img/avatar-default.png'
      })),
      ...artifacts.map(a => ({
        type: 'artifact',
        name: a.artisan || a.name || a.title,
        action: `listed "${a.title || a.name}"`,
        time: a.createdAt,
        avatar: '/public/img/artifact-default.png'
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, limit);
    res.json(activity);
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
