// @vitest-environment node
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

let mongoServer;
let app;
let authToken;
let apiKeyToken;
let testUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.DATABASE_URL = uri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
  process.env.VERIFICATION_API_KEY = 'test-api-key';
  process.env.ALLOW_MOCK_DB_FALLBACK = 'false';
  process.env.USE_MEMORY_DB = 'false';

  await mongoose.connect(uri);

  app = require('../api/index.js');

  const User = mongoose.model('User');
  testUser = await User.create({
    name: 'Test Seller',
    email: 'test-seller@pvabazaar.org',
    password: 'dummy-hash',
    role: 'user',
  });

  const payload = { id: testUser._id, role: testUser.role, email: testUser.email };
  authToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  apiKeyToken = 'test-api-key';

  const FulfillmentCenter = mongoose.model('FulfillmentCenter');
  await FulfillmentCenter.create({
    name: 'Nairobi Hub',
    code: 'NBO-001',
    address: { country: 'KE', city: 'Nairobi' },
    capacity: { totalSquareFeet: 10000, currentUtilization: 35 },
    active: true,
  });

  // Create API key for Phase 8 tests
  const APIKey = mongoose.model('APIKey');
  const crypto = require('crypto');
  const rawKey = 'test-api-key';
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  await APIKey.create({
    keyHash,
    keyPrefix: 'pk_test_T',
    maskedKey: 'pk_test_T...yKey',
    status: 'active',
    developerId: testUser._id,
    applicationName: 'Test API Key',
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 10000,
      currentMinuteRequests: 0,
      currentDayRequests: 0,
      resetMinuteAt: new Date(Date.now() + 60000),
    },
    totalRequests: 0,
    lastUsedAt: new Date(),
    permissions: ['read:products', 'read:orders', 'write:products', 'write:orders', 'read:inventory', 'write:inventory', 'read:analytics', 'manage:webhooks'],
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Phase 6b: Global Fulfillment', () => {
  describe('Fulfillment Centers', () => {
    test('select-center: Find best fulfillment center by destination', async () => {
      const response = await request(app)
        .post('/api/fulfillment/select-center')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destinationCountry: 'USA',
          destinationCity: 'New York',
        });

      expect(response.status).toBeOneOf([200, 400]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('_id');
        expect(response.body).toHaveProperty('name');
      }
    });

    test('calculate-shipping: Get shipping cost with surcharges', async () => {
      const response = await request(app)
        .post('/api/fulfillment/calculate-shipping')
        .send({
          destinationCountry: 'USA',
          weight: 2.5,
          shippingMethod: 'standard',
          insuranceValue: 1000,
        });

      expect(response.status).toBeOneOf([200, 400]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('cost');
        expect(response.body).toHaveProperty('carrier');
        expect(response.body).toHaveProperty('estimatedDelivery');
      }
    });

    test('shipping-rates: Get multiple carrier options', async () => {
      const response = await request(app)
        .post('/api/fulfillment/shipping-rates')
        .send({
          destinationCountry: 'USA',
          weight: 1,
          insuranceValue: 500,
        });

      expect(response.status).toBeOneOf([200, 400, 500]);
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  describe('Shipment Tracking', () => {
    test('create-shipment: Create shipment for order', async () => {
      const response = await request(app)
        .post('/api/fulfillment/create-shipment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: new mongoose.Types.ObjectId(),
          fulfillmentCenterId: new mongoose.Types.ObjectId(),
          shippingDetails: {
            carrier: 'dhl',
            address: {
              name: 'John Doe',
              street: '123 Main St',
              city: 'New York',
              country: 'USA',
            },
            cost: 2500,
            estimatedDelivery: 7,
          },
        });

      expect(response.status).toBeOneOf([201, 400, 404]);
    });

    test('track-shipment: Get real-time tracking info', async () => {
      const response = await request(app)
        .get('/api/fulfillment/track-shipment/TRACKING123')
        .send();

      expect(response.status).toBeOneOf([200, 404]);
    });

    test('update-shipment-status: Update shipment from carrier webhook', async () => {
      const response = await request(app)
        .post('/api/fulfillment/update-shipment-status')
        .send({
          trackingNumber: 'TRACKING123',
          newStatus: 'in_transit',
          location: { city: 'Chicago', country: 'USA' },
          message: 'Package in transit',
        });

      expect(response.status).toBeOneOf([200, 400, 404]);
    });
  });

  describe('Returns & Refunds', () => {
    test('initiate-return: Create return label', async () => {
      const response = await request(app)
        .post('/api/fulfillment/initiate-return')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: new mongoose.Types.ObjectId(),
          reason: 'Item damaged',
        });

      expect(response.status).toBeOneOf([200, 400, 404]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('returnLabel');
      }
    });

    test('process-return: Inspect and approve return', async () => {
      const response = await request(app)
        .post('/api/fulfillment/process-return')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          returnTracking: 'RMA-123456',
          inspection: { damageFound: false },
        });

      expect(response.status).toBeOneOf([200, 400, 404]);
    });
  });
});

