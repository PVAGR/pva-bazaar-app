// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let app;

async function registerUser({ name, email }) {
  const res = await request(app).post('/api/auth/register').send({
    name,
    email,
    password: 'test-password-123',
  });
  expect(res.status).toBe(201);
  expect(res.body?.ok).toBe(true);
  expect(res.body?.token).toBeTruthy();
  return { token: res.body.token, email };
}

async function loginUser(email) {
  const res = await request(app).post('/api/auth/login').send({
    email,
    password: 'test-password-123',
  });
  expect(res.status).toBe(200);
  expect(res.body?.token).toBeTruthy();
  return res.body.token;
}

async function promoteUserToAdmin(email) {
  const result = await mongoose.connection.collection('users').updateOne({ email }, { $set: { role: 'admin' } });
  expect(result?.matchedCount || 0).toBeGreaterThan(0);
}

describe('Governance execution timeline endpoints', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    process.env.ALLOWED_ORIGIN = 'http://localhost';
    process.env.NODE_ENV = 'test';

    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    // Import app after env is configured.
    // eslint-disable-next-line global-require
    app = require('../api/index.js');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('rejects execution updates from non-committee users', async () => {
    const proposalId = 'PROP-EXEC-001';
    const { token: memberToken } = await registerUser({
      name: 'Member User',
      email: `member-${Date.now()}@example.com`,
    });

    const res = await request(app)
      .post(`/api/governance/proposals/${proposalId}/execution/updates`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        message: 'Attempted unauthorized execution update',
        progressPercent: 10,
      });

    expect(res.status).toBe(403);
    expect(res.body?.ok).toBe(false);
  });

  it('blocks execution updates unless admin decision is execution-eligible', async () => {
    const proposalId = 'PROP-EXEC-002';
    const adminEmail = `admin-${Date.now()}@example.com`;
    await registerUser({ name: 'Admin User', email: adminEmail });
    await promoteUserToAdmin(adminEmail);
    const adminToken = await loginUser(adminEmail);

    const seedResponse = await request(app)
      .put(`/api/governance/admin-responses/${proposalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'public',
        reason: 'Needs more review before execution',
      });

    expect(seedResponse.status).toBe(200);
    expect(seedResponse.body?.ok).toBe(true);

    const updateRes = await request(app)
      .post(`/api/governance/proposals/${proposalId}/execution/updates`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Should be blocked until accepted/in_execution/completed',
        progressPercent: 20,
      });

    expect(updateRes.status).toBe(409);
    expect(updateRes.body?.ok).toBe(false);
    expect(String(updateRes.body?.error || '')).toContain('Execution updates require decision');
  });

  it('persists execution updates and returns them on timeline endpoint', async () => {
    const proposalId = 'PROP-EXEC-003';
    const adminEmail = `admin2-${Date.now()}@example.com`;
    await registerUser({ name: 'Admin User 2', email: adminEmail });
    await promoteUserToAdmin(adminEmail);
    const adminToken = await loginUser(adminEmail);

    const seedResponse = await request(app)
      .put(`/api/governance/admin-responses/${proposalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'accepted',
        reason: 'Approved for implementation',
        executionBlock: {
          owner: 'Infrastructure Cell',
          milestones: [{ id: 'M-1', title: 'Site survey complete', done: true }],
          progressPercent: 25,
          latestUpdate: 'Initial mobilization complete',
          completed: false,
        },
      });

    expect(seedResponse.status).toBe(200);
    expect(seedResponse.body?.ok).toBe(true);

    const updateRes = await request(app)
      .post(`/api/governance/proposals/${proposalId}/execution/updates`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Second milestone completed and field team deployed',
        progressPercent: 55,
        milestone: {
          id: 'M-2',
          title: 'Field deployment',
          done: true,
        },
      });

    expect(updateRes.status).toBe(201);
    expect(updateRes.body?.ok).toBe(true);
    expect(Number(updateRes.body?.executionBlock?.progressPercent || 0)).toBe(55);
    expect(updateRes.body?.updatesCount).toBeGreaterThanOrEqual(1);

    const timelineRes = await request(app)
      .get(`/api/governance/proposals/${proposalId}/execution/timeline`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body?.ok).toBe(true);
    expect(timelineRes.body?.proposal).toBe(null);
    expect(Number(timelineRes.body?.execution?.executionBlock?.progressPercent || 0)).toBe(55);
    expect(Array.isArray(timelineRes.body?.execution?.updates)).toBe(true);
    expect(timelineRes.body.execution.updates.length).toBeGreaterThanOrEqual(1);
    expect(timelineRes.body.execution.updates.at(-1)?.message).toContain('Second milestone completed');
  });
});
