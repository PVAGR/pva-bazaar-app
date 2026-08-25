/**
 * Promoter / Consignment Ambassador Program Tests
 * Covers signup, public lookup, mine ledger, and redemption with tiered commission.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Promoter = require('../../models/Promoter');
const Artifact = require('../../models/Artifact');

let app;
let mongoServer;
let testItemId;

describe('Promoter Module', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    process.env.NODE_ENV = 'test';
    process.env.ALLOWED_ORIGIN = 'http://localhost';
    process.env.SMTP_PASS = '';
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    app = require('../../api/index.js');
    await app.connectToDatabase();

    const item = await Artifact.create({
      name: 'Test Pendant',
      title: 'Test Pendant',
      slug: 'test-pendant',
      description: 'A test item',
      priceCents: 10000,
      price: 100,
      physicalSerial: 'PENDANT-TEST-001',
      status: 'published',
      category: 'Jewelry',
      artisan: 'Test Artisan',
      creator: new mongoose.Types.ObjectId(),
    });
    testItemId = String(item._id);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('POST /api/promoters/signup', () => {
    it('rejects signup without name or email', async () => {
      const res = await request(app)
        .post('/api/promoters/signup')
        .send({ name: '', email: '' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('rejects signup with invalid email', async () => {
      const res = await request(app)
        .post('/api/promoters/signup')
        .send({ name: 'Test', email: 'not-an-email' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('creates a new promoter with a 4-char code', async () => {
      const res = await request(app)
        .post('/api/promoters/signup')
        .send({ name: 'Alice', email: 'alice@example.com', handle: 'alice', platform: 'instagram' });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.promoter.code).toMatch(/^[A-Z2-9]{4}$/);
      expect(res.body.promoter.name).toBe('Alice');
      expect(res.body.promoter.redemptions).toBe(0);
    });

    it('returns existing promoter for duplicate email', async () => {
      const res = await request(app)
        .post('/api/promoters/signup')
        .send({ name: 'Alice', email: 'alice@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.existing).toBe(true);
      expect(res.body.promoter.code).toMatch(/^[A-Z2-9]{4}$/);
    });
  });

  describe('GET /api/promoters/public/:code', () => {
    it('returns promoter info for active code', async () => {
      const promoter = await Promoter.findOne({ email: 'alice@example.com' }).lean();
      const res = await request(app).get(`/api/promoters/public/${promoter.code}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.promoter.code).toBe(promoter.code);
      expect(res.body.promoter.name).toBe('Alice');
    });

    it('returns 404 for unknown code', async () => {
      const res = await request(app).get('/api/promoters/public/ZZZZ');
      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('GET /api/promoters/mine/:code', () => {
    it('returns promoter ledger with empty redemptions', async () => {
      const promoter = await Promoter.findOne({ email: 'alice@example.com' }).lean();
      const res = await request(app).get(`/api/promoters/mine/${promoter.code}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.promoter.code).toBe(promoter.code);
      expect(res.body.redemptions).toEqual([]);
    });

    it('returns 404 for unknown code', async () => {
      const res = await request(app).get('/api/promoters/mine/ZZZZ');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/promoters/redeem', () => {
    it('rejects missing code', async () => {
      const res = await request(app)
        .post('/api/promoters/redeem')
        .send({ code: '', itemId: testItemId, buyerName: 'Bob', buyerEmail: 'bob@example.com' });
      expect(res.status).toBe(400);
    });

    it('rejects missing buyer info', async () => {
      const promoter = await Promoter.findOne({ email: 'alice@example.com' }).lean();
      const res = await request(app)
        .post('/api/promoters/redeem')
        .send({ code: promoter.code, itemId: testItemId, buyerName: '', buyerEmail: '' });
      expect(res.status).toBe(400);
    });

    it('rejects unknown promoter code', async () => {
      const res = await request(app)
        .post('/api/promoters/redeem')
        .send({ code: 'ZZZZ', itemId: testItemId, buyerName: 'Bob', buyerEmail: 'bob@example.com' });
      expect(res.status).toBe(404);
    });

    it('records redemption with correct tiered commission', async () => {
      const promoter = await Promoter.findOne({ email: 'alice@example.com' });
      const res = await request(app)
        .post('/api/promoters/redeem')
        .send({
          code: promoter.code,
          itemSlug: 'test-pendant',
          buyerName: 'Bob',
          buyerEmail: 'bob@example.com',
          buyerNote: 'Interested in this pendant',
        });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.commissionPercent).toBe(20);
      expect(res.body.commissionCents).toBe(2000);

      const updated = await Promoter.findById(promoter._id).lean();
      expect(updated.redemptions.length).toBe(1);
      expect(updated.redemptions[0].buyerName).toBe('Bob');
      expect(updated.redemptions[0].itemSlug).toBe('test-pendant');
      expect(updated.redemptions[0].commissionPercent).toBe(20);
    });

    it('is idempotent for the same code+item (adds another redemption)', async () => {
      const promoter = await Promoter.findOne({ email: 'alice@example.com' });
      const res = await request(app)
        .post('/api/promoters/redeem')
        .send({
          code: promoter.code,
          itemSlug: 'test-pendant',
          buyerName: 'Carol',
          buyerEmail: 'carol@example.com',
        });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);

      const updated = await Promoter.findById(promoter._id).lean();
      expect(updated.redemptions.length).toBe(2);
      expect(updated.redemptions[1].buyerName).toBe('Carol');
    });
  });

  describe('Commission tiering', () => {
    it('returns 5% for items under $50', async () => {
      await Artifact.create({
        name: 'Cheap Item',
        title: 'Cheap Item',
        slug: 'cheap-item',
        description: 'A cheap test item',
        priceCents: 2000,
        price: 20,
        physicalSerial: 'CHEAP-TEST-001',
        status: 'published',
        category: 'Test',
        artisan: 'Test Artisan',
        creator: new mongoose.Types.ObjectId(),
      });
      const promoter = await Promoter.findOne({ email: 'alice@example.com' });
      const res = await request(app)
        .post('/api/promoters/redeem')
        .send({
          code: promoter.code,
          itemSlug: 'cheap-item',
          buyerName: 'Dave',
          buyerEmail: 'dave@example.com',
        });
      expect(res.status).toBe(201);
      expect(res.body.commissionPercent).toBe(5);
      expect(res.body.commissionCents).toBe(100);
    });

    it('returns 50% for items $500+', async () => {
      await Artifact.create({
        name: 'Expensive Item',
        title: 'Expensive Item',
        slug: 'expensive-item',
        description: 'An expensive test item',
        priceCents: 100000,
        price: 1000,
        physicalSerial: 'EXPENSIVE-TEST-001',
        status: 'published',
        category: 'Test',
        artisan: 'Test Artisan',
        creator: new mongoose.Types.ObjectId(),
      });
      const promoter = await Promoter.findOne({ email: 'alice@example.com' });
      const res = await request(app)
        .post('/api/promoters/redeem')
        .send({
          code: promoter.code,
          itemSlug: 'expensive-item',
          buyerName: 'Eve',
          buyerEmail: 'eve@example.com',
        });
      expect(res.status).toBe(201);
      expect(res.body.commissionPercent).toBe(50);
      expect(res.body.commissionCents).toBe(50000);
    });
  });
});
