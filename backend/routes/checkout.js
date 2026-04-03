const { reserveOne, finalizeSale, releaseReservation } = require("../lib/itemInventory");
const { v4: uuidv4 } = require("uuid");
const crypto = require('crypto');
const express = require("express");
const router = express.Router();
const stripe = require("../lib/stripeClient");
const jwt = require('jsonwebtoken');
const Artifact = require("../models/Artifact");
const { toPublicItem } = require("../lib/itemNormalize");
const Order = require("../models/Order");
const VerificationResult = require('../models/VerificationResult');
const { createTransactionEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');
const { inspectTransaction, getExplorerTxUrl, normalizeNetwork } = require('../utils/blockchain');
const { completeSaleAcrossChannels } = require('../service/omnichannelSyncService');

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || "https://pvabazaar.org";

function extractUserIdFromAuth(req) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id || null;
  } catch (_) {
    return null;
  }
}

function getCryptoQuoteRateUsdPerEth() {
  const raw = Number(process.env.CRYPTO_USD_PER_ETH || 3000);
  return Number.isFinite(raw) && raw > 0 ? raw : 3000;
}

function quoteWeiFromCents(priceCents, usdPerEth) {
  const cents = BigInt(Math.max(0, Number(priceCents || 0)));
  const rateScaled = BigInt(Math.max(1, Math.round(Number(usdPerEth || 0) * 100)));
  const wei = (cents * (10n ** 18n)) / rateScaled;
  return wei > 0n ? wei : 1n;
}

function trimAddress(input) {
  return String(input || '').trim();
}

function safeBigInt(value, fallback = 0n) {
  try {
    if (value == null || value === '') return fallback;
    return BigInt(String(value));
  } catch (_) {
    return fallback;
  }
}

function isMarkedSold(artifact) {
  return Boolean(artifact?.omnichannel?.soldState?.isSold);
}

