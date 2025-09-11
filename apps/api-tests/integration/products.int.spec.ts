import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../backend/server.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('Products Integration Tests', () => {
  let mongoServer;
  let authToken;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri);

    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpass123',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpass123',
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('GET /api/products', () => {
    it('should return an empty array when no products exist', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return products when they exist', async () => {
      // First create a product
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Product',
          description: 'A test product',
          price: 99.99,
          category: 'test',
          imageUrl: 'https://example.com/image.jpg',
        });

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        category: 'test',
      });
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product with valid data', async () => {
      const productData = {
        name: 'New Product',
        description: 'A new test product',
        price: 149.99,
        category: 'electronics',
        imageUrl: 'https://example.com/new-image.jpg',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body).toMatchObject(productData);
      expect(response.body._id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      const productData = {
        name: 'Unauthorized Product',
        description: 'Should not be created',
        price: 99.99,
        category: 'test',
      };

      await request(app)
        .post('/api/products')
        .send(productData)
        .expect(401);
    });

    it('should return 400 with invalid data', async () => {
      const invalidData = {
        name: '', // Empty name should be invalid
        price: -10, // Negative price should be invalid
      };

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a specific product by ID', async () => {
      // Create a product first
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Specific Product',
          description: 'A specific test product',
          price: 199.99,
          category: 'specific',
        });

      const productId = createResponse.body._id;

      const response = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(response.body._id).toBe(productId);
      expect(response.body.name).toBe('Specific Product');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update an existing product', async () => {
      // Create a product first
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Original Product',
          description: 'Original description',
          price: 99.99,
          category: 'original',
        });

      const productId = createResponse.body._id;
      const updateData = {
        name: 'Updated Product',
        description: 'Updated description',
        price: 149.99,
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('Updated Product');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.price).toBe(149.99);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete an existing product', async () => {
      // Create a product first
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Product to Delete',
          description: 'This will be deleted',
          price: 99.99,
          category: 'deletable',
        });

      const productId = createResponse.body._id;

      await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify product is deleted
      await request(app)
        .get(`/api/products/${productId}`)
        .expect(404);
    });
  });
});