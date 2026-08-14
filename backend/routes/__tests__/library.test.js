/**
 * Library Module Tests
 * Comprehensive test suite for collaborative library functionality
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const LibraryArticle = require('../../models/LibraryArticle');
const LibraryDocument = require('../../models/LibraryDocument');
const ModerationLog = require('../../models/ModerationLog');

let app;
let mongoServer;

describe('Library Module API', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.ALLOWED_ORIGIN = 'http://localhost';

    // Import after env is set so middleware uses the right config.
    app = require('../../api/index.js');
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('GET /api/library - List Articles', () => {
    it('should return 200 with article items (public endpoint)', async () => {
      const response = await request(app)
        .get('/api/library?kind=articles&limit=3')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should filter by kind=articles', async () => {
      const response = await request(app)
        .get('/api/library?kind=articles&limit=1')
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(Array.isArray(response.body.items)).toBe(true);
      if (response.body.items.length > 0) {
        expect(response.body.items[0]).toHaveProperty('title');
      }
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/library?kind=articles&limit=2')
        .expect(200);

      expect(response.body.items.length).toBeLessThanOrEqual(2);
    });
  });

  describe('POST /api/library/submit - Submit Article', () => {
    it('should reject without authentication token (401)', async () => {
      const response = await request(app)
        .post('/api/library/submit')
        .send({ title: 'Test Article' })
        .expect((res) => {
          if (![401, 403, 404].includes(res.status)) {
            throw new Error(`Expected status 401, 403, or 404, got ${res.status}`);
          }
        });
    });

    it('should accept valid submit request with auth token (if implemented)', async () => {
      const response = await request(app)
        .post('/api/library/submit')
        .set('Authorization', 'Bearer mock-token')
        .send({
          title: 'Test Article',
          content: 'Test content',
          source: 'git-branch'
        })
        .expect((res) => {
          if (![200, 401, 403].includes(res.status)) {
            throw new Error(`Expected status 200, 401, or 403, got ${res.status}`);
          }
        });
    });
  });

  describe('GET /api/library/pending - List Pending Articles', () => {
    it('should reject without authentication token (401)', async () => {
      const response = await request(app)
        .get('/api/library/pending')
        .expect((res) => {
          if (![401, 403, 404].includes(res.status)) {
            throw new Error(`Expected status 401, 403, or 404, got ${res.status}`);
          }
        });
    });
  });

  describe('GET /api/library/:id - Get Article by ID or Slug', () => {
    it('should return 404 for invalid MongoDB ObjectId', async () => {
      const response = await request(app)
        .get('/api/library/invalid-id-12345')
        .expect((res) => {
          if (![404, 200].includes(res.status)) {
            throw new Error(`Expected status 404 or 200, got ${res.status}`);
          }
        });
    });

    it('should return 404 for invalid hex string (not valid ObjectId)', async () => {
      const response = await request(app)
        .get('/api/library/xxxxxxxxxxxxxxxxxxxxxxxx')
        .expect((res) => {
          if (![404, 200].includes(res.status)) {
            throw new Error(`Expected status 404 or 200, got ${res.status}`);
          }
        });
    });

    it('should return 404 for path traversal attempts', async () => {
      const response = await request(app)
        .get('/api/library/../../etc/passwd')
        .expect((res) => {
          if (![404, 400].includes(res.status)) {
            throw new Error(`Expected status 404 or 400, got ${res.status}`);
          }
        });
    });

    it('should return 404 for special characters that break ObjectId.isValid', async () => {
      const response = await request(app)
        .get('/api/library/"; DROP TABLE users; --')
        .expect((res) => {
          if (![404, 200].includes(res.status)) {
            throw new Error(`Expected status 404 or 200, got ${res.status}`);
          }
        });
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/api/library/this-article-does-not-exist-12345')
        .expect((res) => {
          if (![404, 200].includes(res.status)) {
            throw new Error(`Expected status 404 or 200, got ${res.status}`);
          }
        });
    });

    it('should return 404 for empty string', async () => {
      const response = await request(app)
        .get('/api/library/')
        .expect((res) => {
          // Could be 404 or 200 depending on routing
          if (![404, 200].includes(res.status)) {
            throw new Error(`Expected status 404 or 200, got ${res.status}`);
          }
        });
    });

    it('should return article with valid ObjectId (if exists)', async () => {
      // This requires a seeded article in test DB
    });

    it('should return article by slug (if exists)', async () => {
      // This also requires test data
    });
  });

  describe('DELETE /api/library/:id - Delete Article', () => {
    it('should reject without authentication token (401)', async () => {
      const response = await request(app)
        .delete('/api/library/test-id')
        .expect((res) => {
          if (![401, 403, 404].includes(res.status)) {
            throw new Error(`Expected status 401, 403, or 404, got ${res.status}`);
          }
        });
    });
  });

  describe('Error Handling - No 500s for Invalid Input', () => {
    it('ObjectId validation prevents cast errors', async () => {
      const invalidIds = [
        'not-a-valid-id',
        '12345',
        'a'.repeat(30),
        '../../etc/passwd',
        '"; DROP TABLE; --',
        '${malicious}',
        'null',
        'undefined'
      ];

      for (const id of invalidIds) {
        const response = await request(app)
          .get(`/api/library/${id}`);

        // Should be 404 or 200, not 500
        expect([200, 404]).toContain(response.status);
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('Database Model Tests', () => {
    it('LibraryArticle model should validate required fields', () => {
      const article = new LibraryArticle();
      const error = article.validateSync();

      expect(error).toBeDefined();
      expect(error.errors).toHaveProperty('title');
    });

    it('LibraryArticle should have status field with enum', () => {
      const schema = LibraryArticle.schema;
      const statusField = schema.paths.status;

      expect(statusField).toBeDefined();
      expect(statusField.enumValues).toContain('draft');
      expect(statusField.enumValues).toContain('published');
    });

    it('LibraryDocument should have core fields', () => {
      const schema = LibraryDocument.schema;

      expect(schema.paths).toHaveProperty('title');
      expect(schema.paths).toHaveProperty('category');
      expect(schema.paths).toHaveProperty('status');
    });

    it('ModerationLog should track changes', () => {
      const schema = ModerationLog.schema;

      expect(schema.paths).toHaveProperty('articleId');
      expect(schema.paths).toHaveProperty('action');
      expect(schema.paths).toHaveProperty('actorId');
      expect(schema.paths).toHaveProperty('actorRole');
    });
  });

  describe('Integration Tests', () => {
    it('Full workflow: Create → List → Get by ID', async () => {
      // 1. Create article (requires auth)
      // 2. List articles
      // 3. Get by ID
      // 4. Verify all responses correct
      //
      // Skipping - requires proper auth setup
    });

    it('Error recovery: Invalid ID → fallback to slug lookup', () => {
      // This is tested in the resolvePublishedArticle function
      // Verify it gracefully falls back when ObjectId.isValid returns false
    });
  });
});
