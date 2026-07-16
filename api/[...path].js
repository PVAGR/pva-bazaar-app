// Vercel entrypoint.
//
// Keep the slim serverless bundle for stable startup, but make sure it mounts
// the live route groups that the readiness gate expects.

module.exports = require('../backend/api/index-serverless.js');
