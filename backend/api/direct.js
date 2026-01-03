// Direct Vercel handler without serverless-http
const express = require('express');

const app = express();
app.use(express.json());

app.get('/api/direct', (req, res) => {
  res.json({ ok: true, source: 'direct-handler', timestamp: new Date().toISOString() });
});

// Export the Express app directly (Vercel will handle it)
module.exports = app;
