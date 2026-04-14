// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let app;
let GovernanceProposal;

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

async function getUserIdByEmail(email) {
  const user = await mongoose.connection.collection('users').findOne({ email });
  expect(user?._id).toBeTruthy();
  return user._id;
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
    // eslint-disable-next-line global-require
    GovernanceProposal = require('../models/GovernanceProposal');
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

  it('reports admin decision and lifecycle mismatches in sync-health endpoint', async () => {
    const adminEmail = `admin-sync-${Date.now()}@example.com`;
    await registerUser({ name: 'Sync Admin', email: adminEmail });
    await promoteUserToAdmin(adminEmail);
    const adminToken = await loginUser(adminEmail);
    const adminUserId = await getUserIdByEmail(adminEmail);

    const proposal = await GovernanceProposal.create({
      title: 'Lifecycle sync health test proposal',
      summary: 'Used by test to validate decision-to-lifecycle mismatch reporting.',
      createdBy: adminUserId,
      status: 'conference_queue',
    });

    const responseSeed = await request(app)
      .put(`/api/governance/admin-responses/${proposal._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'accepted',
        reason: 'Approved by admin but lifecycle intentionally not advanced for mismatch test.',
      });

    expect(responseSeed.status).toBe(200);
    expect(responseSeed.body?.ok).toBe(true);

    const healthRes = await request(app)
      .get('/api/governance/admin-responses/sync-health')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(healthRes.status).toBe(200);
    expect(healthRes.body?.ok).toBe(true);
    expect(Number(healthRes.body?.summary?.total || 0)).toBeGreaterThan(0);

    const match = (healthRes.body?.items || []).find((item) => item.proposalId === String(proposal._id));
    expect(match).toBeTruthy();
    expect(match.adminDecision).toBe('accepted');
    expect(match.expectedLifecycleStatus).toBe('outcome_published');
    expect(match.actualLifecycleStatus).toBe('conference_queue');
    expect(match.syncState).toBe('mismatch');
  });

  it('repairs lifecycle mismatch to expected status from admin decision', async () => {
    const adminEmail = `admin-repair-${Date.now()}@example.com`;
    await registerUser({ name: 'Repair Admin', email: adminEmail });
    await promoteUserToAdmin(adminEmail);
    const adminToken = await loginUser(adminEmail);
    const adminUserId = await getUserIdByEmail(adminEmail);

    const proposal = await GovernanceProposal.create({
      title: 'Lifecycle repair test proposal',
      summary: 'Used by test to validate lifecycle repair endpoint.',
      createdBy: adminUserId,
      status: 'conference_queue',
    });

    const responseSeed = await request(app)
      .put(`/api/governance/admin-responses/${proposal._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'accepted',
        reason: 'Intentional mismatch before repair.',
      });

    expect(responseSeed.status).toBe(200);
    expect(responseSeed.body?.ok).toBe(true);

    const repairRes = await request(app)
      .post(`/api/governance/admin-responses/${proposal._id}/repair-lifecycle`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(repairRes.status).toBe(200);
    expect(repairRes.body?.ok).toBe(true);
    expect(repairRes.body?.status).toBe('outcome_published');

    const healthRes = await request(app)
      .get('/api/governance/admin-responses/sync-health')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(healthRes.status).toBe(200);
    const match = (healthRes.body?.items || []).find((item) => item.proposalId === String(proposal._id));
    expect(match).toBeTruthy();
    expect(match.syncState).toBe('synced');
    expect(match.actualLifecycleStatus).toBe('outcome_published');
  });
});
