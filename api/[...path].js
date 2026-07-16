// Vercel entrypoint.
//
// The strict live-readiness checks expect the full Express surface, including
// archive, search, deals, bounties, users, streams, OpenClaw, and OAuth
// routes. The lightweight serverless app omits those on purpose, so we force
// the full Express bundle here for the live Vercel backend.

if (process.env.VERCEL === '1') {
  process.env.FORCE_FULL_EXPRESS = 'true';
}

module.exports = require('../backend/api/index.js');
