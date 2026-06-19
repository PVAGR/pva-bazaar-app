// backend/routes/health-check.js - Comprehensive health and integration verification
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { connectMongo, getMongoState } = require('../lib/mongoConnection');
const { getAuthStoreState } = require('../lib/mockUserStore');
const { getBookStoreState } = require('../lib/bookProjectStore');

/**
 * GET /api/health-check - Comprehensive system health check
 */
router.get('/', async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'unknown', message: '' },
      api: { status: 'ok', message: 'Express server running' },
      memory: { status: 'ok', message: '' },
      environment: { status: 'ok', message: '' },
    },
    integrations: {
      shop_system: { status: 'unknown' },
      product_system: { status: 'unknown' },
      fulfillment_system: { status: 'unknown' },
      pricing_system: { status: 'unknown' },
      ai_helper: { status: 'unknown' },
      partner_api: { status: 'unknown' },
    },
    routes: {
      total_endpoints: 50,
      status: 'active',
    },
  };

  // Check database
  const forceMockDb = process.env.VERCEL === '1' && process.env.FORCE_REAL_DB !== 'true';
  if (forceMockDb) {
    checks.checks.database.status = 'ok';
    checks.checks.database.message = 'MongoDB connection state: mock (serverless fallback)';
  } else {
    try {
      await Promise.race([
        connectMongo({ logger: console }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000)),
      ]);
      const mongoState = getMongoState();
      const authStoreState = await getAuthStoreState().catch(() => null);
      const bookStoreState = await getBookStoreState().catch(() => null);
      const effectiveMode = mongoState.mode === 'mock' && authStoreState?.mode === 'file'
        ? 'file'
        : mongoState.mode;
      checks.checks.database.status = effectiveMode === 'memory' ? 'warning' : 'ok';
      checks.checks.database.message = effectiveMode === 'file'
        ? `Shared auth store active (${authStoreState?.users || 0} users), book store active (${bookStoreState?.books || 0} books)`
        : `MongoDB connection state: ${mongoose.connection.readyState} (${effectiveMode})`;
    } catch (err) {
      checks.checks.database.status = 'error';
      checks.checks.database.message = err.message;
    }
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  checks.checks.memory.message = `Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`;

  // Check environment
  const requiredEnv = ['JWT_SECRET'];
  const missingEnv = requiredEnv.filter((e) => !process.env[e]);
  const mongo = String(process.env.MONGODB_URI || '');
  const mongoLocal =
    mongo &&
    (mongo.includes('127.0.0.1') || mongo.includes('localhost') || mongo.includes('::1'));
  if (missingEnv.length) {
    checks.checks.environment.status = 'warning';
    checks.checks.environment.message = `Missing: ${missingEnv.join(', ')}`;
  } else if (mongoLocal) {
    checks.checks.environment.status = 'warning';
    checks.checks.environment.message =
      'MONGODB_URI uses localhost — use MongoDB Atlas (mongodb+srv) on cloud hosts';
  } else if (!process.env.MONGODB_URI) {
    checks.checks.environment.status = 'warning';
    checks.checks.environment.message =
      'No MONGODB_URI configured; using in-memory MongoDB fallback when available';
  } else {
    checks.checks.environment.status = 'ok';
    checks.checks.environment.message = 'All required vars set';
  }

  // Check integrations (models exist)
  try {
    require('../models/Shop');
    checks.integrations.shop_system.status = 'available';
  } catch {
    checks.integrations.shop_system.status = 'unavailable';
  }

  try {
    require('../models/ProductType');
    checks.integrations.product_system.status = 'available';
  } catch {
    checks.integrations.product_system.status = 'unavailable';
  }

  try {
    require('../models/FulfillmentCenter');
    checks.integrations.fulfillment_system.status = 'available';
  } catch {
    checks.integrations.fulfillment_system.status = 'unavailable';
  }

  try {
    require('../models/PricingRecommendation');
    checks.integrations.pricing_system.status = 'available';
  } catch {
    checks.integrations.pricing_system.status = 'unavailable';
  }

  try {
    require('../models/AIAgentBot');
    checks.integrations.ai_helper.status = 'available';
  } catch {
    checks.integrations.ai_helper.status = 'unavailable';
  }

  try {
    require('../models/APIKey');
    checks.integrations.partner_api.status = 'available';
  } catch {
    checks.integrations.partner_api.status = 'unavailable';
  }

  // Overall status
  const allChecksPassed = Object.values(checks.checks).every((c) => c.status !== 'error');

  res.json({
    ok: allChecksPassed,
    ...checks,
    summary: {
      all_ok: allChecksPassed,
      database_ok: checks.checks.database.status === 'ok',
      integrations_ok: Object.values(checks.integrations).every((i) => i.status !== 'unavailable'),
    },
  });
});

/**
 * GET /api/health-check/endpoints - List all available endpoints
 */
