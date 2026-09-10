// @vitest-environment node
// Phase 4 blog publishing trust: server-authoritative state, draft/public
// separation, owner auth, and Node 20-safe dependency closure.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';

let mongoServer;
let app;
let Blog;

const TEST_JWT_SECRET = 'pva-blog-phase4-test-secret';
const adminToken = jwt.sign(
  { id: '000000000000000000000001', role: 'admin' },
  TEST_JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '1h' },
);

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  Blog = require('../../models/Blog');
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use('/api/blogs', require('../blogs'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Public blog read surfaces (server authority)', () => {
  it('A: public list returns only published server posts', async () => {
    await Blog.create({ slug: 'server-post-a', title: 'Server Post', content: 'Body A', status: 'published', authorName: 'Owner' });
    await Blog.create({ slug: 'hidden-draft-a', title: 'Draft', content: 'Hidden', status: 'pending' });
    const res = await request(app).get('/api/blogs');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const slugs = res.body.blogs.map((b) => b.slug);
    expect(slugs).toContain('server-post-a');
    expect(slugs).not.toContain('hidden-draft-a');
    expect(res.body.blogs[0].title).toBe('Server Post');
  });

  it('B: draft/pending posts are excluded publicly and by slug', async () => {
    await Blog.create({ slug: 'pending-b', title: 'Pending Draft', content: 'Not ready', status: 'pending' });
    const listRes = await request(app).get('/api/blogs');
    expect(listRes.body.blogs.map((b) => b.slug)).not.toContain('pending-b');
    const bySlug = await request(app).get('/api/blogs/pending-b');
    expect(bySlug.status).toBe(404);
  });

  it('C: public slug lookup returns the exact published server record', async () => {
    await Blog.create({ slug: 'server-post-c', title: 'Post C', content: 'Full body C', status: 'published', authorName: 'Richard Torres' });
    const res = await request(app).get('/api/blogs/server-post-c');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.blog.title).toBe('Post C');
    expect(res.body.blog.content).toBe('Full body C');
    expect(res.body.blog.authorName).toBe('Richard Torres');
    expect(res.body.blog.status).toBe('published');
  });
});

describe('Owner create / edit / publish (auth required)', () => {
  it('H: unauthorized create/edit/publish/delete are rejected', async () => {
    const createRes = await request(app).post('/api/blogs/setup').send({ slug: 'no-auth', title: 'X' });
    expect([401, 403]).toContain(createRes.status);
    const publishRes = await request(app).post('/api/blogs/no-auth/publish').send({});
    expect([401, 403]).toContain(publishRes.status);
    const deleteRes = await request(app).delete('/api/blogs/no-auth');
    expect([401, 403]).toContain(deleteRes.status);
    const updateRes = await request(app).post('/api/blogs/no-auth/update').send({});
    expect(updateRes.status).toBe(400);
  });

  it('D: authorized save succeeds (setup creates a pending draft with an edit secret)', async () => {
    const res = await request(app)
      .post('/api/blogs/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: 'owner-draft-d', title: 'Owner Draft D' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe('pending');
    expect(typeof res.body.editSecret).toBe('string');
    expect(res.body.editSecret.length).toBeGreaterThan(10);

    const listRes = await request(app).get('/api/blogs');
    expect(listRes.body.blogs.map((b) => b.slug)).not.toContain('owner-draft-d');
  });

  it('E: failed save (bad edit secret) produces no false success', async () => {
    const bad = await request(app)
      .post('/api/blogs/owner-draft-d/update')
      .send({ edit: 'wrong-secret', title: 'Tampered', content: 'Should not persist' });
    expect(bad.status).toBe(403);
    const fresh = await Blog.findOne({ slug: 'owner-draft-d' }).lean();
    expect(fresh.content).toBe('');
    expect(fresh.title).toBe('Owner Draft D');
  });

  it('D2: authorized update saves content while keeping the draft pending', async () => {
    const setupRes = await request(app)
      .post('/api/blogs/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: 'owner-draft-d', title: 'Owner Draft D' });
    const saved = await request(app)
      .post('/api/blogs/owner-draft-d/update')
      .send({ edit: setupRes.body.editSecret, title: 'Owner Draft D', content: 'Real body content', authorName: 'Richard Torres' });
    expect(saved.status).toBe(200);
    expect(saved.body.status).toBe('pending');
    const fresh = await Blog.findOne({ slug: 'owner-draft-d' }).lean();
    expect(fresh.content).toBe('Real body content');
    expect(fresh.authorName).toBe('Richard Torres');
    expect(fresh.status).toBe('pending');
  });

  it('F: authorized publish flips the draft to published and the public API confirms it', async () => {
    const res = await request(app)
      .post('/api/blogs/owner-draft-d/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');

    const bySlug = await request(app).get('/api/blogs/owner-draft-d');
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.blog.content).toBe('Real body content');
    const list = await request(app).get('/api/blogs');
    expect(list.body.blogs.map((b) => b.slug)).toContain('owner-draft-d');
  });

  it('G: publish of an empty draft is rejected and leaves no published state', async () => {
    await request(app)
      .post('/api/blogs/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: 'empty-draft-g', title: 'Empty Draft G' });
    const res = await request(app)
      .post('/api/blogs/empty-draft-g/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    const fresh = await Blog.findOne({ slug: 'empty-draft-g' }).lean();
    expect(fresh.status).toBe('pending');
    const bySlug = await request(app).get('/api/blogs/empty-draft-g');
    expect(bySlug.status).toBe(404);
  });

  it('publish requires an admin session (user tokens and junk are rejected)', async () => {
    const userToken = jwt.sign(
      { id: '000000000000000000000009', role: 'user' },
      TEST_JWT_SECRET,
      { algorithm: 'HS256' },
    );
    const asUser = await request(app)
      .post('/api/blogs/owner-draft-d/publish')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect([401, 403]).toContain(asUser.status);
  });

  it('authorized delete removes the post', async () => {
    await Blog.create({ slug: 'to-delete-title', title: 'To Delete', content: 'x', status: 'published' });
    const res = await request(app)
      .delete('/api/blogs/to-delete-title')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const bySlug = await request(app).get('/api/blogs/to-delete-title');
    expect(bySlug.status).toBe(404);
  });
});

describe('Production dependency closure (Node 20 safe)', () => {
  it('L: blog route has no CommonJS require of ESM-only uuid', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'blogs.js'), 'utf8');
    expect(source).not.toContain("require('uuid')");
    expect(source).not.toContain('require("uuid")');
    expect(source).toContain('crypto.randomUUID');
  });

  it('L2: serverless entry mounts the canonical blog router', () => {
    const serverlessApp = require('../../api/index-serverless');
    const layers = serverlessApp._router?.stack || [];
    const dump = layers
      .map((layer) => (layer.route ? layer.route.path : layer && layer.name === 'router' && layer.regexp ? String(layer.regexp) : ''))
      .filter(Boolean)
      .join('\n');
    expect(dump).toContain('blogs');
  });
});

describe('Cross-browser durability (server persistence)', () => {
  it('J: a published post is retrievable by slug from a fresh DB-backed read', async () => {
    await Blog.create({ slug: 'durable-j', title: 'Durable', content: 'Survives refresh', status: 'published' });
    const res = await request(app).get('/api/blogs/durable-j');
    expect(res.status).toBe(200);
    expect(res.body.blog.content).toBe('Survives refresh');
    expect(res.body.blog.updatedAt).toBeTruthy();
  });
});