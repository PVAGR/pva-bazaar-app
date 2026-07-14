const express = require('express');
const router = express.Router();
const { getBuildInfo } = require('../lib/buildInfo');
const { connectMongo, getMongoState } = require('../lib/mongoConnection');
const { getAuthStoreState } = require('../lib/mockUserStore');
const { getBookStoreState } = require('../lib/bookProjectStore');

// Import OpenClaw health check (optional dependency)
let getOpenClawHealth;
try {
  getOpenClawHealth = require('./openclaw').getOpenClawHealth;
} catch (err) {
  // OpenClaw module not available, skip integration
  getOpenClawHealth = null;
}

router.get('/', async (_req, res) => {
  // Health check: simple, no DB dependency
  const build = getBuildInfo();
  let mongoState = getMongoState();

  // Only skip connection attempt when there is no URI configured AND we are on Vercel.
  // If MONGODB_URI is present, always attempt/report the real connection state.
  const hasUri = mongoState.hasEnvUri;
  const onVercel = process.env.VERCEL === '1';
  const skipConnect = onVercel && !hasUri;

  if (!skipConnect) {
    try {
      await Promise.race([
        connectMongo({ logger: console }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000)),
      ]);
    } catch (err) {
      console.warn('⚠️ Health check DB connection failed:', err.message);
    }
    mongoState = getMongoState();
  }
  const authStoreState = await getAuthStoreState().catch(() => null);
  const bookStoreState = await getBookStoreState().catch(() => null);
  const effectiveDatabaseMode = mongoState.mode === 'mock' && authStoreState?.mode === 'file'
    ? 'file'
    : mongoState.mode;

  const dbBlock = {
    mode: effectiveDatabaseMode,
    connected: effectiveDatabaseMode === 'file' ? true : mongoState.connected,
    readyState: effectiveDatabaseMode === 'file' ? 1 : mongoState.readyState,
    hasEnvUri: mongoState.hasEnvUri,
    authStore: authStoreState,
    bookStore: bookStoreState,
  };
  if (effectiveDatabaseMode === 'error' && mongoState.lastError) {
    dbBlock.error = mongoState.lastError;
  }

  const response = {
    ok: true,
    message: 'PVA Bazaar API is healthy!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    legacyMode: process.env.LEGACY_MODE === 'true',
    version: build.version,
    sha: build.sha,
    shortSha: build.shortSha,
    database: dbBlock,
  };

  // Add OpenClaw status if available
  if (getOpenClawHealth) {
    try {
      response.openclaw = getOpenClawHealth();
    } catch (err) {
      response.openclaw = { 
        status: 'error', 
        message: `Health check failed: ${err.message}` 
      };
    }
  }

  res.status(200).json(response);
});

router.get('/ping', (req, res) => {
  // Simple ping endpoint for monitoring
  const build = getBuildInfo();
  res.setHeader('X-App-Version', build.shortSha);
  res.status(200).json({ ok: true, message: 'pong', timestamp: new Date().toISOString(), version: build.version, sha: build.sha, shortSha: build.shortSha });
});

router.get('/version', (req, res) => {
  const build = getBuildInfo();
  res.setHeader('X-App-Version', build.shortSha);
  res.status(200).json({ ok: true, ...build, timestamp: new Date().toISOString() });
});

module.exports = router;
