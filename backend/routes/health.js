const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  // Health check: simple, no DB dependency
  const legacyMode = process.env.LEGACY_MODE === 'true';
  const apiReady = process.env.API_READY !== 'false';
  res.status(200).json({ 
    ok: true, 
    message: 'PVA Bazaar API is healthy!', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    legacyMode,
    apiReady,
  });
});

router.get('/ping', (req, res) => {
  // Simple ping endpoint for monitoring
  res.status(200).json({ ok: true, message: 'pong', timestamp: new Date().toISOString() });
});

router.get('/version', (req, res) => {
  // Version endpoint
  res.status(200).json({ ok: true, version: '1.0.0', timestamp: new Date().toISOString() });
});

module.exports = router;
