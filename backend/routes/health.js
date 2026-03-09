const express = require('express');
const router = express.Router();

// Import OpenClaw health check (optional dependency)
let getOpenClawHealth;
try {
  getOpenClawHealth = require('./openclaw').getOpenClawHealth;
} catch (err) {
  // OpenClaw module not available, skip integration
  getOpenClawHealth = null;
}

router.get('/', (req, res) => {
  // Health check: simple, no DB dependency
  const response = { 
    ok: true, 
    message: 'PVA Bazaar API is healthy!', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  // Add OpenClaw status if available
  if (getOpenClawHealth) {
    try {
      response.openclaw = getOpenClawHealth();
    } catch (err) {
      response.openclaw = { 
        status: 'error', 
        message: `Health check failed: ${err.message}` 
      };
    }
  }

  res.status(200).json(response);
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
