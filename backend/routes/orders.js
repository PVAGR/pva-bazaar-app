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
    return res.json({ ok: true, item: order });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const stripe = require("../lib/stripeClient");
const { requireAdmin } = require("./_adminAuth"); // You may need to adjust this import to your admin auth middleware

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

module.exports = router;
