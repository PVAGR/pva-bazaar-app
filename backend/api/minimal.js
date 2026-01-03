// Absolute minimal Express serverless function
const express = require('express');
const serverless = require('serverless-http');

const app = express();

app.get('/api/minimal', (req, res) => {
  res.json({ ok: true, source: 'minimal-express', timestamp: new Date().toISOString() });
});

module.exports = serverless(app);
