const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.get('/status', auth, adminOnly, (req, res) => {
  res.json({ ok: true, status: 'admin-ok', user: req.user, timestamp: new Date().toISOString() });
});

module.exports = router;
