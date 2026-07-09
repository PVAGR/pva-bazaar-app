const express = require('express');

const { getBuildInfo } = require('../backend/lib/buildInfo');
const { connectMongo, getMongoState } = require('../backend/lib/mongoConnection');

const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

function forceMockDbMode() {
  return process.env.VERCEL === '1' && process.env.FORCE_REAL_DB !== 'true';
}

async function ensureDatabaseState() {
  if (forceMockDbMode()) {
    const state = getMongoState();
    return {
      ...state,
      mode: 'mock',
      connected: true,
      readyState: 1,
    };
  }

  try {
    await Promise.race([
      connectMongo({ logger: console }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000)),
    ]);
  } catch (error) {
    console.warn('⚠️ API DB bootstrap warning:', error.message);
  }

  return getMongoState();
}

function mountSharedMiddleware(req, res, next) {
  res.setHeader('Vary', 'Origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const origin = req.headers.origin || '';
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Code,Origin,X-Requested-With,Accept');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
}

app.use(mountSharedMiddleware);

app.get(['/api/health', '/health'], async (_req, res) => {
  const build = getBuildInfo();
  const mongoState = await ensureDatabaseState();
  res.status(200).json({
    ok: true,
    message: 'PVA Bazaar API is healthy!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    legacyMode: process.env.LEGACY_MODE === 'true',
    version: build.version,
    sha: build.sha,
    shortSha: build.shortSha,
    database: {
      mode: mongoState.mode,
      connected: mongoState.connected,
      readyState: mongoState.readyState,
      hasEnvUri: mongoState.hasEnvUri,
    },
  });
});

app.get(['/api/ping', '/ping'], (_req, res) => {
  const build = getBuildInfo();
  res.status(200).json({
    ok: true,
    message: 'pong',
    timestamp: new Date().toISOString(),
    version: build.version,
    sha: build.sha,
    shortSha: build.shortSha,
  });
});

app.get(['/api/version', '/version'], (_req, res) => {
  const build = getBuildInfo();
  res.status(200).json({ ok: true, ...build, timestamp: new Date().toISOString() });
});

function lazyRouteFactory(loader) {
  let cachedRouter = null;
  return async (req, res, next) => {
    try {
      if (!cachedRouter) {
        cachedRouter = await Promise.resolve(loader());
      }
      return cachedRouter(req, res, next);
    } catch (error) {
      console.error('Lazy route load failed:', error);
      return res.status(500).json({
        ok: false,
        error: 'Route initialization failed',
        message: error.message,
      });
    }
  };
}

const loadHealthCheck = () => require('../backend/routes/health-check');
const loadAuth = () => require('../backend/routes/auth');
const loadBookPublishing = () => require('../backend/routes/bookPublishing');
const loadAdminLogin = () => require('../backend/routes/adminLogin');
const loadAdmin = () => require('../backend/routes/admin');
const loadHealth = () => require('../backend/routes/health');

app.use('/api/health-check', lazyRouteFactory(loadHealthCheck));
app.use('/api/auth', lazyRouteFactory(loadAuth));
app.use('/api/book-publishing', lazyRouteFactory(loadBookPublishing));
app.use('/api/admin', lazyRouteFactory(loadAdminLogin));
app.use('/api/admin', lazyRouteFactory(loadAdmin));
app.use('/api/health', lazyRouteFactory(loadHealth));

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found' });
});

module.exports = app;
