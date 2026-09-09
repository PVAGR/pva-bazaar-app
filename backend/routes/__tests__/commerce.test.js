// @vitest-environment node
// Phase 3 commerce trust: server authority for listings, cart revalidation,
// seller scoping, product visibility, and referral settlement guards.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';

let mongoServer;
let app;
let Artifact;
let ProductType;
let Shop;
let Order;
let referralService;

const sellerId = new mongoose.Types.ObjectId();

let orderSeq = 0;

async function makeArtifact(overrides = {}) {
  orderSeq += 1;
  return Artifact.create({
    name: 'Test Item',
    title: 'Test Item',
    description: 'A test marketplace item.',
    price: 25,
    category: 'test',
    artisan: 'Test Artisan',
    creator: sellerId,
    physicalSerial: `PVA-TEST-PHASE3-${Date.now()}-${orderSeq}`,
    status: 'published',
    ...overrides,
  });
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  Artifact = require('../../models/Artifact');
  ProductType = require('../../models/ProductType');
  Shop = require('../../models/Shop');
  Order = require('../../models/Order');
  referralService = require('../../services/referralService');

  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use('/api/items', require('../items'));
  app.use('/api/products', require('../products'));
  // Stub authentication for seller-scoped routes (production sets req.user
  // via upstream auth middleware).
  app.use('/api/seller', (req, _res, next) => {
    req.user = { _id: sellerId };
    next();
  }, require('../seller'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Marketplace listing authority', () => {
  it('C: pending/draft listings never appear in the public list', async () => {
    await makeArtifact({ name: 'Visible Item', slug: 'visible-item-phase3' });
    await makeArtifact({ name: 'Hidden Draft', slug: 'hidden-draft-phase3', status: 'draft' });
    const res = await request(app).get('/api/items?limit=50');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const slugs = res.body.items.map((i) => i.slug);
    expect(slugs).toContain('visible-item-phase3');
    expect(slugs).not.toContain('hidden-draft-phase3');
  });

  it('M: ids revalidation returns only published records, ignores the rest', async () => {
    const pub = await makeArtifact({ name: 'Cart Item', slug: 'cart-item-phase3' });
    const draft = await makeArtifact({ name: 'Draft Item', slug: 'draft-item-phase3', status: 'draft' });
    const res = await request(app).get(
      `/api/items?ids=${pub._id},${draft._id},not-an-id-123&limit=50`
    );
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const returned = res.body.items.map((i) => String(i._id || i.id));
    expect(returned).toContain(String(pub._id));
    expect(returned).not.toContain(String(draft._id));
  });
});

describe('Product visibility', () => {
  it('draft products are not publicly readable; published ones are', async () => {
    const userId = new mongoose.Types.ObjectId();
    const pub = await ProductType.create({
      name: 'Pub Product', description: 'd', price: 10,
      productType: 'physical_good', createdBy: userId, status: 'published',
    });
    const draft = await ProductType.create({
      name: 'Draft Product', description: 'd', price: 10,
      productType: 'physical_good', createdBy: userId, status: 'draft',
    });
    const okRes = await request(app).get(`/api/products/${pub._id}`);
    expect(okRes.status).toBe(200);
    const draftRes = await request(app).get(`/api/products/${draft._id}`);
    expect(draftRes.status).toBe(404);
  });
});

describe('Seller scoping (creator field authority)', () => {
  it('seller products/dashboard use the Artifact creator field', async () => {
    await Shop.create({ userId: sellerId, shopName: 'Phase3 Shop', slug: 'phase3-shop' });
    await makeArtifact({ name: 'Seller Item', slug: 'seller-item-phase3' });
    const res = await request(app).get('/api/seller/products');
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBeGreaterThan(0);
    expect(res.body.products.length).toBeGreaterThan(0);
  });
});

describe('Production entry mounts the canonical commerce routes', () => {
  it('serverless app serves checkout/orders/inquiries/sales/seller/products', () => {
    const serverlessApp = require('../../api/index-serverless');
    const paths = new Set();
    for (const layer of serverlessApp._router?.stack || []) {
      if (layer.route) {
        paths.add(layer.route.path);
      } else if (layer.name === 'router' && layer.regexp) {
        paths.add(String(layer.regexp));
      }
    }
    const dump = [...paths].join('\n');
    for (const expected of ['checkout', 'orders', 'item-inquiries', 'sales', 'seller', 'products']) {
      expect(dump).toContain(expected);
    }
  });
});

describe('Referral settlement guards', () => {
  it('T/U: unknown referral code settles nothing and invents no commission', async () => {
    const order = await Order.create({
      itemId: new mongoose.Types.ObjectId(),
      stripeSessionId: `test_sess_phase3_${Date.now()}`,
      amountTotal: 10000,
      attribution: { referralCode: 'ZZZZZZ' },
    });
    const result = await referralService.settleReferralForOrder(order, { amountCents: 10000 });
    expect(result.settled).toBe(false);
    const fresh = await Order.findById(order._id).lean();
    expect(fresh.commissionAmountCents || 0).toBe(0);
  });

  it('W: an order that fails before settlement carries no commission', async () => {
    const order = await Order.create({
      itemId: new mongoose.Types.ObjectId(),
      stripeSessionId: `test_sess_phase3_fail_${Date.now()}`,
      amountTotal: 5000,
      paymentStatus: 'cancelled',
      attribution: {},
    });
    const result = await referralService.settleReferralForOrder(order, { amountCents: 5000 });
    expect(result.settled).toBe(false);
  });
});
