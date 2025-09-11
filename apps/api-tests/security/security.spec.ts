import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../backend/server.js';

describe('Security Tests', () => {
  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication token', async () => {
      await request(app)
        .post('/api/products')
        .send({
          name: 'Test Product',
          description: 'Should be rejected',
          price: 99.99,
        })
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Test Product',
          description: 'Should be rejected',
          price: 99.99,
        })
        .expect(401);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should sanitize HTML in product descriptions', async () => {
      // First get a valid auth token
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'securitytest',
          email: 'security@test.com',
          password: 'securepass123',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'securepass123',
        });

      const authToken = loginResponse.body.token;

      const maliciousData = {
        name: 'Test Product',
        description: '<script>alert("XSS")</script>Safe description',
        price: 99.99,
        category: 'test',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousData)
        .expect(201);

      // Description should be sanitized
      expect(response.body.description).not.toContain('<script>');
      expect(response.body.description).toContain('Safe description');
    });

    it('should reject SQL injection attempts', async () => {
      const sqlInjectionData = {
        email: "admin'; DROP TABLE users; --",
        password: 'password',
      };

      await request(app)
        .post('/api/auth/login')
        .send(sqlInjectionData)
        .expect(400);
    });

    it('should reject NoSQL injection attempts', async () => {
      const nosqlInjectionData = {
        email: { $ne: null },
        password: { $ne: null },
      };

      await request(app)
        .post('/api/auth/login')
        .send(nosqlInjectionData)
        .expect(400);
    });

    it('should enforce maximum field lengths', async () => {
      const longString = 'a'.repeat(10000);
      
      await request(app)
        .post('/api/auth/register')
        .send({
          username: longString,
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login attempts', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // The 6th attempt should be rate limited
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);
    });
  });

  describe('CORS Security', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should reject requests from unauthorized origins', async () => {
      await request(app)
        .get('/api/products')
        .set('Origin', 'https://malicious-site.com')
        .expect(403);
    });
  });

  describe('Headers Security', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should not expose sensitive server information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).not.toContain('Express');
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types for uploads', async () => {
      // First get auth token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'securepass123',
        });

      const authToken = loginResponse.body.token;

      // Try to upload a malicious file
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('malicious content'), 'malware.exe')
        .expect(400);
    });

    it('should enforce file size limits', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'securepass123',
        });

      const authToken = loginResponse.body.token;

      // Create a large buffer (10MB)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024);

      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeBuffer, 'large-file.jpg')
        .expect(413);
    });
  });

  describe('API Versioning Security', () => {
    it('should reject requests to deprecated API versions', async () => {
      await request(app)
        .get('/api/v1/products')
        .expect(410); // Gone
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose stack traces in production', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      expect(response.body.stack).toBeUndefined();
      expect(response.body.message).not.toContain('Error:');
    });
  });
});