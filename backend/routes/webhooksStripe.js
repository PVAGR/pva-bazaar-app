const crypto = require("crypto");
const { finalizeSale, releaseReservation } = require("../lib/itemInventory");
const express = require("express");
const router = express.Router();
const stripe = require("../lib/stripeClient");
const Order = require("../models/Order");
const SharePurchase = require("../models/SharePurchase");
const StripeEventLog = require("../models/StripeEventLog");
const PhysicalFulfillment = require("../models/PhysicalFulfillment");
const FulfillmentTransactionLog = require("../models/FulfillmentTransactionLog");
const VerificationResult = require("../models/VerificationResult");
const Artifact = require('../models/Artifact');
const { sendFulfillmentConfirmationEmail, sendPaymentFailedEmail } = require("../service/emailService");
const { createTransactionEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');
const { completeSaleAcrossChannels } = require('../service/omnichannelSyncService');
const { appendLifecycleEventForArtifact } = require('../service/dppLifecycleService');

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || "https://pvabazaar.org";

function logFulfillment(eventId, orderId, action, payload, success = true, errorMessage = null) {
  return FulfillmentTransactionLog.create({
    eventId: eventId || `log-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    orderId: orderId ? String(orderId) : undefined,
    action,
    payload,
    success,
    errorMessage: errorMessage || undefined,
  }).catch((err) => console.error("FulfillmentTransactionLog create error:", err));
}

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

    // --- Share purchase webhook branch ---
    if (session.metadata?.order_type === 'share_purchase') {
      const purchaseId = session.metadata?.share_purchase_id || session.client_reference_id;
      if (purchaseId) {
        const purchase = await SharePurchase.findOne({
          $or: [{ _id: purchaseId }, { stripeSessionId: session.id }],
        });
        if (purchase && purchase.paymentStatus !== 'paid') {
          purchase.paymentStatus = 'paid';
          purchase.stripePaymentIntentId = session.payment_intent || '';
          purchase.buyerEmail = purchase.buyerEmail || session.customer_details?.email || '';
          purchase.buyerName = purchase.buyerName || session.customer_details?.name || '';
          purchase.idempotencyKey = `stripe_session:${session.id}`;
          purchase.finalizedAt = new Date();
          await purchase.save();

          await Artifact.findByIdAndUpdate(purchase.artifactId, {
            $push: {
              ownershipHistory: {
                owner: purchase.buyerEmail || 'unknown',
                date: new Date(),
                transactionHash: session.payment_intent || '',
              },
            },
          });

          await appendLifecycleEventForArtifact({
            artifactId: purchase.artifactId,
            artifactSlug: purchase.artifactSlug || '',
            type: 'resold',
            notes: `Fractional share purchase paid (${purchase.quantity} share(s))`,
            txHash: session.payment_intent || '',
            externalRef: `stripe_share:${session.id}`,
            metadata: {
              orderType: 'share_purchase',
              sessionId: session.id,
              purchaseId: String(purchase._id),
              quantity: Number(purchase.quantity || 0),
              totalAmountCents: Number(purchase.totalAmountCents || 0),
              currency: purchase.currency || 'USD',
            },
            occurredAt: new Date(),
          }).catch(() => {});

          await logFulfillment(event.id, null, 'share_purchase_paid', {
            purchaseId: String(purchase._id),
            qty: purchase.quantity,
            artifactId: String(purchase.artifactId),
          });
        }
      }
      return res.json({ received: true });
    }
    // --- End share purchase webhook branch ---

    const orderId = session.client_reference_id || session.metadata?.orderId;
    const reservationId = session.metadata?.reservationId;
    const itemId = session.metadata?.itemId;
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
        if (reservationId) await finalizeSale(reservationId);
        await order.save();

        // Grant digital download access (resilient: failures logged, do not fail webhook)
        const downloadToken = crypto.randomBytes(24).toString("hex");
        order.downloadGrantedAt = new Date();
        order.downloadToken = downloadToken;
        let certificateId = null;
        try {
          const ver = await VerificationResult.findOne({ artifactIdOrSlug: order.itemId || itemId })
            .sort({ verified_at: -1 })
            .lean();
          if (ver && ver.is_authentic) certificateId = ver.certificateId;
        } catch (e) {
          console.warn("Verification lookup for certificate:", e.message);
        }
        order.certificateId = certificateId || undefined;
        await order.save();
        await logFulfillment(event.id, orderId, "download_granted", { hasCertificate: !!certificateId });

        // Mark item sold across external channels after successful checkout.
        try {
          const itemDoc = await Artifact.findById(order.itemId);
          if (itemDoc) {
            await completeSaleAcrossChannels({
              item: itemDoc,
              orderId: order._id,
              saleSource: 'pva',
              externalSaleId: session.id,
              paymentMethod: 'card',
              buyerEmail: order.customerEmail || '',
              buyerWallet: '',
              amountCents: order.amountTotal || session.amount_total || 0,
              currency: order.currency || session.currency || 'usd',
              idempotencyKey: `stripe_session:${session.id}`,
            });

            await appendLifecycleEventForArtifact({
              artifactId: itemDoc._id,
              artifactSlug: itemDoc.slug || '',
              type: 'sold',
              notes: 'Stripe checkout.session.completed payment confirmed',
              txHash: session.payment_intent || '',
              externalRef: `stripe_order:${session.id}`,
              metadata: {
                orderType: 'full_purchase',
                sessionId: session.id,
                orderId: String(order._id),
                amountCents: Number(order.amountTotal || session.amount_total || 0),
                currency: order.currency || session.currency || 'usd',
                paymentMethod: 'card',
              },
              occurredAt: new Date(),
            }).catch(() => {});
          }
        } catch (syncErr) {
          console.warn('Omnichannel sync skipped:', syncErr?.message || syncErr);
        }

        // Dispatch payment confirmed event to OpenClaw (non-blocking)
        dispatchToOpenClaw(createTransactionEvent('confirmed', {
          _id: order._id,
          artifactId: order.itemId,
          amount: order.amountTotal,
          currency: order.currency,
          status: 'paid',
        }, {
          stripeSessionId: session.id,
          customerEmail: order.customerEmail,
          hasCertificate: !!certificateId,
        })).catch(() => {});

        // Physical fulfillment row (for disc burn)
        try {
          await PhysicalFulfillment.create({
            orderId: order._id,
            itemId: String(order.itemId),
            itemName: order.itemSnapshot?.name,
            customerEmail: order.customerEmail,
            customerName: order.customerName,
            status: "pending",
          });
          await logFulfillment(event.id, orderId, "physical_fulfillment_created", {});
        } catch (pfErr) {
          console.error("PhysicalFulfillment create error:", pfErr);
          await logFulfillment(event.id, orderId, "physical_fulfillment_created", {}, false, pfErr.message);
        }

        // Confirmation email with download link and Certificate of Authenticity
        if (order.customerEmail) {
          sendFulfillmentConfirmationEmail({
            to: order.customerEmail,
            orderId: order._id.toString(),
            downloadToken,
            itemName: order.itemSnapshot?.name || "Artifact",
            certificateId,
            publicSiteUrl: PUBLIC_SITE_URL,
          }).then(() => logFulfillment(event.id, orderId, "email_sent", {})).catch((emailErr) => {
            console.error("Fulfillment confirmation email failed:", emailErr);
            logFulfillment(event.id, orderId, "email_sent", {}, false, emailErr.message);
          });
        }
      }
    }
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;

    // Release fractional share reservations for unpaid share purchases.
    if (session.metadata?.order_type === 'share_purchase') {
      const purchaseId = session.metadata?.share_purchase_id || session.client_reference_id;
      const purchase = purchaseId
        ? await SharePurchase.findOne({
          $or: [{ _id: purchaseId }, { stripeSessionId: session.id }],
        })
        : null;

      if (purchase && purchase.paymentStatus === 'pending') {
        purchase.paymentStatus = 'failed';
        purchase.idempotencyKey = purchase.idempotencyKey || `stripe_session:${session.id}`;
        await purchase.save();

        await Artifact.findByIdAndUpdate(purchase.artifactId, {
          $inc: { 'fractionalization.soldShares': -Math.max(0, Number(purchase.quantity || 0)) },
        });

        await logFulfillment(event.id, null, 'share_purchase_released', {
          purchaseId: String(purchase._id),
          artifactId: String(purchase.artifactId),
          qty: purchase.quantity,
          eventType: event.type,
        }).catch(() => {});
      }

      return res.json({ received: true });
    }

    const reservationId = session.metadata?.reservationId;
    if (reservationId) await releaseReservation(reservationId);
    const email = session.customer_details?.email;
    if (email && event.type === "checkout.session.async_payment_failed") {
      sendPaymentFailedEmail({
        to: email,
        itemName: session.metadata?.itemName,
        publicSiteUrl: PUBLIC_SITE_URL,
      }).catch((e) => console.warn("Payment failed email:", e.message));
    }
    await logFulfillment(event.id, null, "payment_failed_or_expired", { type: event.type }).catch(() => {});
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
