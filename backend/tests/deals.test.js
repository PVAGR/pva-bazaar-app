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

async function registerUser({ name, email }) {
  const res = await request(app).post('/api/auth/register').send({
    name,
    email,
    password: 'test-password-123',
  });
  expect(res.status).toBe(201);
  expect(res.body?.ok).toBe(true);
  expect(res.body?.token).toBeTruthy();
  return res.body.token;
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

  it('supports authenticated counterparty join, escrow transitions, dispute evidence, and packet generation', async () => {
    const sellerEmail = `seller-${Date.now()}@example.com`;
    const buyerEmail = `buyer-${Date.now()}@example.com`;
    const sellerToken = await registerUser({ name: 'Seller', email: sellerEmail });
    const buyerToken = await registerUser({ name: 'Buyer', email: buyerEmail });

    const create = await request(app)
      .post('/api/deals')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Gem escrow test',
        description: 'Escrow workflow integration test',
        totalAmount: 450,
        currency: 'USD',
        milestones: [{ title: 'Authenticity proof delivered', evidenceType: 'document', status: 'pending' }],
      });
    expect(create.status).toBe(201);
    const dealId = create.body?.item?._id;
    expect(dealId).toBeTruthy();

    const invite = await request(app)
      .post(`/api/deals/${dealId}/invite`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(invite.status).toBe(200);
    const u = new URL(invite.body.joinUrl);
    const qs = u.hash.includes('?') ? u.hash.split('?')[1] : '';
    const joinToken = new URLSearchParams(qs).get('token');
    expect(joinToken).toBeTruthy();

    const joinAuth = await request(app)
      .post('/api/deals/join-authenticated')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ inviteToken: joinToken });
    expect(joinAuth.status).toBe(200);
    expect(joinAuth.body?.ok).toBe(true);

    const customMediatorRequest = await request(app)
      .post(`/api/deals/${dealId}/mediator/request-custom`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        name: 'Trusted Elder',
        email: 'elder@example.org',
        notes: 'Community accepted mediator',
      });
    expect(customMediatorRequest.status).toBe(201);
    expect(customMediatorRequest.body?.item?.mediation?.status).toBe('requested');

    const sellerCannotApprove = await request(app)
      .put(`/api/deals/${dealId}/mediator/approve`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ action: 'approve', note: 'seller cannot self-approve mediator' });
    expect(sellerCannotApprove.status).toBe(403);

    const adminEmail = `admin-${Date.now()}@example.com`;
    await registerUser({ name: 'Admin User', email: adminEmail });
    await promoteUserToAdmin(adminEmail);
    const adminToken = await loginUser(adminEmail);

    const adminApproveMediator = await request(app)
      .put(`/api/deals/${dealId}/mediator/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve', note: 'approved by admin governance lane' });
    expect(adminApproveMediator.status).toBe(200);
    expect(adminApproveMediator.body?.item?.mediation?.status).toBe('approved');
    expect(adminApproveMediator.body?.item?.mediatorId).toBeTruthy();

    const duplicateApproveBlocked = await request(app)
      .put(`/api/deals/${dealId}/mediator/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve', note: 'second pass should fail' });
    expect(duplicateApproveBlocked.status).toBe(409);

    const buyerList = await request(app)
      .get('/api/deals')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(buyerList.status).toBe(200);
    expect(Array.isArray(buyerList.body?.items)).toBe(true);
    expect(buyerList.body.items.some((d) => d._id === dealId)).toBe(true);

    const mockFund = await request(app)
      .post(`/api/deals/${dealId}/escrow/mock-fund`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ amount: 450, currency: 'USD', proofNote: 'Mock transfer screenshot confirmed' });
    expect(mockFund.status).toBe(200);
    expect(mockFund.body?.item?.escrow?.status).toBe('funded_mock');

    const prematureRelease = await request(app)
      .post(`/api/deals/${dealId}/escrow/release`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({});
    expect(prematureRelease.status).toBe(400);

    const confirmReceipt = await request(app)
      .post(`/api/deals/${dealId}/escrow/confirm-receipt`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({});
    expect(confirmReceipt.status).toBe(200);
    expect(confirmReceipt.body?.item?.escrow?.status).toBe('buyer_confirmed');

    const release = await request(app)
      .post(`/api/deals/${dealId}/escrow/release`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({});
    expect(release.status).toBe(200);
    expect(release.body?.item?.escrow?.status).toBe('released');

    const disputeOpen = await request(app)
      .post(`/api/deals/${dealId}/dispute`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ reason: 'Quality mismatch', details: 'Inclusion grade differs' });
    expect(disputeOpen.status).toBe(201);
    expect(disputeOpen.body?.item?.dispute?.status).toBe('open');

    const disputeEvidence = await request(app)
      .post(`/api/deals/${dealId}/dispute/evidence`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ note: 'Lab screenshot attached', attachmentUrl: 'https://example.com/proof.png' });
    expect(disputeEvidence.status).toBe(201);
    expect(Array.isArray(disputeEvidence.body?.dispute?.evidence)).toBe(true);

    const resolve = await request(app)
      .put(`/api/deals/${dealId}/dispute/resolve`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        decision: 'refund',
        resolutionCode: 'EVIDENCE_FAVORS_BUYER',
        note: 'Seller approved refund after evidence review',
      });
    expect(resolve.status).toBe(200);
    expect(resolve.body?.item?.escrow?.status).toBe('refunded');
    expect(resolve.body?.item?.dispute?.resolutionCode).toBe('EVIDENCE_FAVORS_BUYER');
    expect(resolve.body?.item?.dispute?.resolutionHash).toBeTruthy();

    const certificate = await request(app)
      .get(`/api/deals/${dealId}/reports/resolution-certificate`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(certificate.status).toBe(200);
    expect(certificate.body?.certificate?.certificateHash).toBeTruthy();
    expect(certificate.body?.certificate?.resolutionHash).toBe(resolve.body?.item?.dispute?.resolutionHash);

    const bundle = await request(app)
      .get(`/api/deals/${dealId}/reports/export-bundle?queueStatus=failed`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(bundle.status).toBe(200);
    expect(bundle.body?.bundle?.bundleHash).toBeTruthy();
    expect(bundle.body?.bundle?.certificate?.certificateType).toBe('deal-resolution-certificate-v1');

    const packetForbidden = await request(app)
      .post(`/api/deals/${dealId}/reports/fraud-packet`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        outbound: {
          sendRequested: true,
          approvedByAdmin: false,
          targets: ['FTC', 'FIA Pakistan', 'FBI IC3'],
        },
      });
    expect(packetForbidden.status).toBe(403);

    const adminOutboundPacket = await request(app)
      .post(`/api/deals/${dealId}/reports/fraud-packet`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        outbound: {
          sendRequested: true,
          approvedByAdmin: true,
          targets: ['FTC', 'FIA Pakistan', 'FBI IC3'],
        },
      });
    expect(adminOutboundPacket.status).toBe(200);
    expect(adminOutboundPacket.body?.ok).toBe(true);
    expect(adminOutboundPacket.body?.packet?.deal?.id).toBe(String(dealId));
    expect(adminOutboundPacket.body?.packet?.outbound?.queue?.status).toBe('queued');
    const packetId = adminOutboundPacket.body?.packet?.packetId;
    expect(packetId).toBeTruthy();

    const queueView = await request(app)
      .get(`/api/deals/${dealId}/reports/outbound-queue`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(queueView.status).toBe(200);
    expect(Array.isArray(queueView.body?.queue)).toBe(true);
    expect(queueView.body.queue.some((q) => q.packetId === packetId)).toBe(true);

    const failedOnlyQueue = await request(app)
      .get(`/api/deals/${dealId}/reports/outbound-queue?status=failed`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(failedOnlyQueue.status).toBe(200);
    expect(failedOnlyQueue.body?.queue?.every((q) => q.status === 'failed')).toBe(true);

    const queueMarkFailed = await request(app)
      .put(`/api/deals/${dealId}/reports/outbound/${packetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'failed', lastError: 'Gateway timeout' });
    expect(queueMarkFailed.status).toBe(200);
    expect(queueMarkFailed.body?.queue?.[0]?.nextAttemptAt || queueMarkFailed.body?.item?.outboundDispatchQueue?.[0]?.nextAttemptAt).toBeTruthy();

    const queueMarkSent = await request(app)
      .put(`/api/deals/${dealId}/reports/outbound/${packetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'sent' });
    expect(queueMarkSent.status).toBe(200);

    const postFinalizeMockFund = await request(app)
      .post(`/api/deals/${dealId}/escrow/mock-fund`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ amount: 100, currency: 'USD', proofNote: 'retry' });
    expect(postFinalizeMockFund.status).toBe(409);
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

