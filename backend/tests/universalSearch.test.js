// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let app;

describe('Universal Search (backend)', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvabazaar-test';
    process.env.ALLOWED_ORIGIN = 'http://localhost';
    process.env.NODE_ENV = 'test';

    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    // eslint-disable-next-line global-require
    app = require('../api/index-serverless.js');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('Q: returns 400 for missing q parameter', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/required/i);
  });

  it('R: returns 400 for short q parameter', async () => {
    const res = await request(app).get('/api/search?q=a');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/at least 2/i);
  });

  it('S: returns results for valid query', async () => {
    const res = await request(app).get('/api/search?q=test&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.query).toBe('test');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(typeof res.body.count).toBe('number');
  });

  it('T: handles partial failures gracefully', async () => {
    // This test assumes the search endpoint returns failedSources array
    const res = await request(app).get('/api/search?q=test&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('partial');
    expect(res.body).toHaveProperty('failedSources');
    expect(Array.isArray(res.body.failedSources)).toBe(true);
  });

  it('U: returns static fallback when MongoDB unavailable', async () => {
    // Disconnect to simulate unavailable MongoDB
    await mongoose.disconnect();

    // Re-import app to trigger static fallback
    delete require.cache[require.resolve('../api/index-serverless.js')];
    // eslint-disable-next-line global-require
    const appNoDb = require('../api/index-serverless.js');

    const res = await request(appNoDb).get('/api/search?q=test&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.results)).toBe(true);

    // Reconnect for cleanup
    await mongoose.connect(process.env.MONGODB_URI);
  });
});
