// @vitest-environment node
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

let mongoServer;
let app;
let token;

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
  process.env.OPENCLAW_WEBHOOK_SECRET = '';
  delete process.env.OPENCLAW_ALERT_WEBHOOK_URL;

  await mongoose.connect(uri);
  // Bisect: build a minimal app with ONLY the items router. If this passes
  // while the full app fails, something in api/index.js alters behavior.
  const express = require('express');
  const mini = express();
  mini.use(express.json({ limit: '1mb' }));
  mini.use('/api/items', require('../routes/items'));
  app = mini;
  const fullApp = require('../api/index.js');
  app = process.env.USE_FULL_APP === 'true' ? fullApp : mini;

  const ArtifactProbe = mongoose.model('Artifact');
  const direct = require('../models/Artifact');
  console.log('[probe] same model?', direct === ArtifactProbe, '| modelName:', ArtifactProbe.modelName);
  const ppath = ArtifactProbe.schema.path('provenance');
  console.log('[probe] provenance path instance:', ppath && ppath.instance, '| has child schema:', Boolean(ppath && ppath.schema));
  if (ppath && ppath.schema) console.log('[probe] children:', Object.keys(ppath.schema.paths));

  const User = mongoose.model('User');
  const user = await User.create({
    name: 'Trader User',
    email: 'trader@pvabazaar.org',
    password: 'dummy-hash',
    role: 'user',
    onboardingProfile: {
      compliance: {
        legalFullName: 'Trader User',
        legalIdType: 'national_id',
        legalIdNumber: 'ID-123',
        addressLine1: '1 Lane',
        city: 'Kilifi',
        postalCode: '80100',
        country: 'Kenya',
        phone: '+254700000000',
        identityAttested: true,
      },
    },
  });
  token = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('POST /api/items/register - user listing creation', () => {
  it('creates a listing for a trader with complete identity', async () => {
    const res = await request(app)
      .post('/api/items/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Coil Basket ${Date.now()}`,
        description: 'Handwoven storage basket.',
        price: 25,
        category: 'Baskets & Weaving',
        condition: 'new',
      });

    if (res.status !== 201) {
      console.error('REGISTER FAILURE BODY:', JSON.stringify(res.body, null, 2));
    }
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.item.physicalSerial || res.body.item.slug).toBeTruthy();
  });

  it('creates two listings in a row (unique serial/slug)', async () => {
    const res = await request(app)
      .post('/api/items/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Woven Storage Tray ${Date.now()}`,
        description: 'Second listing.',
        price: 18,
        category: 'Baskets & Weaving',
      });
    expect(res.status).toBe(201);
  });
});
