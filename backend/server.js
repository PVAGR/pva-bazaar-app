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

// Connect to MongoDB - with improved error handling for serverless
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  try {
    const client = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'pvabazaar',
      serverSelectionTimeoutMS: 5000
    });
    
    cachedDb = client.connection;
    console.log('✅ MongoDB Connected successfully');
    return cachedDb;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    throw err;
  }
}

// Import routes
const artifactsRoutes = require('./routes/artifacts');
const usersRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');

// API Routes
app.use('/api/artifacts', artifactsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/health', healthRoutes);

// Health endpoint
app.get('/api/status', async (req, res) => {
  try {
    const db = await connectToDatabase();
    res.json({
      ok: true,
      message: 'PVABazaar API is running',
      mongo: db.readyState === 1,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Static files - if you're serving frontend from same deployment
if (process.env.NODE_ENV === 'production') {
  // Use conditional check for frontend directory
  const frontendPath = path.join(__dirname, './frontend');
  try {
    const fs = require('fs');
    if (fs.existsSync(frontendPath)) {
      app.use(express.static(frontendPath));
      app.get('/*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
      });
    }
  } catch (err) {
    console.log('Frontend files not found, API-only mode');
  }
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
    message: 'API endpoint not found',
    path: req.path
  });
});

// Connect to database before starting server
connectToDatabase().then(() => {
  // For local development
  if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 PVABazaar server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    });
  }
});

// Export for serverless use
module.exports = app;