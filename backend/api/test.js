// Minimal Express test to verify serverless-http works
const express = require('express');
const serverless = require('serverless-http');

const app = express();

app.get('/api/test', (req, res) => {
  res.json({
    ok: true,
    source: 'test.js',
    message: 'Minimal Express app - no routes, no models',
    timestamp: new Date().toISOString(),
  });
});

module.exports = serverless(app);
