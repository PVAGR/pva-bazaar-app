const { finalizeSale, releaseReservation } = require("../lib/itemInventory");
const express = require("express");
const router = express.Router();
const stripe = require("../lib/stripeClient");
const Order = require("../models/Order");
const StripeEventLog = require("../models/StripeEventLog");

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Use express.raw in index.js for this route!
router.post("/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  // Idempotency: check if event already processed
  const exists = await StripeEventLog.findOne({ eventId: event.id });
  if (exists) return res.json({ received: true });
  await StripeEventLog.create({ eventId: event.id, type: event.type });

  // Handle event types
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.client_reference_id || session.metadata?.orderId;
    const reservationId = session.metadata?.reservationId;
    if (orderId) {
      const order = await Order.findOne({ _id: orderId });
      if (order) {
        order.paymentStatus = "paid";
        order.amountTotal = session.amount_total;
        order.currency = session.currency;
        order.customerEmail = session.customer_details?.email;
        order.customerName = session.customer_details?.name;
        order.shipping = session.shipping_details || null;
        order.stripePaymentIntentId = session.payment_intent || null;
        await order.save();
        if (reservationId) await finalizeSale(reservationId);
      }
    }
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;
    const reservationId = session.metadata?.reservationId;
    if (reservationId) await releaseReservation(reservationId);
  }

  // Refund event handlers
  if (event.type === "charge.refunded" || event.type === "refund.updated" || event.type === "refund.succeeded") {
    const refund = event.data.object;
    // Find order by paymentIntent or refund id
    let order = null;
    if (refund.payment_intent) {
      order = await Order.findOne({ stripePaymentIntentId: refund.payment_intent });
    } else if (refund.id) {
      order = await Order.findOne({ stripeRefundId: refund.id });
    }
    if (order) {
      order.refundStatus = refund.status === "succeeded" ? "refunded" : refund.status;
      order.stripeRefundId = refund.id;
      order.refundAmountCents = refund.amount;
      order.refundedAt = refund.status === "succeeded" ? new Date() : undefined;
      if (refund.status === "succeeded") order.paymentStatus = "refunded";
      await order.save();
    }
  }
  // Optionally handle session.expired, etc.

  return res.json({ received: true });
});

module.exports = router;