// POST /api/checkout/create-session
router.post("/create-session", async (req, res) => {
  try {
    const buyerId = extractUserIdFromAuth(req);
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ ok: false, error: "Missing itemId" });
    const artifact = await Artifact.findOne({ $or: [{ _id: itemId }, { slug: itemId }] });
    if (!artifact) return res.status(404).json({ ok: false, error: "Item not found" });
    if (artifact.status !== "published") return res.status(403).json({ ok: false, error: "Item not available for purchase" });
    if (isMarkedSold(artifact)) return res.status(409).json({ ok: false, error: 'item_already_sold' });
    const item = toPublicItem(artifact);
    if (!item.priceCents || !item.currency) return res.status(400).json({ ok: false, error: "Item missing price/currency" });

    // Reserve inventory
    const reservationId = uuidv4();
    const reserve = await reserveOne(item.id, reservationId);
    if (!reserve.ok) return res.status(409).json({ ok: false, error: "sold_out" });

    // Create Order (pending)
    const order = await Order.create({
      buyerId,
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

// POST /api/checkout/finalize-session
// Idempotent fallback finalize path for success page (webhook-safe).
router.post('/finalize-session', async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ ok: false, error: 'Missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });
    if (session.payment_status !== 'paid') {
      return res.json({
        ok: true,
        pending: true,
        message: 'Payment is not settled yet',
        session: {
          id: session.id,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
        },
      });
    }

    const orderId = session.client_reference_id || session.metadata?.orderId;
    const order = await Order.findOne({
      $or: [
        ...(orderId ? [{ _id: orderId }] : []),
        { stripeSessionId: session.id },
      ],
    });

    if (!order) return res.status(404).json({ ok: false, error: 'Order not found for session' });

    // Ensure base paid fields are present (safe/idempotent updates).
    order.paymentStatus = 'paid';
    order.amountTotal = session.amount_total || order.amountTotal;
    order.currency = session.currency || order.currency;
    order.customerEmail = session.customer_details?.email || order.customerEmail;
    order.customerName = session.customer_details?.name || order.customerName;
    order.shipping = session.shipping_details || order.shipping || null;
    order.stripePaymentIntentId = session.payment_intent || order.stripePaymentIntentId || null;

    if (order.reservationId) {
      await finalizeSale(order.reservationId);
    }

    // Keep download entitlement aligned with webhook behavior.
    if (!order.downloadGrantedAt) {
      order.downloadGrantedAt = new Date();
    }
    if (!order.downloadToken) {
      order.downloadToken = crypto.randomBytes(24).toString('hex');
    }

    // Resolve certificate when available.
    if (!order.certificateId) {
      try {
        const ver = await VerificationResult.findOne({ artifactIdOrSlug: order.itemId })
          .sort({ verified_at: -1 })
          .lean();
        if (ver && ver.is_authentic) {
          order.certificateId = ver.certificateId;
        }
      } catch (_) {
        // no-op
      }
    }

    await order.save();

    let syncResult = null;
    const itemDoc = await Artifact.findById(order.itemId);
    if (itemDoc) {
      syncResult = await completeSaleAcrossChannels({
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
    }

    const downloadUrl = `${PUBLIC_SITE_URL.replace(/\/$/, '')}/#/checkout/download?order_id=${encodeURIComponent(order._id)}&token=${encodeURIComponent(order.downloadToken)}`;
    return res.json({
      ok: true,
      finalized: true,
      orderId: String(order._id),
      paymentStatus: order.paymentStatus,
      certificateId: order.certificateId || '',
      downloadUrl,
      blockchainReceipt: syncResult?.blockchainReceipt || null,
      delistResults: syncResult?.delistResults || [],
      duplicate: Boolean(syncResult?.duplicate),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/checkout/crypto/prepare
// Reserves inventory and returns chain payment parameters for wallet submission.
router.post('/crypto/prepare', async (req, res) => {
  try {
    const { itemId, buyerWallet, buyerEmail } = req.body || {};
    if (!itemId) return res.status(400).json({ ok: false, error: 'Missing itemId' });

    const artifact = await Artifact.findOne({ $or: [{ _id: itemId }, { slug: itemId }] });
    if (!artifact) return res.status(404).json({ ok: false, error: 'Item not found' });
    if (artifact.status !== 'published') {
      return res.status(403).json({ ok: false, error: 'Item not available for purchase' });
    }
    if (isMarkedSold(artifact)) {
      return res.status(409).json({ ok: false, error: 'item_already_sold' });
    }

    const item = toPublicItem(artifact);
    if (!item.priceCents || !item.currency) {
      return res.status(400).json({ ok: false, error: 'Item missing price/currency' });
    }

    const treasuryWallet = trimAddress(process.env.CRYPTO_TREASURY_WALLET || process.env.RECEIPT_TREASURY_WALLET);
    if (!treasuryWallet) {
      return res.status(503).json({ ok: false, error: 'Crypto checkout unavailable: treasury wallet not configured' });
    }

    const reservationId = uuidv4();
    const reserve = await reserveOne(item.id, reservationId);
    if (!reserve.ok) return res.status(409).json({ ok: false, error: 'sold_out' });

    const quoteUsdPerEth = getCryptoQuoteRateUsdPerEth();
    const amountWei = quoteWeiFromCents(item.priceCents, quoteUsdPerEth);
    const chainId = Number(process.env.CRYPTO_CHAIN_ID || 8453);
    const network = normalizeNetwork(process.env.CRYPTO_NETWORK || 'base');

    const order = await Order.create({
      itemId: item.id,
      itemSnapshot: {
        name: item.name,
        slug: item.slug,
        priceCents: item.priceCents,
        currency: item.currency,
        media0: item.media && item.media.length ? item.media[0] : undefined,
      },
      stripeSessionId: `crypto_intent_${reservationId}`,
      paymentStatus: 'pending',
      amountTotal: item.priceCents,
      currency: item.currency,
      customerEmail: buyerEmail || '',
      reservationId,
      crypto: {
        network,
        chainId,
        recipientAddress: treasuryWallet,
        buyerWallet: trimAddress(buyerWallet),
        expectedAmountWei: amountWei.toString(),
        quoteUsdPerEth,
        quoteGeneratedAt: new Date(),
      },
      adminNotes: `crypto_checkout_intent wallet=${trimAddress(buyerWallet)} network=${network}`,
    });

    return res.json({
      ok: true,
      orderId: String(order._id),
      itemId: item.id,
      network,
      chainId,
      recipientAddress: treasuryWallet,
      amountWei: amountWei.toString(),
      quoteUsdPerEth,
      quoteGeneratedAt: new Date().toISOString(),
      memo: `PVA:${item.slug || item.id}`,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/checkout/crypto/confirm
// Verifies transaction and finalizes sale in DB + omnichannel sync.
router.post('/crypto/confirm', async (req, res) => {
  try {
    const { orderId, txHash, buyerWallet } = req.body || {};
    if (!orderId || !txHash) {
      return res.status(400).json({ ok: false, error: 'Missing orderId or txHash' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });

    if (order.paymentStatus === 'paid' && order.stripePaymentIntentId === txHash) {
      const network = normalizeNetwork(process.env.CRYPTO_NETWORK || 'base');
      return res.json({
        ok: true,
        duplicate: true,
        txHash,
        explorerUrl: getExplorerTxUrl(network, txHash),
      });
    }

    const tx = await inspectTransaction(txHash);
    if (!tx.found) {
      return res.status(404).json({ ok: false, error: 'Transaction not found' });
    }
    if (tx.status === 'pending') {
      return res.status(409).json({ ok: false, error: 'Transaction is still pending confirmation' });
    }
    if (tx.status !== 'confirmed') {
      if (order.reservationId) await releaseReservation(order.reservationId);
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({ ok: false, error: 'Transaction failed on-chain' });
    }

    const expectedReceiver = trimAddress(process.env.CRYPTO_TREASURY_WALLET || process.env.RECEIPT_TREASURY_WALLET).toLowerCase();
    if (expectedReceiver && String(tx.toAddress || '').toLowerCase() !== expectedReceiver) {
      return res.status(400).json({ ok: false, error: 'Transaction recipient does not match treasury wallet' });
    }

    const expectedChainId = Number(order?.crypto?.chainId || process.env.CRYPTO_CHAIN_ID || 8453);
    if (Number.isFinite(expectedChainId) && tx.chainId && Number(tx.chainId) !== expectedChainId) {
      return res.status(400).json({ ok: false, error: 'Transaction chain does not match expected checkout network' });
    }

    const providedBuyerWallet = trimAddress(buyerWallet).toLowerCase();
    if (providedBuyerWallet && String(tx.fromAddress || '').toLowerCase() !== providedBuyerWallet) {
      return res.status(400).json({ ok: false, error: 'Transaction sender does not match buyer wallet' });
    }

    const expectedWei = safeBigInt(order?.crypto?.expectedAmountWei, 0n);
    const paidWei = safeBigInt(tx?.valueWei, 0n);
    if (expectedWei > 0n && paidWei < expectedWei) {
      return res.status(400).json({ ok: false, error: 'Transaction value is lower than expected quote amount' });
    }

    if (order.reservationId) {
      await finalizeSale(order.reservationId);
    }

    order.paymentStatus = 'paid';
    order.stripePaymentIntentId = txHash;
    order.customerName = order.customerName || 'Crypto Buyer';
    order.crypto = {
      ...(order.crypto || {}),
      txHash,
      paidAmountWei: tx.valueWei || '',
      buyerWallet: buyerWallet || tx.fromAddress || order?.crypto?.buyerWallet || '',
      explorerUrl: getExplorerTxUrl(normalizeNetwork(process.env.CRYPTO_NETWORK || order?.crypto?.network || 'base'), txHash),
      confirmedAt: new Date(),
    };
    order.adminNotes = `${order.adminNotes || ''}\ncrypto_confirmed tx=${txHash} from=${tx.fromAddress} to=${tx.toAddress}`.trim();
    await order.save();

    const itemDoc = await Artifact.findById(order.itemId);
    let syncResult = null;
    if (itemDoc) {
      syncResult = await completeSaleAcrossChannels({
        item: itemDoc,
        orderId: order._id,
        saleSource: 'pva',
        externalSaleId: txHash,
        paymentMethod: 'crypto',
        buyerEmail: order.customerEmail || '',
        buyerWallet: buyerWallet || tx.fromAddress || '',
        amountCents: order.amountTotal || 0,
        currency: order.currency || 'usd',
        idempotencyKey: `crypto:${txHash}`,
      });
    }

    const network = normalizeNetwork(process.env.CRYPTO_NETWORK || 'base');
    return res.json({
      ok: true,
      orderId: String(order._id),
      txHash,
      explorerUrl: getExplorerTxUrl(network, txHash),
      blockchainReceipt: syncResult?.blockchainReceipt || null,
      delistResults: syncResult?.delistResults || [],
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
