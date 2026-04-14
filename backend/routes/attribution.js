/**
 * Attribution & Creator Analytics Routes
 * Provides reporting for influence economy metrics:
 * - Creator conversion rates and commissions
 * - UTM source performance
 * - Referral code effectiveness
 */

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { authenticateToken } = require('../middleware/auth');
const adminSession = require('../middleware/adminSession');

/**
 * GET /api/attribution/creators
 * List all creators with attribution data and commissions
 * Requires: admin auth
 */
router.get('/creators', adminSession, async (req, res) => {
  try {
    const { startDate, endDate, sortBy = 'commission_total' } = req.query;

    // Build date filter if provided
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    const matchStage = {
      'attribution.creatorHandle': { $ne: null },
      ...(Object.keys(dateFilter).length > 0 && {
        createdAt: dateFilter,
      }),
    };

    // Aggregate orders by creator
    const creatorStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$attribution.creatorHandle',
          ordersCount: { $sum: 1 },
          totalRevenuesCents: { $sum: '$amountTotal' },
          totalCommissionsCents: { $sum: '$attribution.commissionAmountCents' },
          paidOrdersCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
          },
          lastOrderAt: { $max: '$createdAt' },
          firstOrderAt: { $min: '$createdAt' },
          avgOrderValue: {
            $avg: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amountTotal', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          creatorHandle: '$_id',
          ordersCount: 1,
          paidOrdersCount: 1,
          conversionRate: {
            $cond: [
              { $eq: ['$ordersCount', 0] },
              0,
              { $divide: ['$paidOrdersCount', '$ordersCount'] },
            ],
          },
          totalRevenuesCents: 1,
          totalCommissionsCents: 1,
          avgOrderValueCents: { $round: ['$avgOrderValue', 0] },
          lastOrderAt: 1,
          firstOrderAt: 1,
        },
      },
    ]);

    // Sort based on requested field
    const sortMap = {
      commission_total: (a, b) =>
        b.totalCommissionsCents - a.totalCommissionsCents,
      orders_count: (a, b) => b.ordersCount - a.ordersCount,
      conversion_rate: (a, b) => b.conversionRate - a.conversionRate,
      revenue_total: (a, b) =>
        b.totalRevenuesCents - a.totalRevenuesCents,
    };

    if (sortMap[sortBy]) {
      creatorStats.sort(sortMap[sortBy]);
    }

    res.json({
      ok: true,
      creators: creatorStats,
      count: creatorStats.length,
    });
  } catch (error) {
    console.error('Attribution creators error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/attribution/creator/:handle
 * Detailed stats for a single creator
 */
router.get('/creator/:handle', adminSession, async (req, res) => {
  try {
    const { handle } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = {
      'attribution.creatorHandle': handle.toLowerCase(),
      ...(Object.keys(dateFilter).length > 0 && {
        createdAt: dateFilter,
      }),
    };

    // Get order details
    const orders = await Order.find(matchStage)
      .select(
        'itemSnapshot amountTotal paymentStatus attribution createdAt stripeSessionId'
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Aggregate stats
    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          ordersCount: { $sum: 1 },
          totalRevenuesCents: { $sum: '$amountTotal' },
          totalCommissionsCents: { $sum: '$attribution.commissionAmountCents' },
          paidOrdersCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
          },
          avgOrderValue: { $avg: '$amountTotal' },
          lastOrderAt: { $max: '$createdAt' },
          firstOrderAt: { $min: '$createdAt' },
        },
      },
    ]);

    // Get attribution source breakdown
    const sourceBreakdown = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$attribution.attributionSource',
          count: { $sum: 1 },
          revenueCents: { $sum: '$amountTotal' },
        },
      },
    ]);

    res.json({
      ok: true,
      creatorHandle: handle,
      stats: stats[0] || {
        ordersCount: 0,
        totalRevenuesCents: 0,
        totalCommissionsCents: 0,
        paidOrdersCount: 0,
      },
      sourceBreakdown,
      recentOrders: orders,
    });
  } catch (error) {
    console.error('Attribution creator detail error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/attribution/utm-sources
 * Performance breakdown by UTM source
 */
router.get('/utm-sources', adminSession, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = {
      'attribution.utm_source': { $ne: null },
      ...(Object.keys(dateFilter).length > 0 && {
        createdAt: dateFilter,
      }),
    };

    const sources = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$attribution.utm_source',
          ordersCount: { $sum: 1 },
          paidOrdersCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
          },
          totalRevenuesCents: { $sum: '$amountTotal' },
          totalCommissionsCents: { $sum: '$attribution.commissionAmountCents' },
          avgOrderValue: { $avg: '$amountTotal' },
        },
      },
      {
        $project: {
          _id: 0,
          utmSource: '$_id',
          ordersCount: 1,
          paidOrdersCount: 1,
          conversionRate: {
            $cond: [
              { $eq: ['$ordersCount', 0] },
              0,
              { $divide: ['$paidOrdersCount', '$ordersCount'] },
            ],
          },
          totalRevenuesCents: 1,
          totalCommissionsCents: 1,
          avgOrderValueCents: { $round: ['$avgOrderValue', 0] },
        },
      },
      { $sort: { totalCommissionsCents: -1 } },
    ]);

    res.json({
      ok: true,
      utmSources: sources,
      count: sources.length,
    });
  } catch (error) {
    console.error('Attribution utm sources error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/attribution/summary
 * High-level attribution analytics summary
 */
router.get('/summary', adminSession, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchStage = {
      createdAt: { $gte: startDate },
    };

    // Overall metrics
    const overall = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenueCents: { $sum: '$amountTotal' },
          paidOrders: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
          },
          totalCommissionsCents: { $sum: '$attribution.commissionAmountCents' },
          attributedOrders: {
            $sum: {
              $cond: [
                { $ne: ['$attribution.creatorHandle', null] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Top creators
    const topCreators = await Order.aggregate([
      { $match: { ...matchStage, 'attribution.creatorHandle': { $ne: null } } },
      {
        $group: {
          _id: '$attribution.creatorHandle',
          ordersCount: { $sum: 1 },
          commissionsCents: { $sum: '$attribution.commissionAmountCents' },
        },
      },
      { $sort: { commissionsCents: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      ok: true,
      period: { days, startDate },
      overall: overall[0] || {
        totalOrders: 0,
        totalRevenueCents: 0,
        paidOrders: 0,
        totalCommissionsCents: 0,
        attributedOrders: 0,
      },
      topCreators,
    });
  } catch (error) {
    console.error('Attribution summary error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
