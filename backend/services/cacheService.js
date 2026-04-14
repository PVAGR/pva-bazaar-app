// backend/services/cacheService.js - Redis caching with fallback
const redis = require('redis');

let redisClient = null;
const inMemoryCache = {};
const USE_REDIS = process.env.REDIS_URL ? true : false;

// Initialize Redis if available
if (USE_REDIS) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 500) },
  });

  redisClient.on('error', (err) => console.warn('⚠️ Redis error:', err));
  redisClient.connect().catch((err) => console.warn('⚠️ Redis connection failed:', err));
}

const DEFAULT_TTL = 3600; // 1 hour

/**
 * Get from cache
 */
async function get(key) {
  try {
    if (redisClient) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } else {
      return inMemoryCache[key]?.value || null;
    }
  } catch (err) {
    console.warn('❌ Cache get failed:', err);
    return null;
  }
}

/**
 * Set in cache
 */
async function set(key, value, ttl = DEFAULT_TTL) {
  try {
    if (redisClient) {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } else {
      inMemoryCache[key] = {
        value,
        expires: Date.now() + ttl * 1000,
      };
    }
    return true;
  } catch (err) {
    console.warn('❌ Cache set failed:', err);
    return false;
  }
}

/**
 * Delete from cache
 */
async function del(key) {
  try {
    if (redisClient) {
      await redisClient.del(key);
    } else {
      delete inMemoryCache[key];
    }
    return true;
  } catch (err) {
    console.warn('❌ Cache delete failed:', err);
    return false;
  }
}

/**
 * Clear all cache matching pattern
 */
async function clear(pattern = '*') {
  try {
    if (redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      if (pattern === '*') {
        Object.keys(inMemoryCache).forEach(k => delete inMemoryCache[k]);
      } else {
        const regex = new RegExp(pattern.replace('*', '.*'));
        Object.keys(inMemoryCache)
          .filter(k => regex.test(k))
          .forEach(k => delete inMemoryCache[k]);
      }
    }
    return true;
  } catch (err) {
    console.warn('❌ Cache clear failed:', err);
    return false;
  }
}

/**
 * Cache wrapper for functions
 */
async function remember(key, ttl, fn) {
  const cached = await get(key);
  if (cached) return cached;

  const result = await fn();
  await set(key, result, ttl);
  return result;
}

/**
 * Cache keys generator
 */
const cacheKeys = {
  product: (id) => `product:${id}`,
  products: (page, limit) => `products:${page}:${limit}`,
  shop: (id) => `shop:${id}`,
  user: (id) => `user:${id}`,
  search: (query, page) => `search:${query}:${page}`,
  trending: 'products:trending',
  stats: 'platform:stats',
  marketData: `market:data:${new Date().toISOString().split('T')[0]}`,
};

// Clean in-memory cache periodically
if (!USE_REDIS) {
  setInterval(() => {
    const now = Date.now();
    Object.entries(inMemoryCache).forEach(([key, data]) => {
      if (data.expires < now) {
        delete inMemoryCache[key];
      }
    });
  }, 60000); // Every minute
}

module.exports = {
  get,
  set,
  del,
  clear,
  remember,
  cacheKeys,
  isRedis: USE_REDIS,
};
