// backend/routes/pricing.js - Dynamic pricing API endpoints
const express = require('express');
const pricingService = require('../services/pricingService');
const PricingRecommendation = require('../models/PricingRecommendation');
const PricingHistory = require('../models/PricingHistory');
const FraudFlag = require('../models/FraudFlag');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) return res.status(401).json({ error: 'Authentication required' });
  next();
}

/**
 * POST /api/pricing/calculate - Calculate fair price for a product
 */
router.post('/calculate', async (req, res) => {
  try {
    const { productId, category, material, condition, urgency, costBasis, desiredMargin, targetMarketSize, premiumFactors } = req.body;

    if (!productId || !category) {
      return res.status(400).json({ error: 'productId and category required' });
    }

    const fairPrice = await pricingService.calculateFairPrice(productId, {
      category,
      material,
      condition,
      urgency,
      costBasis,
      desiredMargin,
      targetMarketSize,
      premiumFactors,
    });

    res.json(fairPrice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/pricing/recommend - Get full pricing recommendation for seller
 */
router.post('/recommend', requireAuth, async (req, res) => {
  try {
    const { productId, category, material, condition, urgency, initialPrice, costBasis, desiredMargin, targetMarketSize } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId required' });
    }

    const recommendation = await pricingService.createPricingRecommendation(req.user._id, productId, {
      category,
      material,
      condition,
      urgency,
      initialPrice,
      costBasis,
      desiredMargin,
      targetMarketSize,
    });

    res.status(201).json(recommendation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/pricing/recommendation/:recommendationId - Get recommendation details
 */
router.get('/recommendation/:recommendationId', async (req, res) => {
  try {
    const recommendation = await PricingRecommendation.findById(req.params.recommendationId).populate('productId', 'name price');

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pricing/recommendation/:recommendationId/accept - Accept recommendation
 */
router.post('/recommendation/:recommendationId/accept', requireAuth, async (req, res) => {
  try {
    const recommendation = await PricingRecommendation.findById(req.params.recommendationId);
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    if (recommendation.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    recommendation.accepted = true;
    recommendation.acceptedPrice = req.body.acceptedPrice || recommendation.recommendedPrice;
    recommendation.acceptedAt = new Date();

    await recommendation.save();

    // Update product price if requested
    if (req.body.updateProductPrice) {
      const ProductType = require('../models/ProductType');
      await ProductType.findByIdAndUpdate(recommendation.productId, {
        price: recommendation.acceptedPrice,
      });
    }

    res.json({ message: 'Recommendation accepted', recommendation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/pricing/recommendation/:recommendationId/feedback - Provide feedback on recommendation
 */
router.post('/recommendation/:recommendationId/feedback', requireAuth, async (req, res) => {
  try {
    const recommendation = await PricingRecommendation.findById(req.params.recommendationId);
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    if (recommendation.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    recommendation.feedback = req.body.feedback;
    await recommendation.save();

    res.json({ message: 'Feedback recorded' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/pricing/history/:productId - Get pricing history for a product
 */
router.get('/history/:productId', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const history = await PricingHistory.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await PricingHistory.countDocuments({ productId: req.params.productId });

    res.json({
      history,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pricing/anomalies - Get all suspicious pricing flags (admin only)
 */
router.get('/anomalies', requireAuth, async (req, res) => {
  try {
    // Check admin status (simplified - should check actual admin role)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const query = { status: req.query.status || 'new' };
    if (req.query.riskScore) {
      query.riskScore = { $gte: parseInt(req.query.riskScore) };
    }

    const flags = await FraudFlag.find(query)
      .sort({ riskScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sellerId', 'name email')
      .populate('productId', 'name price');

    const total = await FraudFlag.countDocuments(query);

    res.json({
      flags,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pricing/anomaly/:flagId/resolve - Resolve fraud flag
 */
router.post('/anomaly/:flagId/resolve', requireAuth, async (req, res) => {
  try {
    const flag = await FraudFlag.findById(req.params.flagId);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    flag.status = req.body.status || 'resolved';
    flag.resolutionMeasure = req.body.resolutionMeasure;
    flag.resolvedAt = new Date();
    flag.resolvedBy = req.user._id;
    flag.resolutionNotes = req.body.notes;

    await flag.save();

    res.json({ message: 'Flag resolved', flag });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
