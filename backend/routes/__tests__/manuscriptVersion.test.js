// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';

let mongoServer;
let app;
let BookProject;
let TEST_BOOK_ID;

function createAuthToken(overrides = {}) {
  const payload = { id: 'test-user-id', email: 'test@test.com', role: 'user', ...overrides };
  return `local.${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters!!!';
  process.env.ALLOWED_ORIGIN = 'http://localhost';
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  // Import models and router after env is set
  BookProject = require('../../models/BookProject');
  const ManuscriptVersion = require('../../models/ManuscriptVersion');
  const bookPublishingRouter = require('../bookPublishing');

  // Must connect before creating test data
  await mongoose.connect(mongoServer.getUri());

  const book = await BookProject.create({
    authorId: 'test-user-id',
    title: 'Version Test Book',
    slug: 'version-test-book',
    manuscriptMarkdown: '# Original\n\nTest manuscript content.',
    status: 'draft',
  });
  TEST_BOOK_ID = book._id.toString();

  app = express();
  app.use(express.json());
  app.use('/api/book-publishing', bookPublishingRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Manuscript Version API', () => {
  const authToken = createAuthToken();

  it('POST /:bookId/versions - creates a version snapshot', async () => {
    const res = await request(app)
      .post(`/api/book-publishing/${TEST_BOOK_ID}/versions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ changeDescription: 'Initial snapshot' });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.version).toBeDefined();
    expect(res.body.version.version).toBe(1);
    expect(res.body.version.manuscriptMarkdown).toBe('# Original\n\nTest manuscript content.');
    expect(typeof res.body.version.wordCount).toBe('number');
    expect(res.body.version.changeDescription).toBe('Initial snapshot');
  });

  it('POST /:bookId/versions - returns 401 without auth', async () => {
    const res = await request(app)
      .post(`/api/book-publishing/${TEST_BOOK_ID}/versions`)
      .send({ changeDescription: 'No auth' });

    expect(res.status).toBe(401);
  });

  it('POST /:bookId/versions - returns 404 for non-existent book', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/book-publishing/${fakeId}/versions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ changeDescription: 'Fake book' });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it('GET /:bookId/versions - lists all versions', async () => {
    const res = await request(app)
      .get(`/api/book-publishing/${TEST_BOOK_ID}/versions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.versions)).toBe(true);
    expect(res.body.versions.length).toBeGreaterThanOrEqual(1);
    // Should not include full manuscript in list response
    expect(res.body.versions[0].manuscriptMarkdown).toBeUndefined();
    // Should include metadata fields
    expect(res.body.versions[0]).toHaveProperty('version');
    expect(res.body.versions[0]).toHaveProperty('wordCount');
    expect(res.body.versions[0]).toHaveProperty('changeDescription');
    expect(res.body.versions[0]).toHaveProperty('createdAt');
  });

  it('GET /:bookId/versions - returns 401 without auth', async () => {
    const res = await request(app)
      .get(`/api/book-publishing/${TEST_BOOK_ID}/versions`);

    expect(res.status).toBe(401);
  });

  it('POST /:bookId/versions - increments version number on subsequent snapshots', async () => {
    await BookProject.findByIdAndUpdate(TEST_BOOK_ID, {
      manuscriptMarkdown: '# Updated\n\nThis is the second version.',
    });

    const res = await request(app)
      .post(`/api/book-publishing/${TEST_BOOK_ID}/versions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ changeDescription: 'Second version' });

    expect(res.status).toBe(201);
    expect(res.body.version.version).toBe(2);
    expect(res.body.version.manuscriptMarkdown).toBe('# Updated\n\nThis is the second version.');
  });

  it('GET /:bookId/versions - returns versions sorted by version descending', async () => {
    const res = await request(app)
      .get(`/api/book-publishing/${TEST_BOOK_ID}/versions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.body.versions[0].version).toBeGreaterThan(res.body.versions[1].version);
  });

  it('POST /:bookId/versions/:versionId/restore - restores a previous version', async () => {
    const listRes = await request(app)
      .get(`/api/book-publishing/${TEST_BOOK_ID}/versions`)
      .set('Authorization', `Bearer ${authToken}`);

    const v1 = listRes.body.versions.find((v) => v.version === 1);
    expect(v1).toBeDefined();

    const res = await request(app)
      .post(`/api/book-publishing/${TEST_BOOK_ID}/versions/${v1._id}/restore`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toContain('Restored to version');

    const book = await BookProject.findById(TEST_BOOK_ID);
    expect(book.manuscriptMarkdown).toContain('Original');
    expect(book.manuscriptMarkdown).not.toContain('Updated');
  });

  it('POST /:bookId/versions/:versionId/restore - returns 404 for non-existent version', async () => {
    const fakeVersionId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/book-publishing/${TEST_BOOK_ID}/versions/${fakeVersionId}/restore`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it('GET /:bookId/versions/:versionId - gets a specific version', async () => {
    const listRes = await request(app)
      .get(`/api/book-publishing/${TEST_BOOK_ID}/versions`)
      .set('Authorization', `Bearer ${authToken}`);

    const v1 = listRes.body.versions.find((v) => v.version === 1);
    expect(v1).toBeDefined();

    const res = await request(app)
      .get(`/api/book-publishing/${TEST_BOOK_ID}/versions/${v1._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.version.manuscriptMarkdown).toBe('# Original\n\nTest manuscript content.');
  });

  it('GET /:bookId/versions/:versionId - returns 404 for non-existent version', async () => {
    const fakeVersionId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/book-publishing/${TEST_BOOK_ID}/versions/${fakeVersionId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });
});
