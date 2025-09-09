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

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB - optimized for serverless
let cachedDb = null;
let connecting = null;

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

  // Try Atlas/remote, then fall back to memory in non-production
  try {
    if (mongoose.connection.readyState === 1) {
      cachedDb = mongoose.connection;
      return cachedDb;
    }
    const client = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'pvabazaar',
      bufferCommands: false,
      autoIndex: true
    });
    console.log('✅ MongoDB Connected successfully');
    cachedDb = client;
    return client;
  } catch (err) {
    if (!isProd) {
      console.warn('⚠️ MongoDB Atlas connection failed, falling back to in-memory for dev...', err?.message || err);
      try {
        connecting = startMemory().finally(() => { connecting = null; });
        return await connecting;
      } catch (memErr) {
        console.error('❌ Failed to start in-memory MongoDB:', memErr);
        throw err;
      }
    }
    // In production, do not silently fall back; rethrow to fail fast
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
// Models for optional seeding
const Artifact = require('../models/Artifact');
const User = require('../models/user');
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

// Dev-only: issue a token for quick testing
app.post('/api/dev/token', (req, res) => {
  if (process.env.NODE_ENV !== 'development') return res.status(404).end();
  if (req.body?.secret !== process.env.ADMIN_SECRET_CODE) return res.status(401).json({ ok: false, message: 'Unauthorized' });
  const id = req.body.userId || 'dev-user-id';
  const token = jwt.sign({ id }, process.env.JWT_SECRET);
  res.json({ ok: true, token });
});

// Health endpoint
app.get('/api/health', async (req, res) => {
  await connectToDatabase();
  res.json({
    ok: true,
    message: 'PVABazaar API is running',
    mongo: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.stack);
  res.status(500).json({
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