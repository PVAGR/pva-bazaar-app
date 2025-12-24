const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
let MongoMemoryServer;

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Import middleware
const { 
  requestLogger, 
  errorLogger, 
  performanceMonitor, 
  metricsMiddleware, 
  getMetrics 
} = require('../middleware/logging');
const { 
  apiLimiter, 
  authLimiter, 
  healthLimiter,
  getRateLimitStats 
} = require('../middleware/rateLimit');

// Basic middleware
app.use(cors({
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://localhost:8081',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8081',
      ];
      if (process.env.ALLOWED_ORIGIN) allowed.push(process.env.ALLOWED_ORIGIN);
      if (process.env.PRODUCTION_DOMAIN) allowed.push(process.env.PRODUCTION_DOMAIN);
      // Allow requests with no origin (like curl or server-to-server)
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('CORS not allowed for origin: ' + origin));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging and monitoring middleware
app.use(performanceMonitor);
app.use(metricsMiddleware);
app.use(requestLogger);

// Connect to MongoDB - optimized for serverless with retry logic
let cachedDb = null;
let connecting = null;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Sleep function for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Connect to MongoDB with automatic retry and fallback mechanisms
 * Features:
 * - Connection pooling and caching
 * - Automatic retry on transient failures
 * - Graceful fallback to in-memory DB in development
 * - Connection state monitoring
 */
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  if (connecting) return connecting;

  const isProd = process.env.NODE_ENV === 'production';
  const preferMemory = !isProd && (process.env.USE_MEMORY_DB === 'true' || !process.env.MONGODB_URI);

  // Helper to start in-memory Mongo
  const startMemory = async () => {
    if (mongoose.connection.readyState === 1) {
      // Already connected
      return mongoose.connection;
    }
    if (!MongoMemoryServer) {
      ({ MongoMemoryServer } = require('mongodb-memory-server'));
    }
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const client = await mongoose.connect(uri, { dbName: 'pvabazaar', autoIndex: true });
    console.log('✅ Connected to in-memory MongoDB');
    cachedDb = client;
    return client;
  };

  if (preferMemory) {
    console.log('🧪 Using in-memory MongoDB (dev)');
    connecting = startMemory().finally(() => { connecting = null; });
    return connecting;
  }

  // Try Atlas/remote with retry logic
  const attemptConnection = async (attemptNum) => {
    try {
      if (mongoose.connection.readyState === 1) {
        cachedDb = mongoose.connection;
        return cachedDb;
      }
      
      console.log(`🔄 Attempting MongoDB connection (attempt ${attemptNum}/${MAX_RETRY_ATTEMPTS})...`);
      
      const client = await mongoose.connect(process.env.MONGODB_URI, {
        dbName: 'pvabazaar',
        bufferCommands: false,
        autoIndex: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: isProd ? 10 : 5,
        minPoolSize: isProd ? 2 : 1
      });
      
      console.log('✅ MongoDB Connected successfully');
      connectionAttempts = 0; // Reset counter on success
      cachedDb = client;
      return client;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attemptNum} failed:`, err?.message || err);
      
      if (attemptNum < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY_MS * attemptNum; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
        return attemptConnection(attemptNum + 1);
      }
      
      throw err;
    }
  };

  try {
    connecting = attemptConnection(1).finally(() => { connecting = null; });
    return await connecting;
  } catch (err) {
    if (!isProd) {
      console.warn('⚠️ MongoDB Atlas connection failed after retries, falling back to in-memory for dev...', err?.message || err);
      try {
        connecting = startMemory().finally(() => { connecting = null; });
        return await connecting;
      } catch (memErr) {
        console.error('❌ Failed to start in-memory MongoDB:', memErr);
        throw err;
      }
    }
    // In production, do not silently fall back; rethrow to fail fast
    console.error('🚨 CRITICAL: Production database connection failed after all retries');
    throw err;
  }
}

// Setup connection event handlers for monitoring
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🚨 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose disconnected from MongoDB');
  // Clear cache to force reconnection on next request
  cachedDb = null;
});

// Handle process termination gracefully
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error closing MongoDB connection:', err);
    process.exit(1);
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
// Models for optional seeding
const Artifact = require('../models/Artifact');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Apply rate limiting to routes
app.use('/api/artifacts', apiLimiter, artifactsRoutes);
app.use('/api/users', apiLimiter, usersRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/blockchain', apiLimiter, blockchainRoutes);
app.use('/api/certificates', apiLimiter, certificatesRoutes);
app.use('/api/health', healthLimiter, healthRoutes);
app.use('/api/search', apiLimiter, searchRoutes);
app.use('/api/transactions', apiLimiter, transactionsRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/market', apiLimiter, marketRoutes);
app.use('/api/marketplace', apiLimiter, marketRoutes); // alias for /api/marketplace/stats
app.use('/api/categories', apiLimiter, marketRoutes); // for /api/categories/counts
app.use('/api/portfolio', apiLimiter, portfolioRoutes);
app.use('/api/activity', apiLimiter, activityRoutes); // Register the new activity route

// Metrics endpoint (admin only or internal monitoring)
app.get('/api/metrics', (req, res) => {
  // Enhanced auth check with proper validation
  const authHeader = req.headers['x-metrics-key'];
  const expectedKey = process.env.METRICS_KEY || 'dev-metrics-key';
  
  // Validate auth header exists and matches
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ ok: false, message: 'Unauthorized: Missing authentication' });
  }
  
  // Use constant-time comparison to prevent timing attacks
  const authValid = authHeader.length === expectedKey.length && 
    authHeader.split('').every((char, i) => char === expectedKey[i]);
  
  if (!authValid) {
    console.warn(`⚠️ Unauthorized metrics access attempt from ${req.ip}`);
    return res.status(401).json({ ok: false, message: 'Unauthorized: Invalid authentication' });
  }

  const metrics = getMetrics();
  const rateLimitStats = getRateLimitStats();

  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    metrics: metrics,
    rateLimits: rateLimitStats,
    database: {
      connected: mongoose.connection.readyState === 1,
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  });
});

// Dev-only: issue a token for quick testing
app.post('/api/dev/token', (req, res) => {
  if (process.env.NODE_ENV !== 'development') return res.status(404).end();
  if (req.body?.secret !== process.env.ADMIN_SECRET_CODE) return res.status(401).json({ ok: false, message: 'Unauthorized' });
  const id = req.body.userId || 'dev-user-id';
  const token = jwt.sign({ id }, process.env.JWT_SECRET);
  res.json({ ok: true, token });
});

// Health endpoint (handled by healthRoutes but kept for backward compatibility)
app.get('/api/health', async (req, res) => {
  await connectToDatabase();
  res.json({
    ok: true,
    message: 'PVABazaar API is running',
    mongo: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString()
  });
});

// Error logging middleware (must be before error handler)
app.use(errorLogger);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.stack);
  res.status(err.status || 500).json({
    ok: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: 'API endpoint not found'
  });
});

// Initialize connection when the lambda first starts
connectToDatabase();

// Dev auto-seed: populate a default admin and sample artifacts when using memory DB
async function autoSeed() {
  try {
    const enable = (process.env.DEV_AUTO_SEED === 'true' || process.env.USE_MEMORY_DB === 'true') && process.env.NODE_ENV !== 'production';
    if (!enable) return;
    if (await Artifact.estimatedDocumentCount() > 0) return;

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
        description: 'A stunning emerald pendant featuring natural Panjshir emerald set in 18k gold',
        imageUrl: 'https://i2.seadn.io/base/0x3b3af296e521a0932041cc5599ea47ec2d4ef8a5/ab0864492d648de4434dd73c10970a/04ab0864492d648de4434dd73c10970a.jpeg?w=1000',
        price: 1200,
        category: 'Jewelry',
        materials: ['Panjshir Emerald', '18k Gold'],
        artisan: 'PVA Master Craftsman',
        creator: admin._id,
        physicalSerial: 'PVA-0001',
        fractionalization: { enabled: true, totalShares: 5000, sharePrice: 1, soldShares: 0, majorityThreshold: 2600 }
      },
      {
        name: 'Traditional Afghan Carpet',
        title: 'Hand-woven Afghan Carpet',
        description: 'Traditional Afghan carpet with intricate geometric patterns, hand-woven by master craftsmen',
        imageUrl: 'https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Afghan+Carpet',
        price: 2500,
        category: 'Textiles',
        materials: ['Wool', 'Natural Dyes'],
        artisan: 'Herat Weavers Guild',
        creator: admin._id,
        physicalSerial: 'PVA-0002',
        fractionalization: { enabled: true, totalShares: 10000, sharePrice: 0.25, soldShares: 0, majorityThreshold: 5100 }
      }
    ];
    await Artifact.insertMany(sampleArtifacts);
    console.log(`✅ Seeded ${sampleArtifacts.length} artifacts`);
  } catch (e) {
    console.warn('⚠️ Auto-seed skipped:', e?.message || e);
  }
}


// Export app for serverless adapters and tests
module.exports = { app, connectToDatabase };

// Start the server only when run directly (local dev)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectToDatabase().then(() => autoSeed()).finally(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  });
}