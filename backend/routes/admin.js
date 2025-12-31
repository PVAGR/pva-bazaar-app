const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// In development, do not block if auth is missing; return a stub OK.
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

module.exports = router;
