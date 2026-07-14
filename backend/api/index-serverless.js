const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');
const { getBuildInfo } = require('../lib/buildInfo');
const { connectMongo, getMongoState } = require('../lib/mongoConnection');

// Force deployment to pick up MongoDB connection fix

if (process.env.RENDER !== 'true') {
  dotenv.config({ override: false });
}

const app = express();
app.set('trust proxy', 1);

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

// CORS - restrict to specific origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'https://pvabazaar.org'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow requests with no origin (mobile apps, curl)
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
}));
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

app.use(async (req, res, next) => {
  res.setHeader('Vary', 'Origin');
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
  next();
});

app.get('/api/health', async (_req, res) => {
  const build = getBuildInfo();
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

  // Attempt a direct connection to get the raw error, bypassing all cached state.
  let dbDiag = {
    mode: 'unknown',
    hasEnvUri: Boolean(mongoUri),
    readyState: 0,
    error: null,
  };

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
      await freshConn.close().catch(() => {});
    } catch (err) {
      dbDiag.mode = 'error';
      dbDiag.readyState = 0;
      dbDiag.connected = false;
      // Redact password from error message
      const raw = err.message || String(err);
      dbDiag.error = raw.replace(/(?<=:\/\/[^:]+:)[^@]+(?=@)/g, '***');
      await freshConn.close().catch(() => {});
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

// Note: /api/health is handled by the inline handler above.
// The health route module is intentionally not mounted here to avoid
// the warm-instance global state cache masking real connection errors.

app.get('/api/ping', (_req, res) => {
  const build = getBuildInfo();
  res.status(200).json({ ok: true, message: 'pong', timestamp: new Date().toISOString(), version: build.version, sha: build.sha, shortSha: build.shortSha });
});

app.get('/api/version', (_req, res) => {
  const build = getBuildInfo();
  res.status(200).json({ ok: true, ...build, timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found' });
});

module.exports = app;
