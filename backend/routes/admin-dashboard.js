// backend/routes/admin-dashboard.js - Admin dashboard endpoints
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const cacheService = require('../services/cacheService');

const User = require('../models/User');
const Order = require('../models/Order');
const ProductType = require('../models/ProductType');
const Review = require('../models/Review');
const ProvenanceSubmission = require('../models/ProvenanceSubmission');
const Shop = require('../models/Shop');
const FraudFlag = require('../models/FraudFlag');

/**
 * GET /api/admin/dashboard - Platform overview
 */
router.get(
  '/dashboard',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const cached = await cacheService.get(cacheService.cacheKeys.stats);
    if (cached) {
      return res.json({ ok: true, ...cached });
    }

    const [
      totalUsers,
      totalSellers,
      totalOrders,
      totalRevenue,
      totalProducts,
      activeShops,
      avgOrderValue,
      fraudFlags,
      pendingSubmissions,
      approvedSubmissions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'seller' }),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$amountTotal' } } }]),
      ProductType.countDocuments({ status: 'active' }),
      Shop.countDocuments({ status: 'live' }),
      Order.aggregate([{ $group: { _id: null, avg: { $avg: '$amountTotal' } } }]),
      FraudFlag.countDocuments({ status: 'new' }),
      ProvenanceSubmission.countDocuments({ status: 'submitted' }),
      ProvenanceSubmission.countDocuments({ status: 'minted' }),
    ]);

    const stats = {
      users: {
        total: totalUsers,
        sellers: totalSellers,
        buyers: totalUsers - totalSellers,
      },
      marketplace: {
        orders: totalOrders,
        revenue: (totalRevenue[0]?.total || 0) / 100,
        avgOrderValue: (avgOrderValue[0]?.avg || 0) / 100,
        products: totalProducts,
        shops: activeShops,
      },
      provenance: {
        pendingReview: pendingSubmissions,
        approved: approvedSubmissions,
      },
      fraud: {
        flags: fraudFlags,
      },
      timestamp: new Date().toISOString(),
    };

    await cacheService.set(cacheService.cacheKeys.stats, stats, 300); // 5 min cache

    res.json({ ok: true, ...stats });
  })
);

/**
 * GET /api/admin/users - List all users
 */
router.get(
  '/users',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, role, search } = req.query;
    const skip = (Math.max(1, page) - 1) * limit;

    const query = {};
    if (role) query.role = role;
    if (search) query.$text = { $search: search };

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      ok: true,
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

/**
 * GET /api/admin/orders - List all orders
 */
router.get(
  '/orders',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, status } = req.query;
    const skip = (Math.max(1, page) - 1) * limit;

    const query = {};
    if (status) query.paymentStatus = status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('buyerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      ok: true,
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

/**
 * GET /api/admin/provenance - Pending provenance submissions
 */
router.get(
  '/provenance',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status = 'submitted', page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, page) - 1) * limit;

    const [submissions, total] = await Promise.all([
      ProvenanceSubmission.find({ status })
        .populate('userId', 'name email')
        .sort({ completeness: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProvenanceSubmission.countDocuments({ status }),
    ]);

    res.json({
      ok: true,
      submissions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

/**
 * POST /api/admin/provenance/:id/approve - Approve submission for minting
 */
router.post(
  '/provenance/:id/approve',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const submission = await ProvenanceSubmission.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvals: {
          approverType: 'admin',
          approvedAt: new Date(),
          notes,
        },
      },
      { new: true }
    );

    res.json({ ok: true, message: 'Submission approved', submission });
  })
);

/**
 * POST /api/admin/provenance/:id/reject - Reject submission
 */
router.post(
  '/provenance/:id/reject',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const submission = await ProvenanceSubmission.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        fraud: { flagged: true, flagReason: reason },
      },
      { new: true }
    );

    // TODO: Send notification email

    res.json({ ok: true, message: 'Submission rejected', submission });
  })
);

/**
 * GET /api/admin/fraud-flags - Review fraud flags
 */
router.get(
  '/fraud-flags',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status = 'new', page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, page) - 1) * limit;

    const [flags, total] = await Promise.all([
      FraudFlag.find({ status })
        .populate('productId', 'title price')
        .populate('sellerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FraudFlag.countDocuments({ status }),
    ]);

    res.json({
      ok: true,
      flags,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

/**
 * GET /api/admin/metrics - Detailed platform metrics
 */
router.get(
  '/metrics',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [revenueByDay, topSellers, topProducts, avgRating] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amountTotal' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { role: 'seller' } },
        {
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            sales: { $sum: 1 },
          },
        },
        { $sort: { sales: -1 } },
        { $limit: 10 },
      ]),
      ProductType.find({ status: 'active' })
        .sort({ 'analytics.views': -1 })
        .limit(10)
        .select('title price analytics')
        .lean(),
      Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    ]);

    res.json({
      ok: true,
      metrics: {
        revenueByDay,
        topSellers,
        topProducts,
        avgRating: avgRating[0]?.avg || 0,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

module.exports = router;
