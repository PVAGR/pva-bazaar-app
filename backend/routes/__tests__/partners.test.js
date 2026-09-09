// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';

let mongoServer;
let app;
let PartnerSubmission;
let PartnerProfile;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  PartnerSubmission = require('../../models/PartnerSubmission');
  PartnerProfile = require('../../models/PartnerProfile');
  const partnersRouter = require('../partners');

  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use('/api/partners', partnersRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Partner application API (server authority)', () => {
  it('POST /apply rejects missing name/email with 400 and persists nothing', async () => {
    const res = await request(app)
      .post('/api/partners/apply')
      .send({ company: 'No Contact' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(await PartnerSubmission.countDocuments()).toBe(0);
  });

  it('POST /apply persists a Mongo submission and returns its reference id', async () => {
    const res = await request(app)
      .post('/api/partners/apply')
      .send({ name: 'Amina', email: 'amina@example.com', company: 'Amina Foods' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('new');

    const saved = await PartnerSubmission.findOne({ email: 'amina@example.com' }).lean();
    expect(saved).toBeTruthy();
    expect(saved.name).toBe('Amina');
  });

  it('POST /apply is duplicate-safe: same email returns the existing submission', async () => {
    const first = await request(app)
      .post('/api/partners/apply')
      .send({ name: 'Juma', email: 'juma@example.com', company: 'Juma Traders' });
    const second = await request(app)
      .post('/api/partners/apply')
      .send({ name: 'Juma', email: 'juma@example.com', company: 'Juma Traders' });
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await PartnerSubmission.countDocuments({ email: 'juma@example.com' })).toBe(1);
  });

  it('GET /public lists only approved profiles (pending never leaks)', async () => {
    await PartnerProfile.create({
      businessName: 'Approved Co-op',
      slug: 'approved-co-op',
      ownerName: 'Owner',
      contactEmail: 'approved@example.com',
      status: 'approved',
    });
    await PartnerProfile.create({
      businessName: 'Pending Biz',
      slug: 'pending-biz',
      ownerName: 'Owner',
      contactEmail: 'pending@example.com',
      status: 'pending',
    });

    const res = await request(app).get('/api/partners/public');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const names = res.body.partners.map((p) => p.businessName);
    expect(names).toContain('Approved Co-op');
    expect(names).not.toContain('Pending Biz');
  });

  it('GET /public/:slug returns approved profiles and 404s pending ones', async () => {
    const okRes = await request(app).get('/api/partners/public/approved-co-op');
    expect(okRes.status).toBe(200);
    expect(okRes.body.partner.businessName).toBe('Approved Co-op');

    const missing = await request(app).get('/api/partners/public/pending-biz');
    expect(missing.status).toBe(404);
  });
});
