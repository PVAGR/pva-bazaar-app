// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let app;

async function registerAndGetToken() {
  const email = `t${Date.now()}@example.com`;
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test User',
    email,
    password: 'test-password-123',
  });
  expect(res.status).toBe(201);
  expect(res.body?.ok).toBe(true);
  expect(res.body?.token).toBeTruthy();
  return res.body.token;
}

describe('Deals + OAuth (backend)', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.ALLOWED_ORIGIN = 'http://localhost';
    process.env.NODE_ENV = 'test';

    // Twitch status/start needs these when configured.
    process.env.TWITCH_CLIENT_ID = 'test-client-id';
    process.env.TWITCH_CLIENT_SECRET = 'test-client-secret';
    process.env.TWITCH_REDIRECT_URI = 'http://localhost/api/oauth/twitch/callback';

    // Import after env is set so middleware uses the right config.
    // eslint-disable-next-line global-require
    app = require('../api/index.js');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('supports deals CRUD, invite/join, messages, and evidence submission', async () => {
    const token = await registerAndGetToken();

    const create = await request(app)
      .post('/api/deals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Kenya coffee import',
        description: 'Test deal',
        counterparty: { name: 'Nairobi Co', country: 'Kenya' },
        totalAmount: 1000,
        currency: 'USD',
        payments: [{ label: 'Deposit', amount: 300, currency: 'USD', status: 'pending' }],
        milestones: [{ title: 'Tracking number provided', evidenceType: 'tracking_number', status: 'pending' }],
      });
    expect(create.status).toBe(201);
    expect(create.body?.ok).toBe(true);
    const dealId = create.body.item?._id;
    expect(dealId).toBeTruthy();

    const list = await request(app).get('/api/deals').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body?.ok).toBe(true);
    expect(Array.isArray(list.body?.items)).toBe(true);

    const invite = await request(app).post(`/api/deals/${dealId}/invite`).set('Authorization', `Bearer ${token}`);
    expect(invite.status).toBe(200);
    expect(invite.body?.ok).toBe(true);
    expect(typeof invite.body?.joinUrl).toBe('string');

    const u = new URL(invite.body.joinUrl);
    const qs = u.hash.includes('?') ? u.hash.split('?')[1] : '';
    const joinToken = new URLSearchParams(qs).get('token');
    expect(joinToken).toBeTruthy();

    const join = await request(app).get('/api/deals/join').set('Authorization', `Bearer ${joinToken}`);
    expect(join.status).toBe(200);
    expect(join.body?.ok).toBe(true);
    expect(join.body?.item?._id).toBe(dealId);

    const msg = await request(app)
      .post(`/api/deals/${dealId}/messages`)
      .set('Authorization', `Bearer ${joinToken}`)
      .send({ text: 'Hello from counterparty' });
    expect(msg.status).toBe(201);
    expect(msg.body?.ok).toBe(true);
    expect(msg.body?.item?.messages?.at(-1)?.author).toBe('counterparty');

    const milestoneId = msg.body?.item?.milestones?.[0]?._id;
    expect(milestoneId).toBeTruthy();

    const evidence = await request(app)
      .post(`/api/deals/${dealId}/milestones/${milestoneId}/evidence`)
      .set('Authorization', `Bearer ${joinToken}`)
      .send({ evidenceValue: 'TRACK123' });
    expect(evidence.status).toBe(201);
    expect(evidence.body?.ok).toBe(true);
    expect(evidence.body?.item?.milestones?.[0]?.evidenceValue).toBe('TRACK123');
  });

  it('twitch start returns a url in json mode', async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .get('/api/oauth/twitch/start?mode=json')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);
    expect(typeof res.body?.url).toBe('string');
    expect(res.body.url).toMatch(/^https:\/\/id\.twitch\.tv\/oauth2\/authorize\?/);
  });
});

