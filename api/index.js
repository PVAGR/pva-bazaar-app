const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const serverless = require('serverless-http');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration - allow specific domains
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'https://pva-bazaar-app.vercel.app', // Production domain placeholder
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth routes
  message: {
    ok: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors(corsOptions));
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB - optimized for serverless
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  // Connect to MongoDB
  const client = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/test', {
    dbName: 'pvabazaar',
    bufferCommands: false
  });
  
  console.log('✅ MongoDB Connected successfully');
  cachedDb = client;
  return client;
}

// Health endpoint
app.get('/api/health', async (req, res) => {
  try {
    await connectToDatabase();
    res.json({
      ok: true,
      message: 'PVABazaar API is running',
      mongo: mongoose.connection.readyState === 1,
      timestamp: new Date().toISOString(),
      security: {
        helmet: 'enabled',
        cors: 'configured',
        rateLimiting: 'enabled'
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Basic test endpoint without auth
app.get('/api/test', (req, res) => {
  res.json({
    ok: true,
    message: 'Security middleware test endpoint',
    security: {
      helmet: 'enabled',
      cors: 'configured',
      rateLimiting: 'enabled'
    }
  });
});

// Auth routes
const authRoutes = require('./auth');
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, _next) => {
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

// Export the serverless handler
const handler = serverless(app);
module.exports = async (req, res) => {
  try {
    if (process.env.MONGODB_URI) {
      await connectToDatabase();
    }
    return handler(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
};