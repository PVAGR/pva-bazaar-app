const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ ok: true, message: 'PVA Bazaar API is healthy!', timestamp: new Date().toISOString() });
});

module.exports = router;
