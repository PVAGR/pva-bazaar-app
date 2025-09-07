// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// ---- Hard fail if required env is missing ----
if (!process.env.MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env');
  process.exit(1);
}

// ---- App ----
const app = express();
const PORT = process.env.PORT || 5000;

// ---- Middleware ----
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// ---- MongoDB ----
mongoose
  .connect(process.env.MONGODB_URI, { dbName: 'pvabazaar' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// ---- Routes (NO vector/search routes) ----
const artifactsRoutes = require('./routes/artifacts');
const usersRoutes = require('./routes/users');

app.use('/api/artifacts', artifactsRoutes);
app.use('/api/users', usersRoutes);

// ---- Health ----
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    message: 'PVABazaar API is running',
    mongo: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

// ---- (Vector reindex endpoint disabled on purpose) ----
// app.post('/api/admin/reindex', ...)

// ---- Serve frontend in production ----
if (process.env.NODE_ENV === 'production') {
  const frontendDir = path.join(__dirname, '../frontend');
  app.use(express.static(frontendDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
  });
}

// ---- Error handler ----
app.use((err, _req, res, _next) => {
  console.error('🚨 Error:', err.stack || err);
  res.status(500).json({
    ok: false,
    message: 'Something went wrong!',
    error:
      process.env.NODE_ENV === 'development'
        ? (err && err.message) || 'Internal server error'
        : 'Internal server error',
  });
});

// ---- 404 ----
app.use((_req, res) => {
  res.status(404).json({ ok: false, message: 'API endpoint not found' });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`🚀 PVABazaar server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
