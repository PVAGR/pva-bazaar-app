const express = require('express');
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

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (process.env.ALLOW_ALL_ORIGINS === 'true') return callback(null, true);
      const allowed = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://localhost:8081',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8081',
        'https://pvabazaar.org',
        'https://www.pvabazaar.org',
      ];
      if (process.env.ALLOWED_ORIGIN) allowed.push(process.env.ALLOWED_ORIGIN);
      // Allow requests with no origin (like curl or server-to-server)
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('CORS not allowed for origin: ' + origin));
    },
    credentials: true,
  }),
);
// If API is not ready (e.g., missing secrets in production), return 503 for most endpoints
app.use((req, res, next) => {
  const apiNotReady = process.env.API_READY === 'false';
  const isProd = process.env.NODE_ENV === 'production';
  const allowlist = ['/api/health', '/api/dev/token'];
  if (apiNotReady && isProd && !allowlist.some(p => req.path.startsWith(p))) {
    return res.status(503).json({ ok: false, message: 'Service not configured. Missing environment secrets.' });
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB - optimized for serverless with global caching
// Use global to persist connection across serverless function invocations
global._mongooseConn = global._mongooseConn || { conn: null, promise: null };

async function connectToDatabase() {
  // Return cached connection if available
  if (global._mongooseConn.conn) {
    return global._mongooseConn.conn;
  }

  // Return in-flight connection promise if connecting
  if (global._mongooseConn.promise) {
    return global._mongooseConn.promise;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const preferMemory =
    process.env.USE_MEMORY_DB === 'true' || (!isProd && !process.env.MONGODB_URI);

  // Helper to start in-memory Mongo (dev only)
  const startMemory = async () => {
    if (mongoose.connection.readyState === 1) {
      global._mongooseConn.conn = mongoose.connection;
      return global._mongooseConn.conn;
    }
    if (!MongoMemoryServer) {
      ({ MongoMemoryServer } = require('mongodb-memory-server'));
    }
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const client = await mongoose.connect(uri, { 
      dbName: 'pvabazaar', 
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to in-memory MongoDB');
    global._mongooseConn.conn = client;
    return client;
  };

  if (preferMemory) {
    console.log('🧪 Using in-memory MongoDB (dev)');
    global._mongooseConn.promise = startMemory()
      .then(conn => {
        global._mongooseConn.promise = null;
        return conn;
      })
      .catch(err => {
        global._mongooseConn.promise = null;
        throw err;
      });
    return global._mongooseConn.promise;
  }

  // Production: Connect to MongoDB Atlas with explicit timeouts
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      global._mongooseConn.conn = mongoose.connection;
      return global._mongooseConn.conn;
    }

    console.log('🔗 Connecting to MongoDB Atlas...');
    
    // Create connection promise with timeouts
    global._mongooseConn.promise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'pvabazaar',
      autoIndex: false, // Disable in production for faster startup
      serverSelectionTimeoutMS: 5000, // Fail fast if server unreachable
      connectTimeoutMS: 10000, // 10s to establish connection
      socketTimeoutMS: 20000, // 20s for socket operations
      maxPoolSize: 10, // Connection pool size
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
    })
    .then(client => {
      console.log('✅ MongoDB Atlas connected successfully');
      global._mongooseConn.conn = client;
      global._mongooseConn.promise = null;
      return client;
    })
    .catch(err => {
      console.error('❌ MongoDB connection failed:', err.message);
      global._mongooseConn.promise = null;
      throw err;
    });

    return global._mongooseConn.promise;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

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
// Models for optional seeding
const Artifact = require('../models/Artifact');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Use routes
app.use('/api/artifacts', artifactsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/marketplace', marketRoutes); // alias for /api/marketplace/stats
app.use('/api/categories', marketRoutes); // for /api/categories/counts
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/activity', activityRoutes); // Register the new activity route
app.use('/api/pages', pagesRoutes);
app.use('/api/blogs', blogsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/contribute', contributeRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/archive', archiveRoutes);

// Dev-only: issue a token for quick testing
app.post('/api/dev/token', (req, res) => {
  if (process.env.NODE_ENV !== 'development') return res.status(404).end();
  if (req.body?.secret !== process.env.ADMIN_SECRET_CODE)
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  const id = req.body.userId || 'dev-user-id';
  const token = jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET);
  res.json({ ok: true, token });
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

  // Always return 200 with status info
  res.json({
    ok: true,
    message: 'PVABazaar API is running',
    mongo: mongoConnected,
    ready: process.env.API_READY !== 'false' && mongoConnected,
    timestamp: new Date().toISOString(),
    ...(dbError && { dbError }),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.stack);
  res.status(500).json({
    ok: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: 'API endpoint not found',
  });
});

// Initialize connection when the lambda first starts
connectToDatabase();

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

// Export app for serverless adapters and tests
module.exports = { app, connectToDatabase };

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
