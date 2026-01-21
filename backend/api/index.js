const express = require('express');
const helmet = require('helmet');
const Sentry = require('@sentry/node');
const SentryTracing = require('@sentry/tracing');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
let MongoMemoryServer;

// Load environment variables
dotenv.config();

// Validate critical env and mark API readiness (fail-safe in production)
function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (isProd && !process.env.MONGODB_URI) missing.push('MONGODB_URI');
  if (missing.length) {
    const msg = `Missing env: ${missing.join(', ')}`;
    console.warn('⚠️ Env validation:', msg);
    process.env.API_READY = 'false';
  } else {
    process.env.API_READY = 'true';
  }
}
validateEnv();

// Initialize Express app
const app = express();

// Trust proxy for correct client IPs behind Vercel/reverse proxy
app.set('trust proxy', 1);

// Security headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // Will tighten in Phase 3.13.2
}));

// Body size limits (before routes)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting
const { generalLimiter, authLimiter, checkoutLimiter, webhookLimiter } = require('../middleware/rateLimit');
app.use('/', generalLimiter);

// --- Sentry Monitoring ---
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.SENTRY_RELEASE,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: 0.5,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new SentryTracing.Integrations.Express({ app }),
    ],
    beforeSend(event) {
      // Scrub PII/tokens/admin codes from event data
      function scrub(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        for (const key of Object.keys(obj)) {
          if (/token|authorization|jwt|admin/i.test(key)) {
            obj[key] = '[Filtered]';
          } else if (typeof obj[key] === 'object') {
            scrub(obj[key]);
          }
        }
        return obj;
      }
      if (event.request) scrub(event.request.headers);
      if (event.request) scrub(event.request.data);
      if (event.user) scrub(event.user);
      if (event.extra) scrub(event.extra);
      if (event.breadcrumbs) event.breadcrumbs.forEach(b => scrub(b));
      return event;
    },
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// --- Robust CORS Setup ---

// Stripe webhook: use express.raw for signature verification (body limit handled by Stripe)
const stripeWebhookPath = "/webhooks/stripe";
app.use((req, res, next) => {
  if (req.originalUrl === stripeWebhookPath) {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    next();
  }
});
// Apply stricter rate limiters to sensitive routes
app.use('/admin', authLimiter);
app.use('/orders', authLimiter);
app.use('/checkout', checkoutLimiter);
app.use('/webhooks', webhookLimiter);
const allowed = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://pvabazaar.org',
  'https://www.pvabazaar.org',
  // Add more as needed
  ...((process.env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean))
];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Code'],
};

app.use(require('cors')(corsOptions));
app.options("*", require('cors')(corsOptions));

// Ensure CORS headers on all responses (including errors)
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (!origin || allowed.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin || 'https://pvabazaar.org');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Code');
  }
  next();
});
// If API is not ready (e.g., missing secrets in production), return 503 for most endpoints
app.use((req, res, next) => {
  const apiNotReady = process.env.API_READY === 'false';
  const isProd = process.env.NODE_ENV === 'production';
  const allowlist = ['/health', '/dev/token', '/ping', '/version', '/express-ping'];
  if (apiNotReady && isProd && !allowlist.some(p => req.path.startsWith(p))) {
    return res.status(503).json({ ok: false, message: 'Service not configured. Missing environment secrets.' });
  }
  next();
});

// Stripe webhook route (must come after raw body middleware)
const webhooksStripeRoutes = require('../routes/webhooksStripe');
app.use('/webhooks', webhooksStripeRoutes);

// Connect to MongoDB - optimized for serverless with global caching
// Use global to persist connection across serverless function invocations
global._mongooseConn = global._mongooseConn || { conn: null, promise: null };

async function connectToDatabase() {
  // Return cached connection if available
  if (global._mongooseConn.conn) {
    return global._mongooseConn.conn;
  }

  // If a connection is in progress, wait for it
  if (global._mongooseConn.promise) {
    global._mongooseConn.conn = await global._mongooseConn.promise;
    return global._mongooseConn.conn;
  }

  try {
    // Start new connection
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/pva-bazaar';

    console.log('🔌 Connecting to MongoDB...');

    // Set timeouts for serverless environment
    global._mongooseConn.promise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      maxPoolSize: 10,
      autoIndex: process.env.NODE_ENV !== 'production', // Don't build indexes in prod
    });

    global._mongooseConn.conn = await global._mongooseConn.promise;
    console.log('✅ MongoDB connected');
    return global._mongooseConn.conn;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

// Middleware: Ensure DB connection for routes that need it
app.use(async (req, res, next) => {
  // Skip DB connection for health/ping endpoints
  const skipPaths = ['/health', '/ping', '/version', '/express-ping', '/dev/token'];
  if (skipPaths.some(p => req.path === p)) {
    return next();
  }

  // Connect to DB for all other routes
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    res.status(503).json({ ok: false, message: 'Database connection failed', error: err.message });
  }
});

