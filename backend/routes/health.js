const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  // Health check: simple, no DB dependency
  res.status(200).json({ 
    ok: true, 
    message: 'PVA Bazaar API is healthy!', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
