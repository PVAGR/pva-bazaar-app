// @vitest-environment node
// Phase 7 regression: OpenClaw bridge auth must FAIL CLOSED.
// Before this phase, `isAuthorized` returned true when OPENCLAW_BRIDGE_SECRET
// was unset, so /api/openclaw/recover, /maintenance/cleanup, /queue-stats,
// /agent-config and friends were publicly callable in production (where the
// secret was never synced to Vercel). These tests pin the fail-closed
// behavior: no secret configured => bridge header path rejects; admin JWT
// remains the operator fallback.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let app;

describe('OpenClaw bridge auth fails closed (Phase 7)', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    process.env.NODE_ENV = 'test';

    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    // eslint-disable-next-line global-require
    app = require('../../api/index-serverless.js');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('rejects queue-stats with no bridge secret configured (401, not 200)', async () => {
    const res = await request(app).get('/api/openclaw/queue-stats');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('rejects recover with no bridge secret configured', async () => {
    const res = await request(app).post('/api/openclaw/recover').send({});
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('rejects maintenance/cleanup with no bridge secret configured', async () => {
    const res = await request(app).post('/api/openclaw/maintenance/cleanup').send({});
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('rejects agent-config with no bridge secret configured', async () => {
    const res = await request(app).get('/api/openclaw/agent-config');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('rejects dispatch with no bridge secret configured', async () => {
    const res = await request(app).post('/api/openclaw/dispatch').send({ message: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('rejects a wrong bridge secret value with 401', async () => {
    const res = await request(app)
      .get('/api/openclaw/queue-stats')
      .set('x-openclaw-secret', 'wrong-secret');
    expect(res.status).toBe(401);
  });

  it('keeps public status endpoint open (health signal, no secrets)', async () => {
    const res = await request(app).get('/api/openclaw/status');
    // Status is intentionally public (used by readiness checks + admin UI).
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.ok).toBe(true);
      // The status payload must never echo secrets.
      const raw = JSON.stringify(res.body);
      expect(raw).not.toMatch(/bridgeSecret/i);
    }
  });
});
