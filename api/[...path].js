const express = require('express');

const { getBuildInfo } = require('../backend/lib/buildInfo');
const { connectMongo, getMongoState } = require('../backend/lib/mongoConnection');

const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

function forceMockDbMode() {
  // Only force mock when no URI is configured
  const hasMongoUri = Boolean(process.env.MONGODB_URI || process.env.DATABASE_URL);
  return process.env.VERCEL === '1' && !hasMongoUri;
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
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

  // Parse URI for diagnostics — never expose the password value.
  let uriDiag = { present: Boolean(mongoUri), username: null, host: null, passwordLength: null };
  if (mongoUri) {
    try {
      const parsed = new URL(mongoUri);
      uriDiag.username = parsed.username || null;
      uriDiag.host = parsed.hostname || null;
      uriDiag.passwordLength = parsed.password ? parsed.password.length : 0;
    } catch (_parseErr) {
      uriDiag.parseError = 'URI could not be parsed as a URL';
    }
  }

  // Use a fresh connection each time so cached global state cannot mask the real error.
  let dbDiag = {
    hasEnvUri: Boolean(mongoUri),
    mode: 'unknown',
    readyState: 0,
    connected: false,
    error: null,
    uri: uriDiag,
  };

  if (mongoUri) {
    const mongoose = require('mongoose');
    const freshConn = mongoose.createConnection();
    try {
      await Promise.race([
        freshConn.openUri(mongoUri, {
          serverSelectionTimeoutMS: 8000,
          connectTimeoutMS: 8000,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('health check connection timeout after 8s')), 8500)),
      ]);
      dbDiag.mode = 'mongo';
      dbDiag.readyState = freshConn.readyState;
      dbDiag.connected = true;
      await freshConn.close().catch(() => {});
    } catch (err) {
      dbDiag.mode = 'error';
      dbDiag.readyState = 0;
      dbDiag.connected = false;
      // Redact password from URI in error message before including it
      const raw = err.message || String(err);
      dbDiag.error = raw.replace(/(?<=:\/\/[^:]+:)[^@]+(?=@)/g, '***');
      await freshConn.close().catch(() => {});
    }
  } else {
    dbDiag.mode = 'mock';
  }

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
    database: dbDiag,
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

app.use('/api/health-check', lazyRouteFactory(loadHealthCheck));
app.use('/api/auth', lazyRouteFactory(loadAuth));
app.use('/api/book-publishing', lazyRouteFactory(loadBookPublishing));
app.use('/api/admin', lazyRouteFactory(loadAdminLogin));
app.use('/api/admin', lazyRouteFactory(loadAdmin));

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found' });
});

module.exports = app;
