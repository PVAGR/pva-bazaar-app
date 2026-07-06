// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let app;
let adminToken;

function validQuestions() {
  return [
    {
      id: 'q1',
      prompt: 'How do you recharge?',
      axis: 'EI',
      options: [
        { key: 'A', text: 'With people', pole: 'E' },
        { key: 'B', text: 'Alone', pole: 'I' },
      ],
    },
    {
      id: 'q2',
      prompt: 'How do you learn?',
      axis: 'SN',
      options: [
        { key: 'A', text: 'Hands-on steps', pole: 'S' },
        { key: 'B', text: 'Concepts first', pole: 'N' },
      ],
    },
    {
      id: 'q3',
      prompt: 'How do you decide?',
      axis: 'TF',
      options: [
        { key: 'A', text: 'Logic first', pole: 'T' },
        { key: 'B', text: 'Values first', pole: 'F' },
      ],
    },
    {
      id: 'q4',
      prompt: 'How do you execute?',
      axis: 'JP',
      options: [
        { key: 'A', text: 'Structured plans', pole: 'J' },
        { key: 'B', text: 'Adaptive flow', pole: 'P' },
      ],
    },
  ];
}

function buildSnapshot(overrides = {}) {
  return {
    version: 1,
    quiz: {
      title: 'Snapshot Quiz',
      intro: 'Snapshot intro',
      questions: validQuestions(),
      ...(overrides.quiz || {}),
    },
    taxonomy: {
      categories: ['energy', 'water'],
      domains: ['infrastructure'],
      roles: ['operator', 'trainer'],
      domainRoles: {
        infrastructure: ['operator'],
      },
      ...(overrides.taxonomy || {}),
    },
  };
}

describe('Library intelligence snapshot import/export (backend)', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    process.env.ALLOWED_ORIGIN = 'http://localhost';
    process.env.NODE_ENV = 'test';

    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    adminToken = jwt.sign({ role: 'admin', username: 'admin-test' }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Import after env is configured.
    // eslint-disable-next-line global-require
    app = require('../api/index.js');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('rejects snapshot import when payload is missing', async () => {
    const res = await request(app)
      .post('/api/admin/library-intelligence/snapshot/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body?.ok).toBe(false);
    expect(String(res.body?.error || '')).toContain('snapshot payload is required');
  });

  it('rejects unknown domain or role mappings in snapshot taxonomy', async () => {
    const invalidSnapshot = buildSnapshot({
      taxonomy: {
        categories: ['energy'],
        domains: ['infrastructure'],
        roles: ['operator'],
        domainRoles: {
          unknownDomain: ['operator'],
          infrastructure: ['unknownRole'],
        },
      },
    });

    const res = await request(app)
      .post('/api/admin/library-intelligence/snapshot/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ snapshot: invalidSnapshot });

    expect(res.status).toBe(400);
    expect(res.body?.ok).toBe(false);
    expect(String(res.body?.error || '')).toContain('unknown domains or roles');
    expect(Array.isArray(res.body?.details?.unknownDomains)).toBe(true);
    expect(Array.isArray(res.body?.details?.unknownRoles)).toBe(true);
    expect(res.body.details.unknownDomains).toContain('unknowndomain');
    expect(res.body.details.unknownRoles[0]?.domain).toBe('infrastructure');
    expect(res.body.details.unknownRoles[0]?.roles).toContain('unknownrole');
  });

  it('imports a valid snapshot and returns it on export', async () => {
    const snapshot = buildSnapshot({
      quiz: {
        title: 'Emergency Career Compass',
        intro: 'Choose your survival domain role',
      },
      taxonomy: {
        categories: ['energy', 'medical'],
        domains: ['infrastructure', 'care-response'],
        roles: ['operator', 'specialist', 'trainer'],
        domainRoles: {
          infrastructure: ['operator', 'specialist'],
          'care-response': ['trainer'],
        },
      },
    });

    const importRes = await request(app)
      .post('/api/admin/library-intelligence/snapshot/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ snapshot });

    expect(importRes.status).toBe(200);
    expect(importRes.body?.ok).toBe(true);
    expect(importRes.body?.imported?.questionCount).toBe(4);

    const exportRes = await request(app)
      .get('/api/admin/library-intelligence/snapshot')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body?.ok).toBe(true);
    expect(exportRes.body?.snapshot?.quiz?.title).toBe('Emergency Career Compass');
    expect(exportRes.body?.snapshot?.taxonomy?.domains).toEqual(
      expect.arrayContaining(['care-response', 'infrastructure']),
    );
    expect(exportRes.body?.snapshot?.taxonomy?.domainRoles?.infrastructure).toEqual(
      expect.arrayContaining(['operator', 'specialist']),
    );
  });
});
