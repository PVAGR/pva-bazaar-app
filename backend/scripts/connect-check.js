#!/usr/bin/env node
/**
 * Verify MongoDB connection and that core "vessels" (collections + seed user) are connected.
 * Run from repo root: npm run db:check  or  node backend/scripts/connect-check.js
 * Or from backend: node scripts/connect-check.js (loads backend/.env)
 */
const path = require('path');
const fs = require('fs');

// Load backend/.env (no dotenv dependency when run from root)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) {
      const val = match[2].replace(/^["']|["']$/g, '').trim();
      if (!process.env[match[1]]) process.env[match[1]] = val;
    }
  });
}

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Copy backend/.env.example to backend/.env and set MONGODB_URI.');
  process.exitCode = 1;
  process.exit(1);
}

const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  console.log('🔌 Connecting to MongoDB...');

  try {
    await mongoose.connect(uri, {
      dbName: 'pvabazaar',
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exitCode = 1;
    process.exit(1);
  }

  const checks = { mongodb: true, users: false, richy: false, artifacts: false };

  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name);
    if (names.includes('users')) checks.users = true;
    if (names.includes('artifacts')) checks.artifacts = true;

    const User = require('../models/User');
    const richy = await User.findOne({ username: 'richyrichaii' });
    if (richy) {
      checks.richy = true;
      console.log('✅ User richyrichaii found (login: username richyrichaii, password pva123zxc!)');
    } else {
      console.log('⚠️ User richyrichaii not found. Run: node backend/seed.js');
    }

    const Artifact = require('../models/Artifact');
    const artifactCount = await Artifact.estimatedDocumentCount();
    console.log(`✅ Artifacts collection: ${artifactCount} document(s)`);
    if (artifactCount >= 0) checks.artifacts = true;
  } catch (err) {
    console.error('❌ Check error:', err.message);
  } finally {
    await mongoose.disconnect();
  }

  const allOk = checks.mongodb && checks.users && checks.richy;
  if (allOk) {
    console.log('\n✅ All vessels connected: MongoDB, users collection, richyrichaii user.');
  } else {
    console.log('\n⚠️ Not all checks passed. Run backend/seed.js to create richyrichaii user and sample data.');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  process.exit(1);
});
