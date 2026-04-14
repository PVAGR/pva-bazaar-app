// backend/routes/products.js - Product CRUD and filtering
const express = require('express');
const ProductType = require('../models/ProductType');
const productService = require('../services/productService');

const router = express.Router();

/**
 * Middleware: Require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * POST /api/products - Create a new product
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const product = await productService.createProduct(req.user._id, req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/products/:productId - Get product with type-specific details
 */
router.get('/:productId', async (req, res) => {
  try {
    const product = await productService.getProductWithDetails(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Track view
    await productService.trackProductView(req.params.productId);

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/products/:productId - Update product (owner only)
 */
router.put('/:productId', requireAuth, async (req, res) => {
  try {
    const product = await productService.updateProduct(req.params.productId, req.user._id, req.body);
    res.json(product);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/products/:productId - Delete product (owner only)
 */
router.delete('/:productId', requireAuth, async (req, res) => {
  try {
    const product = await ProductType.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Archive instead of delete
    await ProductType.findByIdAndUpdate(req.params.productId, { status: 'archived' });
    res.json({ message: 'Product archived' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products - List products with filtering
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      productType: req.query.type,
      shopId: req.query.shopId,
      category: req.query.category,
      tags: req.query.tags ? req.query.tags.split(',') : null,
      minPrice: req.query.minPrice ? parseInt(req.query.minPrice) : null,
      maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice) : null,
    };

    // If type filter provided, use filterProductsByType
    if (filters.productType) {
      const result = await productService.filterProductsByType(filters.productType, filters);
      return res.json(result);
    }

    // Otherwise return all published products (generic listing)
    const query = { status: 'published' };
    if (filters.shopId) query.shopId = filters.shopId;
    if (filters.category) query.category = filters.category;
    if (filters.tags) query.tags = { $in: filters.tags };
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = filters.minPrice;
      if (filters.maxPrice) query.price.$lte = filters.maxPrice;
    }

    const skip = (filters.page - 1) * filters.limit;
    const products = await ProductType.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(filters.limit)
      .lean();

    const total = await ProductType.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/search/query - Search products
 */
router.get('/search/:query', async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const products = await productService.searchProducts(req.params.query, limit);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/trending/top - Get trending products
 */
router.get('/trending/top', async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const products = await productService.getTrendingProducts(limit);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/seller/me - Get current user's products
 */
router.get('/seller/me', requireAuth, async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status || 'published',
      productType: req.query.type,
    };

    const result = await productService.getSellerProducts(req.user._id, filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
