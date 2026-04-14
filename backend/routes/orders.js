const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Artifact = require('../models/Artifact');
const OmnichannelSale = require('../models/OmnichannelSale');
const ProvenanceReviewLog = require('../models/ProvenanceReviewLog');
const stripe = require("../lib/stripeClient");
const { requireAdmin } = require("../middleware/adminOnly");
const { createTransactionEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');
const { authenticateToken } = require('../middleware/auth');

// GET /api/orders/mine (authenticated user - user's own orders)
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const cursor = req.query.cursor;

    const filter = { buyerId: req.user.id };
    if (cursor) {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const [timestamp, id] = decoded.split('_');
      filter.$or = [
        { createdAt: { $lt: new Date(timestamp) } },
        { createdAt: new Date(timestamp), _id: { $lt: id } },
      ];
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);

    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;

    let nextCursor = null;
    if (hasMore) {
      const last = items[items.length - 1];
      nextCursor = Buffer.from(`${last.createdAt.toISOString()}_${last._id}`).toString('base64');
    }

    return res.json({ ok: true, items, nextCursor });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/orders/escrow (authenticated user - user's escrow transactions)
router.get('/escrow', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    const orders = await Order.find({
      $or: [
        { buyerId: req.user.id },
        { 'attribution.creatorId': req.user.id },
      ],
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    const escrow = orders.map((order) => ({
      orderId: order._id,
      itemId: order.itemId,
      itemName: order.itemSnapshot?.name || 'Unknown',
      amount: order.amountTotal,
      currency: order.currency,
      status: order.paymentStatus === 'paid' ? 'held' : order.paymentStatus === 'refunded' ? 'released' : 'draft',
      isBuyer: String(order.buyerId) === String(req.user.id),
      isSeller: String(order.attribution?.creatorId) === String(req.user.id),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return res.json({ ok: true, items: escrow });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/orders/:id/refund (admin only)
router.post("/:id/refund", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amountCents, reason } = req.body || {};
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ ok: false, error: "Order not found" });
    if (order.paymentStatus !== "paid") return res.status(400).json({ ok: false, error: "Order not paid" });
    if (!order.stripePaymentIntentId) return res.status(400).json({ ok: false, error: "No payment intent" });
    if (order.refundStatus === "pending" || order.refundStatus === "refunded") return res.status(400).json({ ok: false, error: "Order already refunded or refund pending" });

    order.refundStatus = "pending";
    await order.save();

    const idempotencyKey = `refund_${order._id}_${amountCents || 'full'}`;
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: amountCents,
      reason,
    }, {
      idempotencyKey
    });

    order.stripeRefundId = refund.id;
    order.refundAmountCents = refund.amount;
    order.refundedAt = refund.status === "succeeded" ? new Date() : undefined;
    order.refundStatus = refund.status === "succeeded" ? "refunded" : refund.status === "pending" ? "pending" : "failed";
    await order.save();

    return res.json({ ok: true, refundId: refund.id, status: refund.status });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/orders/:id (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fulfillmentStatus, adminNotes, trackingNumber, carrier } = req.body || {};
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });

    let dirty = false;
    if (fulfillmentStatus && ["unfulfilled","processing","shipped","delivered"].includes(fulfillmentStatus)) {
      if (order.fulfillmentStatus !== fulfillmentStatus) {
        order.fulfillmentStatus = fulfillmentStatus;
        dirty = true;
        if (fulfillmentStatus === "delivered") {
          order.fulfilledAt = new Date();
        }
      }
    }
    if (typeof adminNotes === "string" && order.adminNotes !== adminNotes) {
      order.adminNotes = adminNotes;
      dirty = true;
    }
    if (typeof trackingNumber === "string" && order.trackingNumber !== trackingNumber) {
      order.trackingNumber = trackingNumber;
      dirty = true;
    }
    if (typeof carrier === "string" && order.carrier !== carrier) {
      order.carrier = carrier;
      dirty = true;
    }
    if (!dirty) return res.json({ ok: true, item: order });
    await order.save();

    // Dispatch fulfillment update event (non-blocking)
    dispatchToOpenClaw(createTransactionEvent('updated', {
      _id: order._id,
      artifactId: order.itemId,
      amount: order.amountTotal,
      currency: order.currency,
      status: order.paymentStatus,
    }, {
      fulfillmentStatus: order.fulfillmentStatus,
      trackingNumber: order.trackingNumber || null,
      carrier: order.carrier || null,
      updatedByAdmin: true,
    })).catch(() => {});

    return res.json({ ok: true, item: order });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/orders (admin only - paginated list)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const cursor = req.query.cursor;
    
    const filter = {};
    if (cursor) {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const [timestamp, id] = decoded.split('_');
      filter.$or = [
        { createdAt: { $lt: new Date(timestamp) } },
        { createdAt: new Date(timestamp), _id: { $lt: id } }
      ];
    }
    
    const orders = await Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);
    
    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;
    
    let nextCursor = null;
    if (hasMore) {
      const last = items[items.length - 1];
      nextCursor = Buffer.from(`${last.createdAt.toISOString()}_${last._id}`).toString('base64');
    }
    
    return res.json({ ok: true, items, nextCursor });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/orders/ops/omnichannel (admin only)
// Operational snapshot for omnichannel + crypto settlement health.
router.get('/ops/omnichannel', requireAdmin, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 25, 100));
    const source = String(req.query.source || '').trim().toLowerCase();

    const saleFilter = {};
    if (source) saleFilter.saleSource = source;

    const [sales, pendingCryptoOrders] = await Promise.all([
      OmnichannelSale.find(saleFilter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .lean(),
      Order.find({
        paymentStatus: 'pending',
        stripeSessionId: { $regex: '^crypto_intent_' },
      })
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .lean(),
    ]);

    const summary = {
      totalSales: sales.length,
      receiptMinted: sales.filter((sale) => sale?.blockchainReceipt?.status === 'minted').length,
      receiptFailed: sales.filter((sale) => sale?.blockchainReceipt?.status === 'failed').length,
      syncFailures: sales.filter((sale) =>
        Array.isArray(sale?.sync?.delistResults) &&
        sale.sync.delistResults.some((row) => row.status === 'failed')
      ).length,
      pendingCryptoIntents: pendingCryptoOrders.length,
    };

    return res.json({
      ok: true,
      summary,
      sales,
      pendingCryptoOrders,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/orders/ops/provenance (admin only)
// Snapshot of provenance coverage, duplicate fingerprints, and royalty economics.
router.get('/ops/provenance', requireAdmin, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));

    const [
      totalArtifacts,
      withProvenance,
      flaggedProvenance,
      duplicateFingerprintRows,
      reverseImageLikelyDuplicateCount,
      recentReverseImageRisks,
      royaltyAgg,
      recentRoyaltySales,
      recentReviewLogs,
    ] = await Promise.all([
      Artifact.countDocuments({}),
      Artifact.countDocuments({ 'provenance.combinedHash': { $exists: true, $ne: '' } }),
      Artifact.countDocuments({ 'provenance.verificationStatus': 'flagged' }),
      Artifact.aggregate([
        { $match: { 'provenance.combinedHash': { $exists: true, $ne: '' } } },
        { $group: { _id: '$provenance.combinedHash', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 50 },
      ]),
      Artifact.countDocuments({ 'provenance.reverseImage.likelyDuplicate': true }),
      Artifact.find({ 'provenance.reverseImage.likelyDuplicate': true })
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .limit(limit)
        .select('name title slug provenance.reverseImage createdAt updatedAt')
        .lean(),
      OmnichannelSale.aggregate([
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            creatorRoyaltyCents: { $sum: { $ifNull: ['$royaltySettlement.creatorRoyaltyCents', 0] } },
            platformFeeCents: { $sum: { $ifNull: ['$royaltySettlement.platformFeeCents', 0] } },
            sellerNetCents: { $sum: { $ifNull: ['$royaltySettlement.sellerNetCents', 0] } },
          },
        },
      ]),
      OmnichannelSale.find({ 'royaltySettlement.amountCents': { $gt: 0 } })
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .select('itemId saleSource paymentMethod royaltySettlement createdAt blockchainReceipt')
        .lean(),
      ProvenanceReviewLog.find({})
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .lean(),
    ]);

    const royalty = royaltyAgg[0] || {
      totalSales: 0,
      creatorRoyaltyCents: 0,
      platformFeeCents: 0,
      sellerNetCents: 0,
    };

    return res.json({
      ok: true,
      summary: {
        totalArtifacts,
        withProvenance,
        missingProvenance: Math.max(totalArtifacts - withProvenance, 0),
        flaggedProvenance,
        duplicateFingerprintGroups: duplicateFingerprintRows.length,
        reverseImageLikelyDuplicateCount,
        totalSales: royalty.totalSales,
        creatorRoyaltyCents: royalty.creatorRoyaltyCents,
        platformFeeCents: royalty.platformFeeCents,
        sellerNetCents: royalty.sellerNetCents,
      },
      duplicateFingerprintRows,
      recentReverseImageRisks,
      recentRoyaltySales,
      recentReviewLogs,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/orders/:id (admin only - single order)
router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ ok: false, error: "Order not found" });
    return res.json({ ok: true, item: order });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
