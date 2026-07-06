// Vercel serverless function entry point
// Re-exports the Express app from backend/api/index.js

try {
  // Load the app
  const app = require('../backend/api/index-serverless.js');
  module.exports = app;
} catch (error) {
  console.error('CRITICAL: Failed to load API:', error);
  // Fallback: export a minimal error handler if app fails to load
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'API initialization failed',
      message: error.message,
    });
  };
}
