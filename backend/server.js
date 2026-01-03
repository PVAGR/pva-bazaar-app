// Vercel serverless entry point that wraps the Express app
const serverless = require('serverless-http');
const { app } = require('./api/index');

// Export serverless handler directly
module.exports = serverless(app);