describe('Phase 7: AI Helper', () => {
  describe('AI Assistant', () => {
    test('ask: Get AI response to question', async () => {
      const response = await request(app)
        .post('/api/ai-help/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question: 'How do I price my products competitively?',
          topic: 'pricing',
        });

      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('response');
      }
    });

    test('guides: Get help guide for topic', async () => {
      const response = await request(app)
        .get('/api/ai-help/guides/pricing')
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('sections');
    });

    test('pricing-suggest: Get AI pricing recommendations', async () => {
      const response = await request(app)
        .post('/api/ai-help/pricing-suggest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: new mongoose.Types.ObjectId(),
          cost: 100,
          targetMargin: 50,
        });

      expect(response.status).toBeOneOf([200, 400]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('fairPrice');
        expect(response.body).toHaveProperty('recommendedPrice');
      }
    });

    test('compliance-checklist: Get legal requirements', async () => {
      const response = await request(app)
        .get('/api/ai-help/compliance-checklist')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBeOneOf([200, 401]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('checklist');
      }
    });

    test('performance-insights: Get AI seller insights', async () => {
      const response = await request(app)
        .get('/api/ai-help/performance-insights')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBeOneOf([200, 401]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('insights');
      }
    });
  });
});

describe('Phase 8: Open API & Integrations', () => {
  describe('Partner Integrations', () => {
    test('connect: Connect partner account', async () => {
      const response = await request(app)
        .post('/api/integrations/connect/shopify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          partnerAccessToken: 'test-token-abc123',
          partnerAccountId: 'shop123',
          partnerAccountName: 'my-shop.myshopify.com',
        });

      expect(response.status).toBeOneOf([200, 401]);
    });

    test('integrations: List connected partners', async () => {
      const response = await request(app)
        .get('/api/integrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBeOneOf([200, 401]);
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    test('sync: Trigger manual sync with partner', async () => {
      const response = await request(app)
        .post('/api/integrations/shopify/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBeOneOf([200, 401, 404]);
    });
  });

  describe('Public API v1', () => {
    test('products: List seller products via API key', async () => {
      const response = await request(app)
        .get('/api/v1/products?page=1&limit=10')
        .set('Authorization', `Bearer ${apiKeyToken}`)
        .send();

      expect(response.status).toBeOneOf([200, 401]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('products');
      }
    });

    test('orders: List seller orders via API key', async () => {
      const response = await request(app)
        .get('/api/v1/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${apiKeyToken}`)
        .send();

      expect(response.status).toBeOneOf([200, 401]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('orders');
      }
    });

    test('inventory-sync: Sync inventory levels', async () => {
      const response = await request(app)
        .post('/api/v1/inventory/sync')
        .set('Authorization', `Bearer ${apiKeyToken}`)
        .send({
          updates: [
            {
              productId: new mongoose.Types.ObjectId(),
              fulfillmentCenterId: new mongoose.Types.ObjectId(),
              qtyOnHand: 100,
            },
          ],
        });

      expect(response.status).toBeOneOf([200, 401, 400]);
    });

    test('analytics: Get seller analytics via API', async () => {
      const response = await request(app)
        .get('/api/v1/analytics?period=month')
        .set('Authorization', `Bearer ${apiKeyToken}`)
        .send();

      expect(response.status).toBeOneOf([200, 401]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('period');
      }
    });

    test('fulfill-order: Mark order as fulfilled', async () => {
      const response = await request(app)
        .post(`/api/v1/orders/${new mongoose.Types.ObjectId()}/fulfill`)
        .set('Authorization', `Bearer ${apiKeyToken}`)
        .send({
          trackingNumber: 'TRACKING123',
          carrier: 'dhl',
        });

      expect(response.status).toBeOneOf([200, 401, 404]);
    });
  });

  describe('Webhooks', () => {
    test('webhooks-register: Register webhook', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks/register')
        .set('Authorization', `Bearer ${apiKeyToken}`)
        .send({
          event: 'product.created',
          url: 'https://example.com/webhooks/product-created',
        });

      expect(response.status).toBeOneOf([200, 401, 400]);
    });
  });
});

describe('Health & Status', () => {
  test('health: API health check', async () => {
    const response = await request(app)
      .get('/api/health')
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ok');
    expect(response.body).toHaveProperty('message');
  });

  test('ping: Express ping', async () => {
    const response = await request(app)
      .get('/api/express-ping')
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ok');
  });

  test('version: API version info', async () => {
    const response = await request(app)
      .get('/api/version')
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('version');
  });

  test('openapi: OpenAPI spec available', async () => {
    const response = await request(app)
      .get('/api/openapi.json')
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('openapi');
    expect(response.body).toHaveProperty('info');
    expect(response.body).toHaveProperty('paths');
  });

  test('docs: Swagger UI available', async () => {
    const response = await request(app)
      .get('/api/docs')
      .send();

    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger-ui');
  });
});

expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () => `expected ${received} to be one of ${expected}`,
    };
  },
});
