const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Import routes - use relative paths from server.js
const artifactsRoutes = require('./backend/routes/artifacts');
const usersRoutes = require('./backend/routes/users');
const healthRoutes = require('./backend/routes/health');

// Use routes
app.use('/api/artifacts', artifactsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/health', healthRoutes);

// Additional health endpoint
app.get('/api/healthcheck', async (_req, res) => {
  try {
    await connectToDatabase();
    res.json({
      ok: true,
      message: 'PVABazaar API is running',
      mongo: mongoose.connection.readyState === 1,
      timestamp: new Date().toISOString()
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
  app.use(express.static(path.join(__dirname, 'frontend')));
  
  // Any route not caught by API routes should serve the frontend
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
  });
}

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

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 PVABazaar server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  });
}

// Export for Vercel serverless
module.exports = app;