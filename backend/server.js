// Vercel serverless entry point that wraps the Express app
const serverless = require('serverless-http');
const { app } = require('./api/index');

let handler = null;

module.exports = async (req, res) => {
  try {
    // Initialize serverless handler once (lazy, no DB connection here)
    if (!handler) {
      handler = serverless(app);
    }
    // Routes will connect to DB on-demand when needed
    return handler(req, res);
  } catch (err) {
    console.error('Serverless handler error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};
