// backend/routes/analytics.js - Seller analytics dashboard
const express = require('express');
const SellerAnalytics = require('../models/SellerAnalytics');
const Order = require('../models/Order');
const RoyaltyEvent = require('../models/RoyaltyEvent');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Middleware: Require authentication
 */
const requireAuth = authenticateToken;
const DEFAULT_ROYALTY_RATE = 0.1;

function normalizeCreatorAddress(raw, req) {
  const explicit = String(raw || '').trim();
  if (explicit) return explicit;
  return String(
    req.user?.preferences?.defaultWalletAddress || req.user?.wallet?.generatedWalletAddress || '',
  ).trim();
}

function toOrderEvent(row, creatorAddress = '') {
  const salePrice = Number(row.amountTotal || 0) / 100;
  const royalty = salePrice * DEFAULT_ROYALTY_RATE;
  return {
    id: String(row._id),
    sale_timestamp: row.createdAt,
    sale_type: 'PRIMARY',
    platform: 'PVA_MARKET',
    sale_price: salePrice,
    royalty_amount: royalty,
    creator_earning_amount: Math.max(0, salePrice - royalty),
    creator_address: creatorAddress,
    tx_hash: row?.crypto?.txHash || '',
  };
}

function toRoyaltyEvent(row) {
  return {
    id: String(row._id),
    sale_timestamp: row.sale_timestamp || row.createdAt,
    sale_type: String(row.sale_type || 'SECONDARY').toUpperCase(),
    platform: String(row.platform || 'PVA_MARKET').toUpperCase(),
    sale_price: Number(row.sale_price || 0),
    royalty_amount: Number(row.royalty_amount || 0),
    creator_earning_amount: Number(row.creator_earning_amount || 0),
    creator_address: String(row.creator_address || ''),
    tx_hash: String(row.tx_hash || ''),
    simulated: true,
  };
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
    const revenueChange =
      ((current.totalRevenue - comp.totalRevenue) / (comp.totalRevenue || 1)) * 100;
    const ordersChange =
      ((current.completedOrders - comp.completedOrders) / (comp.completedOrders || 1)) * 100;
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

/**
 * GET /api/analytics
 * Compatibility endpoint used by SellerDashboard component.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const sales = await Order.find({
      'attribution.creatorId': req.user.id,
      paymentStatus: 'paid',
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const totalRevenueCents = sales.reduce((sum, row) => sum + Number(row.amountTotal || 0), 0);
    const completedOrders = sales.length;
    const avgOrderValueCents = completedOrders > 0 ? totalRevenueCents / completedOrders : 0;

    return res.json({
      ok: true,
      totalRevenue: totalRevenueCents,
      completedOrders,
      conversionRate: 0,
      avgOrderValue: avgOrderValueCents / 100,
      pageViews: 0,
      checkoutStarts: 0,
      productClicks: 0,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/analytics/dashboard/:creatorAddress
 * Compatibility endpoint for creator royalty dashboard summary.
 */
router.get('/dashboard/:creatorAddress', requireAuth, async (req, res) => {
  try {
    const days = Math.max(1, Math.min(Number(req.query.days) || 365, 3650));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const creatorAddress = normalizeCreatorAddress(req.params.creatorAddress, req);

    const sales = await Order.find({
      'attribution.creatorId': req.user.id,
      paymentStatus: 'paid',
      createdAt: { $gte: cutoff },
    })
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    const eventFilter = {
      ownerUserId: req.user._id,
      sale_timestamp: { $gte: cutoff },
      ...(creatorAddress ? { creator_address: creatorAddress } : {}),
    };

    const persistedEvents = await RoyaltyEvent.find(eventFilter)
      .sort({ sale_timestamp: -1 })
      .limit(2000)
      .lean();

    const orderEvents = sales.map((row) => toOrderEvent(row, creatorAddress));
    const mappedPersisted = persistedEvents.map(toRoyaltyEvent);
    const allEvents = [...orderEvents, ...mappedPersisted];

    const totalRoyalties = allEvents.reduce((sum, row) => sum + Number(row.royalty_amount || 0), 0);
    const totalEarnings = allEvents.reduce(
      (sum, row) => sum + Number(row.creator_earning_amount || 0),
      0,
    );
    const primarySalesVolume = allEvents
      .filter((row) => String(row.sale_type).toUpperCase() === 'PRIMARY')
      .reduce((sum, row) => sum + Number(row.sale_price || 0), 0);
    const secondarySalesVolume = allEvents
      .filter((row) => String(row.sale_type).toUpperCase() !== 'PRIMARY')
      .reduce((sum, row) => sum + Number(row.sale_price || 0), 0);
    const totalSalesVolume = primarySalesVolume + secondarySalesVolume;

    const monthlyTrendMap = new Map();
    const platformMap = new Map();
    for (const row of allEvents) {
      const date = new Date(row.sale_timestamp || Date.now());
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const currentMonth = monthlyTrendMap.get(month) || {
        month,
        sales_volume: 0,
        royalties: 0,
        creator_earnings: 0,
      };
      const amount = Number(row.sale_price || 0);
      currentMonth.sales_volume += amount;
      currentMonth.royalties += Number(row.royalty_amount || 0);
      currentMonth.creator_earnings += Number(row.creator_earning_amount || 0);
      monthlyTrendMap.set(month, currentMonth);

      const platform = String(row.platform || 'PVA_MARKET').toUpperCase();
      const currentPlatform = platformMap.get(platform) || {
        platform,
        sales_volume: 0,
        royalties: 0,
        creator_earnings: 0,
      };
      currentPlatform.sales_volume += amount;
      currentPlatform.royalties += Number(row.royalty_amount || 0);
      currentPlatform.creator_earnings += Number(row.creator_earning_amount || 0);
      platformMap.set(platform, currentPlatform);
    }

    return res.json({
      ok: true,
      dashboard: {
        summary: {
          total_earnings: totalEarnings,
          total_royalties: totalRoyalties,
          primary_sales_volume: primarySalesVolume,
          secondary_sales_volume: secondarySalesVolume,
          total_sales_count: allEvents.length,
        },
        platformBreakdown: Array.from(platformMap.values()),
        monthlyTrend: Array.from(monthlyTrendMap.values()).sort((a, b) =>
          String(a.month).localeCompare(String(b.month)),
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/analytics/royalty-history/:creatorAddress
 * Compatibility endpoint for creator royalty event history.
 */
router.get('/royalty-history/:creatorAddress', requireAuth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 100, 500));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const creatorAddress = normalizeCreatorAddress(req.params.creatorAddress, req);

    const sales = await Order.find({
      'attribution.creatorId': req.user.id,
      paymentStatus: 'paid',
    })
      .sort({ createdAt: -1 })
      .limit(limit + offset)
      .lean();

    const persistedEvents = await RoyaltyEvent.find({
      ownerUserId: req.user._id,
      ...(creatorAddress ? { creator_address: creatorAddress } : {}),
    })
      .sort({ sale_timestamp: -1 })
      .limit(limit + offset)
      .lean();

    const combined = [
      ...sales.map((row) => toOrderEvent(row, creatorAddress)),
      ...persistedEvents.map(toRoyaltyEvent),
    ].sort(
      (a, b) =>
        new Date(b.sale_timestamp || 0).getTime() - new Date(a.sale_timestamp || 0).getTime(),
    );

    const events = combined.slice(offset, offset + limit);

    return res.json({ ok: true, history: { events, total: combined.length } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/analytics/record-sale
 * Compatibility endpoint for dashboard sale simulation.
 */
router.post('/record-sale', requireAuth, async (req, res) => {
  try {
    const salePrice = Number(req.body?.salePrice || 0);
    const royaltyRate = Number(req.body?.royaltyRate || 10);
    const creatorAddress = normalizeCreatorAddress(req.body?.creatorAddress, req);

    if (!(salePrice > 0)) {
      return res.status(400).json({ ok: false, error: 'salePrice must be greater than 0' });
    }

    if (!creatorAddress) {
      return res.status(400).json({ ok: false, error: 'creatorAddress is required' });
    }

    const saved = await RoyaltyEvent.create({
      ownerUserId: req.user._id,
      creator_address: creatorAddress,
      sale_timestamp: new Date(),
      sale_type: String(req.body?.saleType || 'PRIMARY').toUpperCase(),
      platform: String(req.body?.platform || 'PVA_MARKET').toUpperCase(),
      sale_price: salePrice,
      royalty_amount: salePrice * (royaltyRate / 100),
      creator_earning_amount: salePrice * (1 - royaltyRate / 100),
      tx_hash: String(req.body?.txHash || ''),
      metadata: req.body?.metadata || null,
      source: 'dashboard-record',
    });

    const event = toRoyaltyEvent(saved);

    return res.json({ ok: true, event });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/analytics/all-events
 * Compatibility endpoint for admin royalty analytics tab.
 */
router.get('/all-events', requireAuth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 200, 500));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const platform = String(req.query.platform || '')
      .trim()
      .toUpperCase();

    const creatorAddress = String(req.query.creatorAddress || '').trim();
    const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';

    const orderFilter = {
      paymentStatus: 'paid',
      ...(!isAdmin ? { 'attribution.creatorId': req.user.id } : {}),
    };

    const eventFilter = {
      ...(!isAdmin ? { ownerUserId: req.user._id } : {}),
      ...(creatorAddress ? { creator_address: creatorAddress } : {}),
    };

    const sales = await Order.find(orderFilter)
      .sort({ createdAt: -1 })
      .limit(limit + offset)
      .lean();

    const persistedEvents = await RoyaltyEvent.find(eventFilter)
      .sort({ sale_timestamp: -1 })
      .limit(limit + offset)
      .lean();

    const allEvents = [
      ...sales.map((row) => toOrderEvent(row, '')),
      ...persistedEvents.map(toRoyaltyEvent),
    ];

    const filtered = allEvents
      .filter((row) => (platform ? row.platform === platform : true))
      .sort(
        (a, b) =>
          new Date(b.sale_timestamp || 0).getTime() - new Date(a.sale_timestamp || 0).getTime(),
      );
    const events = filtered.slice(offset, offset + limit);

    return res.json({ ok: true, data: { events, total: filtered.length } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/analytics/export/:creatorAddress
 * CSV export compatible endpoint.
 */
router.get('/export/:creatorAddress', requireAuth, async (req, res) => {
  try {
    const creatorAddress = normalizeCreatorAddress(req.params.creatorAddress, req);

    const sales = await Order.find({
      'attribution.creatorId': req.user.id,
      paymentStatus: 'paid',
    })
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    const persistedEvents = await RoyaltyEvent.find({
      ownerUserId: req.user._id,
      ...(creatorAddress ? { creator_address: creatorAddress } : {}),
    })
      .sort({ sale_timestamp: -1 })
      .limit(2000)
      .lean();

    const combined = [
      ...sales.map((row) => toOrderEvent(row, creatorAddress)),
      ...persistedEvents.map(toRoyaltyEvent),
    ].sort(
      (a, b) =>
        new Date(b.sale_timestamp || 0).getTime() - new Date(a.sale_timestamp || 0).getTime(),
    );

    const lines = [
      'id,sale_timestamp,sale_type,platform,sale_price,royalty_amount,creator_earning_amount,creator_address,tx_hash',
      ...combined.map((row) => {
        const values = [
          String(row.id),
          row.sale_timestamp ? new Date(row.sale_timestamp).toISOString() : '',
          String(row.sale_type || 'PRIMARY'),
          String(row.platform || 'PVA_MARKET'),
          Number(row.sale_price || 0).toFixed(2),
          Number(row.royalty_amount || 0).toFixed(2),
          Number(row.creator_earning_amount || 0).toFixed(2),
          String(row.creator_address || creatorAddress || ''),
          String(row.tx_hash || ''),
        ];
        return values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
      }),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.send(lines.join('\n'));
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
