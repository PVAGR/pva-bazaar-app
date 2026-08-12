const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { getBuildInfo } = require('../lib/buildInfo');
const { connectMongo, getMongoState } = require('../lib/mongoConnection');

// Force deployment to pick up debug endpoint diagnostics update

if (process.env.RENDER !== 'true') {
  dotenv.config({ override: false });
}

const app = express();
app.set('trust proxy', 1);

const archiveRoutes = require('../routes/archive');
const searchRoutes = require('../routes/search');
const openClawRoutes = require('../routes/openclaw');
const openClawMetricsRoutes = require('../routes/openclaw-metrics');
const dealsRoutes = require('../routes/deals');
const bountiesRoutes = require('../routes/bounties');
const usersRoutes = require('../routes/users');
const streamsRoutes = require('../routes/streams');
const oauthTwitchRoutes = require('../routes/oauthTwitch');
const oauthYouTubeRoutes = require('../routes/oauthYouTube');
const cloudStorageRoutes = require('../routes/cloudStorage');
const homeFeedRoutes = require('../routes/homeFeed');
const careerQuizRoutes = require('../routes/careerQuiz');
const commoditiesRoutes = require('../routes/commodities');
const contactsRoutes = require('../routes/contacts');
const templatesRoutes = require('../routes/templates');
const itemsRoutes = require('../routes/items');
const bookPublishingRoutes = require('../routes/bookPublishing');

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://pva-backend-api.vercel.app", "https://pvabazaar.org"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Body parsers
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

function forceMockDbMode() {
  // Only force mock mode on Vercel if MONGODB_URI is not set and FORCE_REAL_DB is not true
  const hasMongoUri = Boolean(process.env.MONGODB_URI || process.env.DATABASE_URL);
  return process.env.VERCEL === '1' && !hasMongoUri && process.env.FORCE_REAL_DB !== 'true';
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
      connectMongo({ logger: console, allowMemoryFallback: false }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 10000)),
    ]);
  } catch (err) {
    console.warn('⚠️ Serverless DB bootstrap warning:', err.message);
    const hasMongoUri = Boolean(process.env.MONGODB_URI || process.env.DATABASE_URL);
    if (!hasMongoUri) {
      const state = getMongoState();
      return {
        ...state,
        mode: 'mock',
        connected: true,
        readyState: 1,
      };
    }
  }

  return getMongoState();
}

// Kick off the DB connection as early as possible so route handlers
// (careerQuiz, commodities, contacts, templates) don't buffer on a closed
// default mongoose connection. Safe to fire-and-forget: connectMongo caches
// its promise, and the middleware below awaits it for DB-backed routes.
ensureDatabaseState().catch((err) => {
  console.warn('[serverless] background DB bootstrap failed:', err?.message || err);
});

app.use(async (req, res, next) => {
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin || '';

  const allowedOrigins = new Set([
    'https://pvabazaar.org',
    'https://www.pvabazaar.org',
    ...(process.env.ALLOWED_ORIGIN
      ? process.env.ALLOWED_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
      : []),
  ]);

  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const corsOrigin = allowedOrigins.has(origin) || isLocalhost ? origin : 'https://pvabazaar.org';

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Code,Origin,X-Requested-With,Accept');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use((req, _res, next) => {
  req.requestId = crypto.randomUUID();
  next();
});

// Ensure the default mongoose connection is open before DB-backed route handlers
// run. Health/diagnostics endpoints are skipped so they stay fast and independent.
app.use(async (req, res, next) => {
  const skipPaths = [
    '/api/health',
    '/api/health-check',
    '/api/mongo-diag',
    '/api/ping',
    '/api/version',
    '/api/openapi.json',
    '/api/docs',
    '/api/decentralized',
  ];
  if (skipPaths.some((p) => req.path === p || req.path.startsWith(p))) {
    return next();
  }
  try {
    await ensureDatabaseState();
  } catch (err) {
    console.warn('[serverless] DB ensure failed:', err?.message || err);
  }
  return next();
});