// Import routes
const artifactsRoutes = require('../routes/artifacts');
const usersRoutes = require('../routes/users');
const authRoutes = require('../routes/auth');
const blockchainRoutes = require('../routes/blockchain');
const certificatesRoutes = require('../routes/certificates');
const healthRoutes = require('../routes/health');
const searchRoutes = require('../routes/search');
const transactionsRoutes = require('../routes/transactions');
const dashboardRoutes = require('../routes/dashboard');
const marketRoutes = require('../routes/market');
const portfolioRoutes = require('../routes/portfolio');
const activityRoutes = require('../routes/activity'); // Import activity routes
const pagesRoutes = require('../routes/pages');
const blogsRoutes = require('../routes/blogs');
const commentsRoutes = require('../routes/comments');
const contributeRoutes = require('../routes/contribute');
const partnersRoutes = require('../routes/partners');
const adminRoutes = require('../routes/admin');
const archiveRoutes = require('../routes/archive');
const checkoutRoutes = require('../routes/checkout');
const ordersRoutes = require('../routes/orders');
const itemsRoutes = require('../routes/items');
// Secure admin login endpoint
const adminLoginRoutes = require('../routes/adminLogin');
// Models for optional seeding
const Artifact = require('../models/Artifact');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Legacy gating middleware - returns 410 Gone when LEGACY_MODE !== 'true'
function legacyGate(req, res, next) {
  if (process.env.LEGACY_MODE === 'true') {
    return next();
  }
  res.status(410).json({
    ok: false,
    message: 'This endpoint is part of legacy marketplace features and has been retired.',
    migration: 'For current journal/archive APIs, see /api/blogs, /api/pages, /api/archive',
  });
}

// Set LEGACY_MODE default
if (!process.env.LEGACY_MODE) {
  process.env.LEGACY_MODE = 'false';
}
console.log('🔒 LEGACY_MODE:', process.env.LEGACY_MODE);

// Use routes - JOURNAL/BLOG (always active)
app.use('/health', healthRoutes);
app.use('/blogs', blogsRoutes);
app.use('/pages', pagesRoutes);
app.use('/comments', commentsRoutes);
app.use('/search', searchRoutes);
app.use('/admin', adminLoginRoutes); // Mount admin login route first
app.use('/admin', adminRoutes);
app.use('/archive', archiveRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/orders', ordersRoutes);
app.use('/items', itemsRoutes);
app.use('/contribute', contributeRoutes);
app.use('/partners', partnersRoutes);
app.use('/users', usersRoutes);
app.use('/auth', authRoutes);

// LEGACY MARKETPLACE (gated by LEGACY_MODE flag)
app.use('/artifacts', legacyGate, artifactsRoutes);
app.use('/market', legacyGate, marketRoutes);
app.use('/marketplace', legacyGate, marketRoutes);
app.use('/categories', legacyGate, marketRoutes);
app.use('/transactions', legacyGate, transactionsRoutes);
app.use('/portfolio', legacyGate, portfolioRoutes);
app.use('/blockchain', legacyGate, blockchainRoutes);
app.use('/api/certificates', legacyGate, certificatesRoutes);
app.use('/api/dashboard', legacyGate, dashboardRoutes);
app.use('/api/activity', legacyGate, activityRoutes);

// Dev-only: issue a token for quick testing
app.post('/api/dev/token', (req, res) => {
  if (process.env.NODE_ENV !== 'development') return res.status(404).end();
  if (req.body?.secret !== process.env.ADMIN_SECRET_CODE)
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  const id = req.body.userId || 'dev-user-id';
  const token = jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET);
  res.json({ ok: true, token });
});

// Version endpoint - shows deployed git commit
app.get('/api/version', (req, res) => {
  res.json({
    ok: true,
    sha: '4f443b9b29d51e45eb4c5423ebfcfa1920873979',
    shortSha: '4f443b9',
    message: 'fix: Remove eager DB connection on module load, add /api/ping endpoint',
    timestamp: new Date().toISOString(),
  });
});

// Express ping - guaranteed fast, no DB
app.get('/api/express-ping', (req, res) => {
  res.json({ ok: true, source: 'express' });
});

// Instant health check (no DB connection)
app.get('/api/ping', (req, res) => {
  res.setHeader('X-App-Version', '4f443b9');
  res.json({
    ok: true,
    message: 'API is responding',
    timestamp: new Date().toISOString(),
    version: '1.0.1',
  });
});

