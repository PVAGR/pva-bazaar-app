// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let app;

async function registerAndGetToken() {
  const email = `broker${Date.now()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Broker Test User',
      email,
      password: 'test-password-123',
    });
  expect(res.status).toBe(201);
  expect(res.body?.ok).toBe(true);
  expect(res.body?.token).toBeTruthy();
  return res.body.token;
}

describe('Broker API (commodities, contacts, templates, chat)', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.ALLOWED_ORIGIN = 'http://localhost';
    process.env.NODE_ENV = 'test';

    // eslint-disable-next-line global-require
    app = require('../api/index.js');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('commodities CRUD', async () => {
    const token = await registerAndGetToken();

    const create = await request(app)
      .post('/api/commodities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Kenyan Coffee',
        category: 'Beverages',
        notes: 'Premium Arabica',
        redFlags: ['No phytosanitary cert'],
        greenFlags: ['Direct exporter'],
      });
    expect(create.status).toBe(201);
    expect(create.body?.ok).toBe(true);
    const id = create.body.item?._id;
    expect(id).toBeTruthy();

    const list = await request(app)
      .get('/api/commodities')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body?.ok).toBe(true);
    expect(Array.isArray(list.body?.items)).toBe(true);
    expect(list.body.items.some((x) => x.name === 'Kenyan Coffee')).toBe(true);

    const get = await request(app)
      .get(`/api/commodities/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body?.item?.name).toBe('Kenyan Coffee');

    const update = await request(app)
      .put(`/api/commodities/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Kenyan Coffee Beans', category: 'Beverages' });
    expect(update.status).toBe(200);
    expect(update.body?.item?.name).toBe('Kenyan Coffee Beans');

    const del = await request(app)
      .delete(`/api/commodities/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });

  it('contacts CRUD', async () => {
    const token = await registerAndGetToken();

    const create = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Nairobi Exporter',
        type: 'supplier',
        country: 'Kenya',
        email: 'supplier@kenya.co',
      });
    expect(create.status).toBe(201);
    const id = create.body.item?._id;
    expect(id).toBeTruthy();

    const list = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body?.items?.some((x) => x.name === 'Nairobi Exporter')).toBe(true);

    const get = await request(app)
      .get(`/api/contacts/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body?.item?.country).toBe('Kenya');
  });

  it('templates CRUD', async () => {
    const token = await registerAndGetToken();

    const create = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Coffee Vetting',
        type: 'vetting',
        body: 'What is your FOB price? Do you have phytosanitary cert?',
      });
    expect(create.status).toBe(201);
    const id = create.body.item?._id;
    expect(id).toBeTruthy();

    const list = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body?.items?.some((x) => x.name === 'Coffee Vetting')).toBe(true);
  });

  it('commodities require auth', async () => {
    const res = await request(app).get('/api/commodities');
    expect(res.status).toBe(401);
  });

  it('contacts require auth', async () => {
    const res = await request(app).post('/api/contacts').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('templates require auth', async () => {
    const res = await request(app).get('/api/templates');
    expect(res.status).toBe(401);
  });

  it('chat returns 400 when messages array is missing', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body?.error).toMatch(/messages/);
  });

  it('chat returns 400 when messages is empty', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ messages: [] });
    expect(res.status).toBe(400);
  });

  it('chat returns 503 when OPENAI_API_KEY is not set', async () => {
    const orig = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const res = await request(app)
      .post('/api/chat')
      .send({ messages: [{ role: 'user', content: 'Hello' }] });
    if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
    expect(res.status).toBe(503);
    expect(res.body?.error).toMatch(/OPENAI_API_KEY|not configured/i);
  });
});
