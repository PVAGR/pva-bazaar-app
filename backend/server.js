// Vercel serverless entry point - direct Express export
const { app } = require('./api/index');

// Export Express app directly (Vercel handles serverless wrapping)
module.exports = app;
