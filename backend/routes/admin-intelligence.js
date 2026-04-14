// backend/routes/admin-intelligence.js - Admin market health and intelligence
const express = require('express');
const MarketIntelligence = require('../models/MarketIntelligence');
const FraudFlag = require('../models/FraudFlag');
const Order = require('../models/Order');
const Review = require('../models/Review');
const ProductType = require('../models/ProductType');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) return res.status(401).json({ error: 'Authentication required' });
  next();
}

/**
 * GET /api/admin/intelligence/dashboard - Realtime market dashboard
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Get latest report
    const latestReport = await MarketIntelligence.findOne()
      .sort({ reportDate: -1 })
      .lean();

    // Get today's fraud flags
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayFlags = await FraudFlag.countDocuments({
      createdAt: { $gte: today },
    });

    // Get new listings today
    const newListings = await ProductType.countDocuments({
      createdAt: { $gte: today },
      status: 'published',
    });

    // Get sales today
    const todaySales = await Order.countDocuments({
      createdAt: { $gte: today },
      paymentStatus: 'paid',
    });

    res.json({
      latestReport,
      todaySnapshot: {
        newListings,
        completedSales: todaySales,
        fraudFlagsRaised: todayFlags,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/intelligence/reports - Get market intelligence reports
 */
router.get('/reports', requireAuth, async (req, res) => {
  try {
    const period = req.query.period || 'daily';
    const limit = Math.min(100, parseInt(req.query.limit) || 30);

    const reports = await MarketIntelligence.find({ reportPeriod: period })
      .sort({ reportDate: -1 })
      .limit(limit)
      .lean();

    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/intelligence/report/:reportId - Get detailed report
 */
router.get('/report/:reportId', requireAuth, async (req, res) => {
  try {
    const report = await MarketIntelligence.findById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/intelligence/alerts - Get active alerts
 */
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const severity = req.query.severity || 'critical';

    const latestReport = await MarketIntelligence.findOne()
      .sort({ reportDate: -1 })
      .lean();

    if (!latestReport) {
      return res.json({ alerts: [] });
    }

    const alerts = latestReport.alerts.filter((a) => a.priority === severity || !severity);

    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/intelligence/fraud-summary - Fraud metrics summary
 */
router.get('/fraud-summary', requireAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's fraud flags
    const todayFlags = await FraudFlag.countDocuments({
      createdAt: { $gte: today },
    });

    const confirmedFraud = await FraudFlag.countDocuments({
      createdAt: { $gte: today },
      status: 'confirmed',
    });

    // This week's trends
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyFlags = await FraudFlag.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    // By type
    const flagsByType = await FraudFlag.aggregate([
      {
        $match: { createdAt: { $gte: weekAgo } },
      },
      {
        $group: {
          _id: '$anomalyType',
          count: { $sum: 1 },
          avgRisk: { $avg: '$riskScore' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Highest risk sellers
    const topRiskSellers = await FraudFlag.aggregate([
      {
        $match: { sellerId: { $exists: true }, riskScore: { $gte: 70 } },
      },
      {
        $group: {
          _id: '$sellerId',
          flagCount: { $sum: 1 },
          avgRisk: { $avg: '$riskScore' },
        },
      },
      {
        $sort: { flagCount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'seller',
        },
      },
    ]);

    res.json({
      summary: {
        todayFlags,
        confirmedFraud,
        weeklyFlags,
        weeklyAvgPerDay: (weeklyFlags / 7).toFixed(1),
      },
      flagsByType,
      topRiskSellers: topRiskSellers.map((s) => ({
        sellerId: s._id,
        flagCount: s.flagCount,
        avgRisk: s.avgRisk.toFixed(1),
        seller: s.seller[0] || { name: 'Unknown' },
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/intelligence/category-analysis - Analyze by category
 */
router.get('/category-analysis', requireAuth, async (req, res) => {
  try {
    const category = req.query.category;

    const latestReport = await MarketIntelligence.findOne()
      .sort({ reportDate: -1 })
      .lean();

    if (!latestReport) {
      return res.json({ analysis: null });
    }

    const categoryData = latestReport.topCategories.find((c) => c.category === category);

    res.json({
      category,
      data: categoryData,
      allCategories: latestReport.topCategories.map((c) => ({
        category: c.category,
        listingCount: c.listingCount,
        salesCount: c.salesCount,
        avgPrice: c.avgPrice,
        trend: c.trend,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/intelligence/generate-report - Manually trigger report generation
 */
router.post('/generate-report', requireAuth, async (req, res) => {
  try {
    // This would normally be called by a cron job
    // For demo, it just creates a basic report

    const reportDate = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's stats
    const newListings = await ProductType.countDocuments({
      createdAt: { $gte: today },
      status: 'published',
    });

    const sales = await Order.find({
      createdAt: { $gte: today },
      paymentStatus: 'paid',
    });

    const totalRevenue = sales.reduce((sum, o) => sum + (o.amountTotal || 0), 0);

    const report = new MarketIntelligence({
      reportDate,
      reportPeriod: 'daily',
      newListingsToday: newListings,
      totalSoldToday: sales.length,
      totalTransactionValue: totalRevenue,
      priceIndex: 100,
      conversionRate: newListings > 0 ? ((sales.length / newListings) * 100).toFixed(2) : 0,
      completedAt: new Date(),
    });

    await report.save();

    res.status(201).json({ message: 'Report generated', report });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
