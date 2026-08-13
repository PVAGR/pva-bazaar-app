/**
 * Referral / Kickback Program Tests
 * Covers the code registration, resolution, automatic commission settlement
 * (idempotency), and reversal flow for the referral engine.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const ReferralCode = require('../../models/ReferralCode');
const Payout = require('../../models/Payout');
const Order = require('../../models/Order');
const referralService = require('../../services/referralService');

let app;
let mongoServer;
let orderSeq = 0;

async function makeOrder(overrides = {}) {
  orderSeq += 1;
  return Order.create({
    itemId: new mongoose.Types.ObjectId(),
    stripeSessionId: `test_sess_${Date.now()}_${orderSeq}`,
    amountTotal: 10000,
    attribution: {},
    ...overrides,
  });
}

describe('Referral Module', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.ALLOWED_ORIGIN = 'http://localhost';

    // Import after env is set so middleware uses the right config.
    app = require('../../api/index.js');
    await app.connectToDatabase();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('Registration - POST /api/referrals/register', () => {
    it('rejects requests without a valid email (400)', async () => {
      const res = await request(app)
        .post('/api/referrals/register')
        .send({ name: 'No Email' })
        .expect(400);
      expect(res.body).toHaveProperty('ok', false);
    });

    it('issues a referral code for a valid email', async () => {
      const res = await request(app)
        .post('/api/referrals/register')
        .send({ email: 'craftsman@example.com', name: 'Amina' })
        .expect(201);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body.data).toHaveProperty('code');
      expect(res.body.data.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(res.body.data.email).toBe('craftsman@example.com');
      expect(res.body.referralUrl).toContain(`?ref=${res.body.data.code}`);
    });

    it('returns the same code for a duplicate registration', async () => {
      const first = await request(app)
        .post('/api/referrals/register')
        .send({ email: 'repeat@example.com' });
      const second = await request(app)
        .post('/api/referrals/register')
        .send({ email: 'repeat@example.com' });
      expect(second.status).toBe(201);
      expect(second.body.data.code).toBe(first.body.data.code);
      const count = await ReferralCode.countDocuments({ email: 'repeat@example.com' });
      expect(count).toBe(1);
    });
  });

  describe('Resolution - GET /api/referrals/resolve/:code', () => {
    it('resolves an active code', async () => {
      const reg = await request(app)
        .post('/api/referrals/register')
        .send({ email: 'linda@example.com', name: 'Linda' });
      const code = reg.body.data.code;
      const res = await request(app).get(`/api/referrals/resolve/${code}`).expect(200);
      expect(res.body).toHaveProperty('valid', true);
      expect(res.body.code).toBe(code);
    });

    it('returns 404 for an unknown code', async () => {
      await request(app).get('/api/referrals/resolve/ZZZZZZ').expect(404);
    });
  });

  describe('Settlement - referralService.settleReferralForOrder', () => {
    it('does not settle orders without attribution', async () => {
      const order = await makeOrder();
      const result = await referralService.settleReferralForOrder(order);
      expect(result.settled).toBe(false);
      expect(result.reason).toBe('no_referral');
    });

    it('settles 10% commission on an attributed paid order', async () => {
      const reg = await referralService.registerReferral({ email: 'ravi@example.com', name: 'Ravi' });
      const order = await makeOrder({
        amountTotal: 10000,
        attribution: { referralCode: reg.record.code },
      });
      const result = await referralService.settleReferralForOrder(order, { amountCents: 10000 });
      expect(result.settled).toBe(true);
      expect(result.commissionAmountCents).toBe(1000);

      const code = await ReferralCode.findOne({ email: 'ravi@example.com' });
      expect(code.sales).toBe(1);
      expect(code.totalCommissionsCents).toBe(1000);
      expect(code.pendingCents).toBe(1000);
      expect(code.pendingOrders).toHaveLength(1);

      const payout = await Payout.findOne({ batchId: `auto_${order._id}` });
      expect(payout).toBeTruthy();
      expect(payout.status).toBe('ready');
      expect(payout.netPayoutCents).toBe(1000);
      expect(payout.creatorHandle).toBe(reg.record.code);
    });

    it('is idempotent - never double-settles the same order', async () => {
      const reg = await referralService.registerReferral({ email: 'kofi@example.com' });
      const order = await makeOrder({
        amountTotal: 5000,
        attribution: { referralCode: reg.record.code },
      });
      const first = await referralService.settleReferralForOrder(order, { amountCents: 5000 });
      const second = await referralService.settleReferralForOrder(order, { amountCents: 5000 });
      expect(first.settled).toBe(true);
      expect(second.settled).toBe(false);
      expect(second.reason).toBe('already_settled');

      const code = await ReferralCode.findOne({ email: 'kofi@example.com' });
      expect(code.sales).toBe(1);
      expect(code.totalCommissionsCents).toBe(500);
      expect(code.pendingOrders).toHaveLength(1);
    });

    it('ignores suspended / unknown codes', async () => {
      const reg = await referralService.registerReferral({ email: 'suspended@example.com' });
      await ReferralCode.updateOne({ email: 'suspended@example.com' }, { $set: { status: 'suspended' } });
      const order = await makeOrder({
        amountTotal: 8000,
        attribution: { referralCode: reg.record.code },
      });
      const result = await referralService.settleReferralForOrder(order, { amountCents: 8000 });
      expect(result.settled).toBe(false);
      expect(result.reason).toBe('code_inactive');
    });

    it('reverses a settlement on refund', async () => {
      const reg = await referralService.registerReferral({ email: 'grace@example.com' });
      const order = await makeOrder({
        amountTotal: 20000,
        attribution: { referralCode: reg.record.code },
      });
      await referralService.settleReferralForOrder(order, { amountCents: 20000 });

      const reversal = await referralService.reverseReferralForOrder(order);
      expect(reversal.reversed).toBe(true);

      const code = await ReferralCode.findOne({ email: 'grace@example.com' });
      expect(code.sales).toBe(0);
      expect(code.totalCommissionsCents).toBe(0);
      expect(code.pendingCents).toBe(0);
      expect(code.pendingOrders).toHaveLength(0);

      const payout = await Payout.findOne({ batchId: `auto_${order._id}` });
      expect(payout.status).toBe('failed');
      expect(payout.failureReason).toBe('order_refunded');
    });
  });

  describe('Earnings lookup - POST /api/referrals/earnings', () => {
    it('returns the owners earnings summary', async () => {
      const reg = await referralService.registerReferral({ email: 'dara@example.com', name: 'Dara' });
      const order = await makeOrder({
        amountTotal: 4000,
        itemSnapshot: { name: 'Ceramic vase' },
        attribution: { referralCode: reg.record.code },
      });
      await referralService.settleReferralForOrder(order, { amountCents: 4000 });

      const res = await request(app)
        .post('/api/referrals/earnings')
        .send({ email: 'dara@example.com' })
        .expect(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.code).toBe(reg.record.code);
      expect(res.body.data.totalCommissionsCents).toBe(400);
      expect(res.body.data.recent).toHaveLength(1);
      expect(res.body.data.recent[0].itemName).toBe('Ceramic vase');
    });
  });
});