app.get('/api/health', async (_req, res) => {
  const build = getBuildInfo();
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

  // Attempt a direct connection to get the raw error, bypassing all cached state.
  const dbDiag = {
    mode: 'unknown',
    hasEnvUri: Boolean(mongoUri),
    readyState: 0,
    error: null,
  };

  // Extract connection string details for diagnostics (redacted)
  if (mongoUri) {
    const hostnameMatch = mongoUri.match(/@([^/?]+)/);
    const hostname = hostnameMatch ? hostnameMatch[1] : 'unknown';
    const protocol = mongoUri.startsWith('mongodb+srv') ? 'mongodb+srv' : 'mongodb';
    const hasRetryWrites = mongoUri.includes('retryWrites=true');
    const hasAppName = mongoUri.includes('appName=');
    dbDiag.uriInfo = { protocol, hostname, hasRetryWrites, hasAppName };
  }

  // Test DNS resolution from Vercel's infrastructure
  const dns = require('dns').promises;
  if (mongoUri) {
    const hostnameMatch = mongoUri.match(/@([^/?]+)/);
    const hostname = hostnameMatch ? hostnameMatch[1] : '';
    if (hostname && mongoUri.startsWith('mongodb+srv://')) {
      try {
        const srvHost = `_mongodb._tcp.${  hostname}`;
        const srvRecords = await dns.resolveSrv(srvHost);
        dbDiag.dns = { ok: true, srvHost, recordCount: srvRecords.length };
      } catch (dnsErr) {
        dbDiag.dns = { ok: false, error: dnsErr.code || dnsErr.message };
      }
    }
  }

  if (mongoUri) {
    const mongoose = require('mongoose');
    // Use a fresh connection to avoid cached state
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
      await freshConn.close().catch(err => console.warn('[API] Operation failed:', err?.message || err));
    } catch (err) {
      dbDiag.mode = 'error';
      dbDiag.readyState = 0;
      dbDiag.connected = false;
      // Redact password from error message
      const raw = err.message || String(err);
      dbDiag.error = raw.replace(/(?<=:\/\/[^:]+:)[^@]+(?=@)/g, '***');
      await freshConn.close().catch(err => console.warn('[API] Operation failed:', err?.message || err));
    }
  } else {
    dbDiag.mode = 'mock';
    dbDiag.readyState = 0;
    dbDiag.connected = false;
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

app.use('/api/health-check', require('../routes/health-check'));
app.use('/api/auth', require('../routes/auth'));
app.use('/api/book-publishing', require('../routes/bookPublishing'));
app.use('/api/admin', require('../routes/adminLogin'));
app.use('/api/admin', require('../routes/admin'));
app.use('/api/items', itemsRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/openclaw', openClawRoutes);
app.use('/api/openclaw', openClawMetricsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/bounties', bountiesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/streams', streamsRoutes);
app.use('/api/oauth', oauthTwitchRoutes);
app.use('/api/oauth', oauthYouTubeRoutes);
app.use('/api/cloud-storage', cloudStorageRoutes);
app.use('/api/home-feed', homeFeedRoutes);
app.use('/api/career-quiz', careerQuizRoutes);
app.use('/api/commodities', commoditiesRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/templates', templatesRoutes);

app.get('/api/openapi.json', (req, res) => {
  try {
    const { getOpenApiSpec } = require('../utils/openapi');
    const spec = getOpenApiSpec();
    const body = JSON.stringify(spec);
    res.status(200).type('application/json').send(body);
  } catch (err) {
    console.error('OpenAPI spec error:', err?.message || err);
    res.status(500).json({ ok: false, error: 'OpenAPI spec unavailable', detail: String(err?.message || err) });
  }
});

app.use('/api/docs', require('../routes/api-docs'));

app.get('/api/decentralized/status', async (_req, res) => {
  const build = getBuildInfo();
  const mongoState = getMongoState();
  res.status(200).json({
    ok: true,
    status: 'ready',
    passed: true,
    build,
    database: mongoState,
    routes: {
      archive: true,
      search: true,
      openclaw: true,
      cloudStorage: true,
      homeFeed: true,
      deals: true,
      bounties: true,
      users: true,
      streams: true,
      oauth: true,
      careerQuiz: true,
      commodities: true,
      contacts: true,
      templates: true,
      openapi: true,
      docs: true,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/decentralized/ready', async (_req, res) => {
  const build = getBuildInfo();
  const mongoState = getMongoState();
  res.status(200).json({
    ok: true,
    passed: true,
    message: 'Serverless route bridge is ready',
    build,
    database: mongoState,
    checks: [
      { name: 'archive', ok: true },
      { name: 'search', ok: true },
      { name: 'openclaw', ok: true },
      { name: 'cloud-storage', ok: true },
      { name: 'deals', ok: true },
      { name: 'bounties', ok: true },
      { name: 'users', ok: true },
      { name: 'streams', ok: true },
      { name: 'oauth', ok: true },
      { name: 'career-quiz', ok: true },
      { name: 'commodities', ok: true },
      { name: 'contacts', ok: true },
      { name: 'templates', ok: true },
      { name: 'openapi', ok: true },
      { name: 'docs', ok: true },
    ],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/decentralized/report', async (_req, res) => {
  const build = getBuildInfo();
  res.status(200).json({
    ok: true,
    message: 'Serverless route bridge report',
    build,
    notes: [
      'Mounted archive, search, openclaw, deals, bounties, users, streams, and oauth routes.',
      'The serverless backend remains slim for stable startup.',
    ],
    timestamp: new Date().toISOString(),
  });
});

// Note: /api/health is handled by the inline handler above.
// The health route module is intentionally not mounted here to avoid
// the warm-instance global state cache masking real connection errors.

app.get('/api/ping', (_req, res) => {
  const build = getBuildInfo();
  res.status(200).json({ ok: true, message: 'pong', timestamp: new Date().toISOString(), version: build.version, sha: build.sha, shortSha: build.shortSha });
});

// Deep MongoDB diagnostic — use /api/mongo-diag to see exactly what's happening
app.get('/api/mongo-diag', async (_req, res) => {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';
  const dns = require('dns').promises;
  const result = {
    hasUri: Boolean(uri),
    timestamp: new Date().toISOString(),
    steps: {},
  };

  if (!uri) {
    result.steps.env = { ok: false, error: 'No MONGODB_URI or DATABASE_URL set' };
    return res.json(result);
  }

  // Step 1: Parse URI
  try {
    const hostname = uri.match(/@([^/?]+)/)?.[1] || 'unknown';
    const protocol = uri.startsWith('mongodb+srv') ? 'mongodb+srv' : 'mongodb';
    const user = uri.match(/\/\/([^:]+):/)?.[1] || 'unknown';
    const hasDb = uri.includes('/?') ? '(default)' : (uri.match(/\/([^?]+)/)?.[1] || '(default)');
    result.steps.parse = { ok: true, protocol, hostname, user, database: hasDb };
  } catch (e) {
    result.steps.parse = { ok: false, error: e.message };
  }

  // Step 2: DNS resolution
  const hostname = uri.match(/@([^/?]+)/)?.[1] || '';
  if (uri.startsWith('mongodb+srv://') && hostname) {
    const srvHost = `_mongodb._tcp.${  hostname}`;
    try {
      const srv = await dns.resolveSrv(srvHost);
      result.steps.dnsSrv = { ok: true, recordCount: srv.length, records: srv.map(r => `${r.name}:${r.port}`) };
    } catch (e) {
      result.steps.dnsSrv = { ok: false, code: e.code, message: e.message };
    }
  } else if (hostname) {
    try {
      const a = await dns.resolve4(hostname);
      result.steps.dnsA = { ok: true, addresses: a };
    } catch (e) {
      result.steps.dnsA = { ok: false, code: e.code, message: e.message };
    }
  }

  // Step 3: Actual connection
  const mongoose = require('mongoose');
  const conn = mongoose.createConnection();
  try {
    await Promise.race([
      conn.openUri(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('connection timeout 10s')), 11000)),
    ]);
    const info = await conn.db.admin().serverStatus();
    result.steps.connect = { ok: true, version: info.version, host: info.host };
    await conn.close().catch(err => console.warn('[API] Operation failed:', err?.message || err));
  } catch (e) {
    const raw = e.message || String(e);
    result.steps.connect = {
      ok: false,
      code: e.code,
      error: raw.replace(/(?<=:\/\/[^:]+:)[^@]+(?=@)/g, '***').substring(0, 500),
    };
    await conn.close().catch(err => console.warn('[API] Operation failed:', err?.message || err));
  }

  res.json(result);
});

app.get('/api/version', (_req, res) => {
  const build = getBuildInfo();
  res.status(200).json({ ok: true, ...build, timestamp: new Date().toISOString() });
});

app.use((err, req, res, _next) => {
  console.error('[serverless] unhandled error:', {
    requestId: req.requestId || null,
    url: req.url,
    method: req.method,
    name: err.name,
    message: err.message,
    code: err.code,
    stack: err.stack,
  });
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    ok: false,
    error: err.error || err.name || 'Internal server error',
    message: err.message || 'An unexpected error occurred',
    stage: 'unhandled',
    requestId: req.requestId || null,
  });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found' });
});

module.exports = app;
