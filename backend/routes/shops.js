const express = require('express');
const shopService = require('../services/shopService');

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
 * POST /api/shops
 * Create a new shop for authenticated user
 * Expects: { shopName, description, story, categories, tags, businessType }
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { shopName, description, story, categories, tags, businessType } = req.body;

    if (!shopName) {
      return res.status(400).json({ error: 'Shop name is required' });
    }

    const shop = await shopService.createShop(req.user._id, {
      shopName,
      description,
      story,
      categories,
      tags,
      businessType,
    });

    res.status(201).json({
      message: 'Shop created successfully',
      shop,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/shops/me
 * Get authenticated user's shop
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const shopData = await shopService.getMyShop(req.user._id);
    res.json(shopData);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/shops/:shopId
 * Get shop details by ID
 */
router.get('/:shopId', async (req, res) => {
  try {
    // Track view for analytics
    shopService.trackShopView(req.params.shopId).catch(console.error);

    const shopData = await shopService.getShopDetails(req.params.shopId);
    res.json(shopData);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * PUT /api/shops/:shopId
 * Update shop details (owner only)
 */
router.put('/:shopId', requireAuth, async (req, res) => {
  try {
    const shop = await shopService.updateShop(req.params.shopId, req.body, req.user._id);

    res.json({
      message: 'Shop updated successfully',
      shop,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/shops/:shopId/publish
 * Publish shop (move from draft to live)
 */
router.post('/:shopId/publish', requireAuth, async (req, res) => {
  try {
    const shop = await shopService.publishShop(req.params.shopId, req.user._id);

    res.json({
      message: 'Shop published successfully',
      shop,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/shops/:shopId/products
 * Get products for a shop
 */
router.get('/:shopId/products', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    const result = await shopService.getShopProducts(req.params.shopId, page, limit);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/shops/:shopId/follow
 * Follow a shop
 */
router.post('/:shopId/follow', requireAuth, async (req, res) => {
  try {
    await shopService.followShop(req.params.shopId, req.user._id);

    res.json({
      message: 'Following shop',
      following: true,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/shops/:shopId/follow
 * Unfollow a shop
 */
router.delete('/:shopId/follow', requireAuth, async (req, res) => {
  try {
    const result = await shopService.unfollowShop(req.params.shopId, req.user._id);

    res.json({
      message: 'Unfollowed shop',
      unfollowed: result.unfollowed,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/shops/:shopId/follow-status
 * Check if user is following shop
 */
router.get('/:shopId/follow-status', requireAuth, async (req, res) => {
  try {
    const isFollowing = await shopService.isFollowingShop(req.params.shopId, req.user._id);

    res.json({ isFollowing });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/shops/:shopId/followers
 * Get shop followers
 */
router.get('/:shopId/followers', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    const result = await shopService.getShopFollowers(req.params.shopId, page, limit);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/shops/search/query
 * Search shops
 */
router.get('/search/query', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query too short' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    const result = await shopService.searchShops(q, page, limit);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/shops/trending/top
 * Get trending shops
 */
router.get('/trending/top', async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const shops = await shopService.getTrendingShops(limit);

    res.json({ shops });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/shops/rated/top
 * Get top-rated shops
 */
router.get('/rated/top', async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const shops = await shopService.getTopRatedShops(limit);

    res.json({ shops });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