// Health endpoint - returns quickly even if DB is unreachable
app.get('/api/health', async (req, res) => {
  let mongoConnected = false;
  let dbError = null;

  try {
    // Attempt to connect with timeout protection
    const connectPromise = connectToDatabase();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    mongoConnected = mongoose.connection.readyState === 1;
  } catch (err) {
    dbError = err.message;
    console.warn('⚠️ Health check DB connection failed:', dbError);
  }

  // Prepare allowed origins for display (safe - no secrets)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://pvabazaar.org',
    'https://www.pvabazaar.org',
  ];
  if (process.env.ALLOWED_ORIGIN) {
    const additionalOrigins = process.env.ALLOWED_ORIGIN
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);
    allowedOrigins.push(...additionalOrigins);
  }

  // Always return 200 with status info
  res.json({
    ok: true,
    message: 'PVABazaar API is running',
    mongo: mongoConnected,
    ready: process.env.API_READY !== 'false' && mongoConnected,
    nodeEnv: process.env.NODE_ENV || 'development',
    allowedOrigins: allowedOrigins,
    timestamp: new Date().toISOString(),
    ...(dbError && { dbError }),
  });
});


// Sentry error handler (must be before any other error middleware)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.stack);
  // Ensure CORS headers are present on error responses
  const origin = req.get('origin');
  const allowed = getAllowedOrigins();
  if (!origin || allowed.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin || 'https://pvabazaar.org');
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  res.status(500).json({
    ok: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  // Ensure CORS headers are present on 404 responses
  const origin = req.get('origin');
  const allowed = getAllowedOrigins();
  if (!origin || allowed.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin || 'https://pvabazaar.org');
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  
  res.status(404).json({
    ok: false,
    message: 'API endpoint not found',
  });
});

// Don't initialize connection on module load - let routes connect lazily
// This prevents serverless timeout on cold starts if DB is unreachable
// connectToDatabase();  // REMOVED - connections happen on-demand

// Dev auto-seed: populate a default admin and sample artifacts when using memory DB
async function autoSeed() {
  try {
    const enable =
      (process.env.DEV_AUTO_SEED === 'true' || process.env.USE_MEMORY_DB === 'true') &&
      process.env.NODE_ENV !== 'production';
    if (!enable) return;
    // Ensure connection is fully ready before seeding to avoid bufferCommands warnings
    await connectToDatabase();
    if ((await Artifact.estimatedDocumentCount()) > 0) return;

    console.log('🌱 Seeding dev database...');
    let admin = await User.findOne({ email: 'admin@pvabazaar.org' });
    if (!admin) {
      admin = new User({ name: 'PVA Admin', email: 'admin@pvabazaar.org', password: 'admin123' });
      await admin.save();
      console.log('✅ Admin user created: admin@pvabazaar.org / admin123');
    }

    const sampleArtifacts = [
      {
        name: 'Maradjet Emerald Pendant',
        title: 'Handcrafted Emerald Pendant',
        description:
          'A stunning emerald pendant featuring natural Panjshir emerald set in 18k gold',
        imageUrl:
          'https://i2.seadn.io/base/0x3b3af296e521a0932041cc5599ea47ec2d4ef8a5/ab0864492d648de4434dd73c10970a/04ab0864492d648de4434dd73c10970a.jpeg?w=1000',
        price: 1200,
        category: 'Jewelry',
        materials: ['Panjshir Emerald', '18k Gold'],
        artisan: 'PVA Master Craftsman',
        creator: admin._id,
        physicalSerial: 'PVA-0001',
        fractionalization: {
          enabled: true,
          totalShares: 5000,
          sharePrice: 1,
          soldShares: 0,
          majorityThreshold: 2600,
        },
      },
      {
        name: 'Traditional Afghan Carpet',
        title: 'Hand-woven Afghan Carpet',
        description:
          'Traditional Afghan carpet with intricate geometric patterns, hand-woven by master craftsmen',
        imageUrl: 'https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Afghan+Carpet',
        price: 2500,
        category: 'Textiles',
        materials: ['Wool', 'Natural Dyes'],
        artisan: 'Herat Weavers Guild',
        creator: admin._id,
        physicalSerial: 'PVA-0002',
        fractionalization: {
          enabled: true,
          totalShares: 10000,
          sharePrice: 0.25,
          soldShares: 0,
          majorityThreshold: 5100,
        },
      },
    ];
    await Artifact.insertMany(sampleArtifacts);
    console.log(`✅ Seeded ${sampleArtifacts.length} artifacts`);
  } catch (e) {
    console.warn('⚠️ Auto-seed skipped:', e?.message || e);
  }
}

// Export for Vercel serverless
module.exports = app;

// Also export connectToDatabase for tests
module.exports.connectToDatabase = connectToDatabase;

// Start the server only when run directly (local dev)
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  connectToDatabase()
    .then(() => autoSeed())
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    });
}
