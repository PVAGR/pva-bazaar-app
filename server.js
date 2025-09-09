const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Import analytics middleware
const { trackApiUsage, trackApiErrors } = require('./backend/middleware/analytics');

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add API usage tracking middleware to all routes
app.use('/api', trackApiUsage);

// Connect to MongoDB - with connection caching for serverless
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  try {
    const client = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'pvabazaar',
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    cachedDb = client;
    console.log('✅ MongoDB Connected successfully');
    return cachedDb;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    throw err;
  }
}

// Connect on startup for non-serverless environments
if (process.env.NODE_ENV !== 'production') {
  connectToDatabase().catch(console.error);
}

// Import routes - all monitoring and analytics routes
const artifactsRoutes = require('./routes/artifacts');
const usersRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const transactionsRoutes = require('./routes/transactions');
const certificatesRoutes = require('./routes/certificates');
const blockchainRoutes = require('./routes/blockchain');
// const searchRoutes = require('./routes/search'); // Disabled - missing chromadb dependency

// New monitoring and analytics routes
const analyticsRoutes = require('./routes/analytics');
const monitoringRoutes = require('./routes/monitoring');
const reportsRoutes = require('./routes/reports');

// Use existing routes
app.use('/api/artifacts', artifactsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/blockchain', blockchainRoutes);
// app.use('/api/search', searchRoutes); // Disabled - missing dependency

// Use new monitoring and analytics routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/reports', reportsRoutes);

// Additional health endpoint
app.get('/api/healthcheck', async (_req, res) => {
  try {
    await connectToDatabase();
    res.json({
      ok: true,
      message: 'PVABazaar API is running',
      mongo: mongoose.connection.readyState === 1,
      timestamp: new Date().toISOString(),
      features: [
        'analytics tracking',
        'blockchain monitoring',
        'daily reporting',
        'visitor analytics',
        'api monitoring'
      ]
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from frontend directory
  app.use(express.static(path.join(__dirname, 'Frontend')));
  
  // Serve monitoring dashboard
  app.get('/monitoring', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'monitoring.html'));
  });
  
  // Any route not caught by API routes should serve the frontend
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'index.html'));
  });
} else {
  // In development, serve monitoring dashboard
  app.get('/monitoring', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'monitoring.html'));
  });
  
  // Serve main frontend
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'index.html'));
  });
}

// Error handling middleware with tracking
app.use(trackApiErrors);
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

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 PVABazaar server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Monitoring Dashboard: http://localhost:${PORT}/monitoring`);
    console.log(`📈 Analytics API: http://localhost:${PORT}/api/analytics/dashboard`);
  });
}

// Export for Vercel serverless
module.exports = app;