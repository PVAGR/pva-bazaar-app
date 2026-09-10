// @vitest-environment node
// Final UX patch: combined public blog feed (published ArchiveEntry + Blog).
// Server-authoritative merge, stable prefixed ids, no draft/pending leaks,
// bounded limit, date normalization publishedAt -> createdAt -> updatedAt.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';

let mongoServer;
let app;
let ArchiveEntry;
let Blog;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  ArchiveEntry = require('../../models/ArchiveEntry');
  Blog = require('../../models/Blog');
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use('/api/blog-feed', require('../blogFeed'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('GET /api/blog-feed (public combined feed)', () => {
  it('merges published ArchiveEntry and Blog records into one feed', async () => {
    await ArchiveEntry.create({
      title: 'Archive Post',
      status: 'published',
      category: 'Personal',
      description: 'Owner archive post',
      content: 'Body',
      wordCount: 10,
    });
    await Blog.create({ slug: 'blog-post', title: 'Blog Post', content: 'Blog body', status: 'published' });

    const res = await request(app).get('/api/blog-feed');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const ids = res.body.items.map((i) => i.id);
    expect(ids.some((id) => id.startsWith('archive:'))).toBe(true);
    expect(ids.some((id) => id.startsWith('blog:'))).toBe(true);
  });

  it('excludes archive drafts and blog pending records', async () => {
    await ArchiveEntry.create({ title: 'Draft Entry', status: 'draft', content: 'hidden' });
    await Blog.create({ slug: 'pending-post', title: 'Pending', content: 'hidden', status: 'pending' });

    const res = await request(app).get('/api/blog-feed');
    const titles = res.body.items.map((i) => i.title);
    expect(titles).not.toContain('Draft Entry');
    expect(titles).not.toContain('Pending');
  });

  it('sorts newest-first using normalized publishedAt (createdAt fallback)', async () => {
    await ArchiveEntry.deleteMany({});
    await Blog.deleteMany({});
    await ArchiveEntry.create({ title: 'Older Archive', status: 'published', createdAt: new Date('2026-01-01') });
    await Blog.create({ slug: 'newer-blog', title: 'Newer Blog', status: 'published', createdAt: new Date('2026-06-01') });

    const res = await request(app).get('/api/blog-feed');
    expect(res.body.items[0].title).toBe('Newer Blog');
    expect(res.body.items[1].title).toBe('Older Archive');
  });

  it('clamps the limit to [1, 50]', async () => {
    const res = await request(app).get('/api/blog-feed?limit=5000');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeLessThanOrEqual(50);
  });

  it('returns feed items with stable ids and frontend paths', async () => {
    const res = await request(app).get('/api/blog-feed');
    for (const item of res.body.items) {
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.path.startsWith('/blog/')).toBe(true);
      expect(item.publishedAt).toBeTruthy();
    }
  });

  it('does not leak admin/draft-only fields', async () => {
    const res = await request(app).get('/api/blog-feed');
    for (const item of res.body.items) {
      expect(item.status).toBeUndefined();
      expect(item.editHashHashed).toBeUndefined();
      expect(item.owner).toBeUndefined();
    }
  });
});
