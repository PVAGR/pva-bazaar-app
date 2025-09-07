const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ ok: true, message: 'Health route is working!' });
});

module.exports = router;
