// backend/routes/reviews.js - Product and seller reviews
const express = require('express');
const reviewService = require('../services/reviewService');

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
 * POST /api/reviews/products/:productId - Create product review
 */
router.post('/products/:productId', requireAuth, async (req, res) => {
  try {
    const review = await reviewService.createProductReview(
      req.user._id,
      req.params.productId,
      req.body,
    );
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/reviews/sellers/:sellerId - Create seller review
 */
router.post('/sellers/:sellerId', requireAuth, async (req, res) => {
  try {
    const review = await reviewService.createSellerReview(
      req.user._id,
      req.params.sellerId,
      req.body,
    );
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/reviews/products/:productId - Get product reviews
 */
router.get('/products/:productId', async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      minRating: req.query.minRating ? parseInt(req.query.minRating) : null,
      sort: req.query.sort || 'relevant',
    };

    const result = await reviewService.getProductReviews(req.params.productId, filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reviews/products/:productId/summary - Get rating distribution
 */
router.get('/products/:productId/summary', async (req, res) => {
  try {
    const summary = await reviewService.getReviewSummary(req.params.productId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reviews/sellers/:sellerId - Get seller reviews
 */
router.get('/sellers/:sellerId', async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const result = await reviewService.getSellerReviews(req.params.sellerId, filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reviews/:reviewId/helpful - Mark review as helpful
 */
router.post('/:reviewId/helpful', requireAuth, async (req, res) => {
  try {
    const review = await reviewService.markReviewHelpful(req.params.reviewId, req.user._id);
    res.json({ message: 'Marked as helpful', helpful: review.helpful });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/reviews/:reviewId/response - Add seller response
 */
router.post('/:reviewId/response', requireAuth, async (req, res) => {
  try {
    const review = await reviewService.addSellerResponse(
      req.params.reviewId,
      req.user._id,
      req.body.response,
    );
    res.json({ message: 'Response added', review });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
