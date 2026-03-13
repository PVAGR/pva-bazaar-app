const { reserveOne } = require("../lib/itemInventory");
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const router = express.Router();
const stripe = require("../lib/stripeClient");
const Artifact = require("../models/Artifact");
const { toPublicItem } = require("../lib/itemNormalize");
const Order = require("../models/Order");
const { createTransactionEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || "https://pvabazaar.org";

// POST /api/checkout/create-session
router.post("/create-session", async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ ok: false, error: "Missing itemId" });
    const artifact = await Artifact.findOne({ $or: [{ _id: itemId }, { slug: itemId }] });
    if (!artifact) return res.status(404).json({ ok: false, error: "Item not found" });
    if (artifact.status !== "published") return res.status(403).json({ ok: false, error: "Item not available for purchase" });
    const item = toPublicItem(artifact);
    if (!item.priceCents || !item.currency) return res.status(400).json({ ok: false, error: "Item missing price/currency" });

    // Reserve inventory
    const reservationId = uuidv4();
    const reserve = await reserveOne(item.id, reservationId);
    if (!reserve.ok) return res.status(409).json({ ok: false, error: "sold_out" });

    // Create Order (pending)
    const order = await Order.create({
      itemId: item.id,
      itemSnapshot: {
        name: item.name,
        slug: item.slug,
        priceCents: item.priceCents,
        currency: item.currency,
        media0: item.media && item.media.length ? item.media[0] : undefined,
      },
      stripeSessionId: null, // will update after session creation
      paymentStatus: "pending",
      amountTotal: item.priceCents,
      currency: item.currency,
      reservationId,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: item.currency.toLowerCase(),
            unit_amount: item.priceCents,
            product_data: {
              name: item.name,
              description: item.description || undefined,
              images: item.media && item.media.length ? [item.media[0]] : undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${PUBLIC_SITE_URL}/#/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_SITE_URL}/#/checkout/cancel`,
      client_reference_id: order._id.toString(),
      metadata: {
        orderId: order._id.toString(),
        itemId: item.id,
        itemSlug: item.slug || "",
        itemName: item.name || "",
        reservationId,
      },
    });

    // Update order with session id
    order.stripeSessionId = session.id;
    await order.save();

    // Dispatch transaction created event (non-blocking)
    dispatchToOpenClaw(createTransactionEvent('created', {
      _id: order._id,
      artifactId: item.id,
      amount: item.priceCents,
      currency: item.currency,
      status: order.paymentStatus,
    }, {
      itemId: item.id,
      itemName: item.name,
      amountCents: item.priceCents,
      currency: item.currency,
      sessionId: session.id
    }));

    return res.json({ ok: true, url: session.url, orderId: order._id.toString() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/checkout/session?session_id=...
router.get("/session", async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ ok: false, error: "Missing session_id" });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session) return res.status(404).json({ ok: false, error: "Session not found" });
    return res.json({
      ok: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_details: session.customer_details,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/checkout/download?order_id=...&token=...
// Validates token and redirects to digital download URL (or returns JSON if no URL configured).
router.get("/download", async (req, res) => {
  try {
    const { order_id, token } = req.query;
    if (!order_id || !token) return res.status(400).json({ ok: false, error: "Missing order_id or token" });
    const order = await Order.findOne({ _id: order_id, downloadToken: token });
    if (!order) return res.status(404).json({ ok: false, error: "Invalid or expired download link" });
    if (!order.downloadGrantedAt) return res.status(403).json({ ok: false, error: "Download not granted for this order" });
    const artifact = await Artifact.findById(order.itemId).select("downloadUrl name").lean();
    const downloadUrl = artifact?.downloadUrl;
    if (downloadUrl) {
      return res.redirect(302, downloadUrl);
    }
    return res.json({
      ok: true,
      message: "Download access confirmed. No file URL configured for this item; you may receive it by email or physical shipment.",
      itemName: order.itemSnapshot?.name,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
