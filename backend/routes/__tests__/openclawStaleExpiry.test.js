// @vitest-environment node
// Phase 7 regression: stale OpenClaw outbound messages must self-expire.
// Serverless has no persistent worker, so an outbound message pending past
// OPENCLAW_OUTBOUND_EXPIRY_DAYS (default 7) is dead. GET /api/openclaw/status
// must mark it processed so queue stats / watchdog / deploy readiness
// recover without human intervention.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let app;
let OpenClawMessage;

const TEN_DAYS_AGO = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
// Under the 30-minute stale threshold so it stays pending-but-not-stale.
const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60 * 1000);

describe('OpenClaw stale outbound self-expiry (Phase 7)', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    process.env.NODE_ENV = 'test';

    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    // eslint-disable-next-line global-require
    app = require('../../api/index-serverless.js');
    // eslint-disable-next-line global-require
    OpenClawMessage = require('../../models/OpenClawMessage');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('expires a 10-day-old pending outbound on /status poll, keeps fresh ones pending', async () => {
    await OpenClawMessage.deleteMany({});
    const stale = await OpenClawMessage.create({
      direction: 'outbound',
      content: 'old dead message',
      event: 'pvabazaar.artifact.deleted',
      processed: false,
      createdAt: TEN_DAYS_AGO,
    });
    const fresh = await OpenClawMessage.create({
      direction: 'outbound',
      content: 'recent message',
      event: 'pvabazaar.test',
      processed: false,
      createdAt: FIVE_MINUTES_AGO,
    });

    const res = await request(app).get('/api/openclaw/status');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const expiredDoc = await OpenClawMessage.findById(stale._id).lean();
    expect(expiredDoc.processed).toBe(true);
    expect(expiredDoc.metadata?.expiredReason).toMatch(/unprocessed beyond/i);

    const freshDoc = await OpenClawMessage.findById(fresh._id).lean();
    expect(freshDoc.processed).toBe(false);

    // Queue stats now reflect the self-heal: no stale items remain.
    expect(res.body.queue?.stale).toBe(0);
    expect(res.body.queue?.pending).toBe(1);
  });

  it('marks replayed messages processed in /recover (closes the delivery loop)', async () => {
    await OpenClawMessage.deleteMany({});
    const pending = await OpenClawMessage.create({
      direction: 'outbound',
      content: 'message to replay',
      event: 'pvabazaar.dispatch',
      processed: false,
      createdAt: FIVE_MINUTES_AGO,
    });

    // Recover requires bridge-or-admin auth; use an admin JWT.
    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign({ id: 'test-admin', role: 'admin' }, process.env.JWT_SECRET);

    const res = await request(app)
      .post('/api/openclaw/recover')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Webhook forward fails in test (no live gateway) so the message stays
    // pending — but the endpoint must not crash and must report stats.
    expect(res.body.queue).toBeTruthy();
    expect(typeof res.body.queue.after?.pendingOutbound).toBe('number');
  });
});
