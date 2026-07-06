// Standalone health check serverless function
// No Express, no models, no route loading - instant response
const mongoose = require('mongoose');
const { connectMongo, getMongoState } = require('../lib/mongoConnection');

module.exports = async (req, res) => {
  const start = Date.now();

  // Set headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-App-Version', '492cd43');

  // CORS (needed so pvabazaar.org can call this endpoint from the browser)
  const allowed = (process.env.ALLOWED_ORIGIN || 'https://pvabazaar.org')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const origin = req.headers.origin;

  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Check MongoDB with timeout
  let dbStatus = 'disconnected';
  let dbError = null;

  try {
    await Promise.race([
      connectMongo({ logger: console }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000)),
    ]);
    const mongoState = getMongoState();
    dbStatus = mongoState.mode === 'memory' ? 'memory' : 'connected';
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
      mode: getMongoState().mode,
      error: dbError,
      responseTime: `${elapsed}ms`,
    },
    env: {
      nodeVersion: process.version,
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    },
  });
};
