const express = require('express');
const router = express.Router();
const Payout = require('../models/Payout');
const Order = require('../models/Order');
const adminSession = require('../middleware/adminSession');

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Middleware: protect all payout routes with admin authentication
router.use(adminSession);

/**
 * GET /api/payouts
 * List all payouts with optional filters
 * Query: status (draft|ready|processing|completed), creator, limit, offset
 */
router.get('/', async (req, res) => {
  try {
    const { status, creator, limit = 50, offset = 0 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (creator) filter.creatorHandle = new RegExp(escapeRegExp(String(creator).slice(0, 100)), 'i');

    const payouts = await Payout.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await Payout.countDocuments(filter);

    res.json({
      ok: true,
      payouts,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/payouts/summary
 * High-level payout metrics
 */
router.get('/summary', async (req, res) => {
  try {
    const pipeline = [
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$netPayoutCents' } } },
          ],
          pendingByCreator: [
            { $match: { status: { $in: ['draft', 'ready'] } } },
            {
              $group: {
                _id: '$creatorHandle',
                pendingAmount: { $sum: '$netPayoutCents' },
                count: { $sum: 1 },
              },
            },
            { $sort: { pendingAmount: -1 } },
            { $limit: 5 },
          ],
          totalStats: [
            {
              $group: {
                _id: null,
                totalPending: {
                  $sum: {
                    $cond: [{ $in: ['$status', ['draft', 'ready']] }, '$netPayoutCents', 0],
                  },
                },
                totalProcessed: {
                  $sum: {
                    $cond: [{ $in: ['$status', ['processing', 'completed']] }, '$netPayoutCents', 0],
                  },
                },
                totalCreators: { $addToSet: '$creatorHandle' },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Payout.aggregate(pipeline);

    res.json({
      ok: true,
      summary: {
        byStatus: result.byStatus,
        pendingByCreator: result.pendingByCreator,
        totals: {
          totalPendingCents: result.totalStats[0]?.totalPending || 0,
          totalProcessedCents: result.totalStats[0]?.totalProcessed || 0,
          totalCreators: result.totalStats[0]?.totalCreators?.length || 0,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/payouts/creator/:handle
 * Get all payouts for a specific creator
 */
router.get('/creator/:handle', async (req, res) => {
  try {
    const { handle } = req.params;
    const payouts = await Payout.find({ creatorHandle: handle })
      .sort({ 'payoutPeriod.endDate': -1 })
      .lean();

    // Summary stats
    const stats = {
      totalEarned: payouts.reduce((sum, p) => sum + p.netPayoutCents, 0),
      totalCompleted: payouts
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.netPayoutCents, 0),
      totalPending: payouts
        .filter((p) => ['draft', 'ready'].includes(p.status))
        .reduce((sum, p) => sum + p.netPayoutCents, 0),
      payoutCount: payouts.length,
    };

    res.json({ ok: true, payouts, stats });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/payouts/:id
 * Get specific payout details
 */
router.get('/:id', async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id).populate('creatorId', 'name email');

    if (!payout) {
      return res.status(404).json({ ok: false, message: 'Payout not found' });
    }

    // Fetch related orders for transparency
    const orders = await Order.find({ _id: { $in: payout.attributionIds } })
      .select('customerEmail itemSnapshot amountTotal attribution.commissionAmountCents createdAt')
      .lean()
      .limit(20);

    res.json({ ok: true, payout, relatedOrders: orders });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/payouts/generate
 * Generate new payout batch for creators
 * Body: { startDate, endDate, creators?: [handles] }
 */
router.post('/generate', async (req, res) => {
  try {
    const { startDate, endDate, creators = [] } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ ok: false, message: 'startDate and endDate required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    // Include the entire end day
    end.setHours(23, 59, 59, 999);

    // Aggregate commissions by creator for the period
    // Match all orders with attribution data and commission amounts
    const matchStage = {
      'attribution.creatorHandle': { $ne: null },
      'attribution.commissionAmountCents': { $gt: 0 },
    };
    
    // Add date range if provided
    if (start || end) {
      matchStage.createdAt = {};
      if (start) matchStage.createdAt.$gte = start;
      if (end) matchStage.createdAt.$lte = end;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$attribution.creatorHandle',
          totalCommissionsCents: { $sum: '$attribution.commissionAmountCents' },
          orderCount: { $sum: 1 },
          orderIds: { $push: '$_id' },
        },
      },
      {
        $match: {
          totalCommissionsCents: { $gt: 0 },
          // Only include specified creators if provided
          ...(creators.length > 0 && { _id: { $in: creators } }),
        },
      },
    ];

    const creatorCommissions = await Order.aggregate(pipeline);

    if (creatorCommissions.length === 0) {
      return res.status(200).json({ ok: true, payouts: [], message: 'No commissions found for period' });
    }

    // Create payout records
    const payouts = [];
    const batchTimestamp = Date.now();

    for (const creator of creatorCommissions) {
      const payout = new Payout({
        batchId: `payout_${batchTimestamp}_${creator._id}`,
        status: 'ready',
        payoutPeriod: { startDate: start, endDate: end },
        creatorHandle: creator._id,
        totalCommissionsCents: creator.totalCommissionsCents,
        netPayoutCents: creator.totalCommissionsCents, // No deductions by default
        attributionIds: creator.orderIds,
        orderCount: creator.orderCount,
      });

      await payout.save();
      payouts.push(payout);
    }

    res.status(201).json({
      ok: true,
      message: `Created ${payouts.length} payout records for period`,
      payouts,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/payouts/:id/process
 * Mark payout as processing or completed
 * Body: { action: 'process|complete', transactionId?, failureReason? }
 */
router.post('/:id/process', async (req, res) => {
  try {
    const { action, transactionId, failureReason } = req.body;
    const payout = await Payout.findById(req.params.id);

    if (!payout) {
      return res.status(404).json({ ok: false, message: 'Payout not found' });
    }

    if (action === 'process') {
      payout.status = 'processing';
      payout.processedAt = new Date();
    } else if (action === 'complete') {
      payout.status = 'completed';
      payout.completedAt = new Date();
      payout.transactionId = transactionId || null;
    } else if (action === 'fail') {
      payout.status = 'failed';
      payout.failureReason = failureReason || 'Payment failed';
    } else {
      return res.status(400).json({ ok: false, message: 'Invalid action' });
    }

    await payout.save();

    res.json({
      ok: true,
      message: `Payout marked as ${payout.status}`,
      payout,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
