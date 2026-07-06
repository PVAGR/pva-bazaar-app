const express = require('express');
const Shop = require('../models/Shop');
const SellerProfile = require('../models/SellerProfile');
const Artifact = require('../models/Artifact');
const Order = require('../models/Order');
const Payout = require('../models/Payout');

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
 * GET /api/seller/dashboard
 * Seller's main dashboard with key metrics
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const shop = await Shop.findOne({ userId: req.user._id });

    if (!shop) {
      return res.status(404).json({ error: 'No shop found for this user' });
    }

    // Get seller stats
    const totalProducts = await Artifact.countDocuments({
      createdBy: req.user._id,
      status: 'published',
    });

    const totalOrders = await Order.countDocuments({
      'attribution.creatorId': req.user._id,
    });

    const totalRevenue = await Order.aggregate([
      { $match: { 'attribution.creatorId': req.user._id } },
      { $group: { _id: null, total: { $sum: '$amountTotal' } } },
    ]);

    const recentOrders = await Order.find({
      'attribution.creatorId': req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    const pendingPayouts = await Payout.countDocuments({
      creatorId: req.user._id,
      status: { $in: ['draft', 'ready', 'processing'] },
    });

    res.json({
      shop: {
        id: shop._id,
        name: shop.shopName,
        slug: shop.slug,
        status: shop.status,
        views: shop.analytics.totalViews,
        followers: shop.analytics.totalFollowers,
      },
      stats: {
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingPayouts,
        avgRating: shop.analytics.avgRating,
        reviewCount: shop.analytics.reviewCount,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o._id,
        date: o.createdAt,
        buyer: o.customerEmail,
        item: o.itemSnapshot?.name,
        amount: o.amountTotal,
        status: o.fulfillmentStatus,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/seller/analytics
 * Full seller analytics dashboard
 */
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const shop = await Shop.findOne({ userId: req.user._id });

    if (!shop) {
      return res.status(404).json({ error: 'No shop found' });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // Get orders for period
    const orders = await Order.find({
      'attribution.creatorId': req.user._id,
      createdAt: { $gte: startDate },
    });

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amountTotal || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top products
    const productSales = {};
    orders.forEach((o) => {
      const name = o.itemSnapshot?.name || 'Unknown';
      productSales[name] = (productSales[name] || 0) + 1;
    });

    const topProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, sales: count }));

    // Conversion metrics
    const completedOrders = orders.filter((o) => o.paymentStatus === 'paid').length;
    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Get profile info
    const profile = await SellerProfile.findOne({ userId: req.user._id });

    res.json({
      period,
      analytics: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        conversionRate: conversionRate.toFixed(2),
        topProducts,
      },
      shop: {
        views: shop.analytics.totalViews,
        followers: shop.analytics.totalFollowers,
        rating: shop.analytics.avgRating,
        reviews: shop.analytics.reviewCount,
      },
      profile: profile
        ? {
            totalSales: profile.totalSales,
            totalEarnings: profile.totalEarnings,
            responseTime: profile.responseTime,
            returnRate: profile.returnRate,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/seller/orders
 * Get seller's orders (orders where they're the creator/seller)
 */
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const status = req.query.status; // Optional filter

    const skip = (page - 1) * limit;

    const filter = { 'attribution.creatorId': req.user._id };

    if (status) {
      filter.fulfillmentStatus = status;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({
      orders: orders.map((o) => ({
        id: o._id,
        date: o.createdAt,
        buyer: o.customerEmail,
        item: o.itemSnapshot?.name,
        amount: o.amountTotal,
        paymentStatus: o.paymentStatus,
        fulfillmentStatus: o.fulfillmentStatus,
        trackingNumber: o.trackingNumber,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/seller/payouts
 * Get seller's payout history
 */
router.get('/payouts', requireAuth, async (req, res) => {
  try {
    const payouts = await Payout.find({ creatorId: req.user._id }).sort({ createdAt: -1 });

    res.json({
      payouts: payouts.map((p) => ({
        id: p._id,
        period: `${p.payoutPeriod?.startDate} - ${p.payoutPeriod?.endDate}`,
        status: p.status,
        amount: p.netPayoutCents,
        method: p.paymentMethod,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/seller/products
 * Get seller's products
 */
router.get('/products', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const products = await Artifact.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Artifact.countDocuments({ createdBy: req.user._id });

    res.json({
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        price: p.price,
        stock: p.stockQty,
        sold: p.soldQty,
        createdAt: p.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/seller/profile
 * Get seller's profile
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await SellerProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/seller/profile
 * Update seller profile
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const updates = req.body;

    // Whitelist updatable fields
    const allowed = [
      'businessName',
      'businessType',
      'provenanceStory',
      'traditionsDescription',
      'yearsInBusiness',
      'specializations',
      'portfolioUrls',
      'country',
      'region',
      'preferences',
    ];

    const sanitized = {};
    for (const field of allowed) {
      if (updates[field] !== undefined) {
        sanitized[field] = updates[field];
      }
    }

    const profile = await SellerProfile.findOneAndUpdate({ userId: req.user._id }, sanitized, {
      new: true,
    });

    res.json({
      message: 'Profile updated',
      profile,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
