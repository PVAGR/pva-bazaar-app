#!/usr/bin/env node
const path = require('path');
require('dotenv').config();

const { app } = require(path.join(__dirname, 'backend', 'api', 'index'));

const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                 PVA BAZAAR API SERVER STARTING                 ║
╚════════════════════════════════════════════════════════════════╝
Environment: ${NODE_ENV}
Port: ${PORT}
`);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health-check`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  SIGINT received, shutting down gracefully...');
  process.exit(0);
});
