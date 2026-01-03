// Vercel serverless entry point that wraps the Express app
const serverless = require('serverless-http');

let handler = null;

module.exports = async (req, res) => {
  try {
    // Lazy-load Express app on first request (defers all route/model requires)
    if (!handler) {
      const { app } = require('./api/index');
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
