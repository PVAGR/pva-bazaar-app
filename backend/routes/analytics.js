// backend/routes/analytics.js - Seller analytics dashboard
const express = require('express');
const SellerAnalytics = require('../models/SellerAnalytics');

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
 * GET /api/analytics/seller - Get seller analytics
 */
router.get('/seller', requireAuth, async (req, res) => {
  try {
    const analytics = await SellerAnalytics.findOne({
      sellerId: req.user._id,
    }).sort({ createdAt: -1 });

    if (!analytics) {
      return res.json({
        message: 'No analytics data yet',
        analytics: {
          totalVisitors: 0,
          pageViews: 0,
          conversionRate: 0,
          totalRevenue: 0,
          totalCommission: 0,
          netEarnings: 0,
        },
      });
    }

    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/seller/history - Get analytics history
 */
router.get('/seller/history', requireAuth, async (req, res) => {
  try {
    const days = Math.min(365, parseInt(req.query.days) || 30);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await SellerAnalytics.find({
      sellerId: req.user._id,
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: 1 })
      .limit(30);

    res.json({
      period: `Last ${days} days`,
      dataPoints: analytics.map((a) => ({
        date: a.dateRange?.endDate,
        revenue: a.totalRevenue,
        orders: a.completedOrders,
        visitors: a.uniqueVisitors,
        conversionRate: a.conversionRate,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analytics/seller - Record analytics snapshot
 */
router.post('/seller', requireAuth, async (req, res) => {
  try {
    // Delete old records (keep only last 100)
    const oldest = await SellerAnalytics.find({ sellerId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(99)
      .limit(1);

    if (oldest.length > 0) {
      await SellerAnalytics.deleteMany({
        sellerId: req.user._id,
        createdAt: { $lt: oldest[0].createdAt },
      });
    }

    const analytics = new SellerAnalytics({
      sellerId: req.user._id,
      shopId: req.body.shopId,
      ...req.body,
      dateRange: {
        startDate: req.body.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: req.body.endDate || new Date(),
      },
    });

    await analytics.save();
    res.status(201).json(analytics);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/seller/comparison - Compare periods
 */
router.get('/seller/comparison', requireAuth, async (req, res) => {
  try {
    const current = await SellerAnalytics.findOne({
      sellerId: req.user._id,
    }).sort({ createdAt: -1 });

    if (!current) {
      return res.status(404).json({ error: 'No analytics data' });
    }

    // Get previous period for comparison
    const previous = await SellerAnalytics.find({
      sellerId: req.user._id,
      createdAt: { $lt: current.createdAt },
    })
      .sort({ createdAt: -1 })
      .limit(1);

    if (previous.length === 0) {
      return res.json({
        current: {
          revenue: current.totalRevenue,
          orders: current.completedOrders,
          conversionRate: current.conversionRate,
        },
        previous: null,
        comparison: null,
      });
    }

    const comp = previous[0];
    const revenueChange = ((current.totalRevenue - comp.totalRevenue) / (comp.totalRevenue || 1)) * 100;
    const ordersChange = ((current.completedOrders - comp.completedOrders) / (comp.completedOrders || 1)) * 100;
    const conversionChange = current.conversionRate - comp.conversionRate;

    res.json({
      current: {
        revenue: current.totalRevenue,
        orders: current.completedOrders,
        conversionRate: current.conversionRate,
        avgOrderValue: current.avgOrderValue,
      },
      previous: {
        revenue: comp.totalRevenue,
        orders: comp.completedOrders,
        conversionRate: comp.conversionRate,
      },
      comparison: {
        revenueChange: Math.round(revenueChange * 100) / 100,
        ordersChange: Math.round(ordersChange * 100) / 100,
        conversionChange: Math.round(conversionChange * 100) / 100,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
