// Standalone health check serverless function
// No Express, no models, no route loading - instant response
const mongoose = require('mongoose');

module.exports = async (req, res) => {
  const start = Date.now();
  
  // Set headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-App-Version', '492cd43');
  
  // Check MongoDB with timeout
  let dbStatus = 'disconnected';
  let dbError = null;
  
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      dbStatus = 'connected';
    } else {
      // Try to connect with 3s timeout
      const connectPromise = mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
        socketTimeoutMS: 3000,
        maxPoolSize: 1,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout')), 3000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      dbStatus = 'connected';
    }
  } catch (err) {
    dbError = err.message;
  }
  
  const elapsed = Date.now() - start;
  
  res.status(200).json({
    status: 'ok',
    source: 'health.js',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      error: dbError,
      responseTime: `${elapsed}ms`,
    },
    env: {
      nodeVersion: process.version,
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
  });
};
