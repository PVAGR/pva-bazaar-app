const mongoose = require('mongoose');

let MongoMemoryServer = null;

const state = global._pvaMongoState || {
  conn: null,
  promise: null,
  memoryServer: null,
  mode: 'disconnected',
  seeded: false,
};

global._pvaMongoState = state;

function getMongoUriFromEnv() {
  const direct = String(process.env.MONGODB_URI || '').trim();
  if (direct) return direct;

  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (databaseUrl && (databaseUrl.startsWith('mongodb://') || databaseUrl.startsWith('mongodb+srv://'))) {
    return databaseUrl;
  }

  return '';
}

function shouldAllowMemoryFallback() {
  if (process.env.USE_MEMORY_DB === 'true') return true;
  return process.env.ALLOW_MEMORY_DB_FALLBACK !== 'false';
}

async function createMemoryUri() {
  if (!MongoMemoryServer) {
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
  }

  if (!state.memoryServer) {
    state.memoryServer = await MongoMemoryServer.create();
  }

  return state.memoryServer.getUri();
}

async function seedFallbackData() {
  if (state.seeded || process.env.AUTO_SEED_MEMORY_DB === 'false') {
    return;
  }

  const User = require('../models/User');
  const seeds = [
    {
      name: 'PVA Admin',
      email: 'admin@pvabazaar.org',
      password: 'admin123',
      role: 'admin',
    },
    {
      name: 'Richy Rich',
      username: 'richyrichaii',
      email: 'richyrichaii@local',
      password: 'pva123zxc!',
      role: 'admin',
    },
  ];

  for (const seed of seeds) {
    const query = seed.username ? { username: seed.username } : { email: seed.email };
    const existing = await User.findOne(query);
    if (existing) continue;
    const user = new User(seed);
    await user.save();
  }

  state.seeded = true;
}

async function connectMongo(options = {}) {
  const logger = options.logger || console;

  if (state.conn) {
    return state.conn;
  }

  if (state.promise) {
    state.conn = await state.promise;
    return state.conn;
  }

  const allowMemoryFallback = options.allowMemoryFallback !== false && shouldAllowMemoryFallback();
  const uriFromEnv = getMongoUriFromEnv();
  const usingMemory = !uriFromEnv && allowMemoryFallback;

  async function connectWithUri(uri, mode) {
    state.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      maxPoolSize: 10,
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    state.conn = await state.promise;
    state.mode = mode;
    mongoose.connection.on('error', (err) => {
      logger.error?.('MongoDB error:', err?.message || err);
    });
    return state.conn;
  }

  try {
    if (usingMemory) {
      logger.warn?.('⚠️ MongoDB URI missing. Falling back to in-memory MongoDB.');
      const memoryUri = await createMemoryUri();
      const conn = await connectWithUri(memoryUri, 'memory');
      await seedFallbackData();
      return conn;
    }

    if (!uriFromEnv) {
      throw new Error('MONGODB_URI is required');
    }

    logger.log?.('🔌 Connecting to MongoDB...');
    return await connectWithUri(uriFromEnv, 'mongo');
  } catch (err) {
    if (allowMemoryFallback && state.mode !== 'memory') {
      try {
        logger.warn?.(`⚠️ MongoDB connection failed (${err.message}). Falling back to in-memory MongoDB.`);
        const memoryUri = await createMemoryUri();
        state.promise = null;
        const conn = await connectWithUri(memoryUri, 'memory');
        await seedFallbackData();
        return conn;
      } catch (memoryErr) {
        state.promise = null;
        state.mode = 'error';
        throw memoryErr;
      }
    }

    state.promise = null;
    state.mode = 'error';
    throw err;
  }
}

function getMongoState() {
  return {
    mode: state.mode,
    connected: Boolean(state.conn),
    readyState: mongoose.connection.readyState,
    hasEnvUri: Boolean(getMongoUriFromEnv()),
    fallbackAllowed: shouldAllowMemoryFallback(),
  };
}

module.exports = {
  connectMongo,
  getMongoState,
  getMongoUriFromEnv,
  shouldAllowMemoryFallback,
};