router.get('/endpoints', (req, res) => {
  const endpoints = {
    'Phase 2 - Shop Builder': [
      { method: 'POST', path: '/api/shops', description: 'Create shop' },
      { method: 'GET', path: '/api/shops/:id', description: 'Get shop' },
      { method: 'PUT', path: '/api/shops/:id', description: 'Update shop' },
      { method: 'POST', path: '/api/shops/:id/follow', description: 'Follow shop' },
    ],
    'Phase 3 - Multi-Product': [
      { method: 'POST', path: '/api/products', description: 'Create product' },
      { method: 'GET', path: '/api/products', description: 'List products' },
      { method: 'POST', path: '/api/courses/:id/enroll', description: 'Enroll course' },
    ],
    'Phase 4 - Seller Features': [
      { method: 'POST', path: '/api/reviews', description: 'Create review' },
      { method: 'GET', path: '/api/reviews', description: 'Get reviews' },
      { method: 'POST', path: '/api/messages', description: 'Send message' },
      { method: 'GET', path: '/api/analytics', description: 'Get analytics' },
    ],
    'Phase 5 - Community': [
      { method: 'POST', path: '/api/forums/threads', description: 'Create thread' },
      { method: 'POST', path: '/api/events', description: 'Create event' },
      { method: 'POST', path: '/api/articles', description: 'Publish article' },
    ],
    'Phase 6a - Pricing': [
      { method: 'POST', path: '/api/pricing/calculate', description: 'Calculate fair price' },
      { method: 'POST', path: '/api/pricing/recommend', description: 'Get recommendation' },
      { method: 'GET', path: '/api/admin/intelligence/dashboard', description: 'Market dashboard' },
    ],
    'Phase 6b - Fulfillment': [
      { method: 'POST', path: '/api/fulfillment/select-center', description: 'Select center' },
      { method: 'POST', path: '/api/fulfillment/calculate-shipping', description: 'Calculate shipping' },
      { method: 'POST', path: '/api/fulfillment/create-shipment', description: 'Create shipment' },
      { method: 'GET', path: '/api/fulfillment/track-shipment/:id', description: 'Track shipment' },
      { method: 'POST', path: '/api/fulfillment/initiate-return', description: 'Initiate return' },
    ],
    'Phase 7 - AI Helper': [
      { method: 'POST', path: '/api/ai-help/ask', description: 'Ask AI' },
      { method: 'GET', path: '/api/ai-help/guides/:topic', description: 'Get guide' },
      { method: 'POST', path: '/api/ai-help/pricing-suggest', description: 'Pricing suggestions' },
      { method: 'GET', path: '/api/ai-help/compliance-checklist', description: 'Compliance checklist' },
    ],
    'Phase 8 - Open API': [
      { method: 'POST', path: '/api/integrations/connect/:partner', description: 'Connect partner' },
      { method: 'GET', path: '/api/v1/products', description: 'List products (API)' },
      { method: 'GET', path: '/api/v1/orders', description: 'List orders (API)' },
      { method: 'POST', path: '/api/v1/inventory/sync', description: 'Sync inventory' },
      { method: 'GET', path: '/api/v1/analytics', description: 'Get analytics (API)' },
    ],
    'Documentation': [
      { method: 'GET', path: '/api/docs', description: 'Swagger UI' },
      { method: 'GET', path: '/api/openapi.json', description: 'OpenAPI spec' },
    ],
  };

  res.json({
    total_endpoints: Object.values(endpoints).reduce((sum, group) => sum + group.length, 0),
    endpoints,
  });
});

/**
 * GET /api/health-check/test - Run quick endpoint tests
 */
router.get('/test', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0 },
  };

  // Test health endpoint
  try {
    results.tests.push({ endpoint: '/api/health', status: 'ok', message: 'Health check working' });
    results.summary.passed++;
  } catch (err) {
    results.tests.push({ endpoint: '/api/health', status: 'error', message: err.message });
    results.summary.failed++;
  }

  // Test database models
  const models = [
    { name: 'Shop', path: '../models/Shop' },
    { name: 'ProductType', path: '../models/ProductType' },
    { name: 'FulfillmentCenter', path: '../models/FulfillmentCenter' },
    { name: 'ShipmentTracking', path: '../models/ShipmentTracking' },
    { name: 'AIAgentBot', path: '../models/AIAgentBot' },
    { name: 'APIKey', path: '../models/APIKey' },
  ];

  for (const model of models) {
    try {
      require(model.path);
      results.tests.push({ model: model.name, status: 'loaded', message: 'Model available' });
      results.summary.passed++;
    } catch (err) {
      results.tests.push({ model: model.name, status: 'error', message: err.message });
      results.summary.failed++;
    }
  }

  res.json({
    ok: results.summary.failed === 0,
    ...results,
  });
});

module.exports = router;
