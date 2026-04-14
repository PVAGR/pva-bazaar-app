const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Artifact = require('../models/Artifact');
const OmnichannelSale = require('../models/OmnichannelSale');
const { authenticateToken } = require('../middleware/auth');
const {
  completeSaleAcrossChannels,
  findItemByChannelOrId,
} = require('../service/omnichannelSyncService');
const { runPollingSync } = require('../service/omnichannelPollingService');

const router = express.Router();
const SUPPORTED = ['pva', 'ebay', 'etsy', 'amazon', 'facebook', 'shopify', 'manual'];
const LISTING_CHANNELS = ['ebay', 'etsy', 'amazon', 'facebook', 'shopify'];

function hasAdminAccess(req) {
  const adminCode = req.headers['x-admin-code'];
  if (adminCode && adminCode === process.env.ADMIN_SECRET_CODE) {
    return true;
  }

  const cookieToken = req.cookies && req.cookies.admin_token;
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
      if (decoded && decoded.role === 'admin') return true;
    } catch (_) {
    }
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (bearerToken) {
    try {
      const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
      if (decoded && decoded.role === 'admin') return true;
    } catch (_) {
    }
  }

  return false;
}

function canManageItem(req, item) {
  if (!item) return false;
  if (hasAdminAccess(req)) return true;
  if (!req.user?.id) return false;
  return String(item.creator) === String(req.user.id);
}

function ensureOmnichannelShape(item) {
  if (!item.omnichannel) {
    item.omnichannel = {};
  }
  if (!Array.isArray(item.omnichannel.channels)) {
    item.omnichannel.channels = [];
  }
}

router.get('/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await findItemByChannelOrId({ itemId });
    if (!item) return res.status(404).json({ ok: false, error: 'Item not found' });
    if (!canManageItem(req, item)) return res.status(403).json({ ok: false, error: 'Forbidden' });

    ensureOmnichannelShape(item);

    return res.json({
      ok: true,
      itemId: String(item._id),
      soldState: item.omnichannel.soldState || { isSold: false },
      channels: item.omnichannel.channels,
      lastSyncAt: item.omnichannel.lastSyncAt || null,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/:itemId/sales', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 10, 50));
    const item = await findItemByChannelOrId({ itemId });
    if (!item) return res.status(404).json({ ok: false, error: 'Item not found' });
    if (!canManageItem(req, item)) return res.status(403).json({ ok: false, error: 'Forbidden' });

    const sales = await OmnichannelSale.find({ itemId: item._id })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    return res.json({
      ok: true,
      itemId: String(item._id),
      sales,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/:itemId/listings', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const channels = Array.isArray(req.body?.channels) ? req.body.channels : [];

    if (!channels.length) {
      return res.status(400).json({ ok: false, error: 'channels[] payload is required' });
    }

    const item = await findItemByChannelOrId({ itemId });
    if (!item) return res.status(404).json({ ok: false, error: 'Item not found' });
    if (!canManageItem(req, item)) return res.status(403).json({ ok: false, error: 'Forbidden' });

    ensureOmnichannelShape(item);

    const nextChannels = channels
      .filter((entry) => LISTING_CHANNELS.includes(String(entry.channel || '').toLowerCase()))
      .map((entry) => ({
        channel: String(entry.channel).toLowerCase(),
        externalListingId: String(entry.externalListingId || ''),
        externalUrl: String(entry.externalUrl || ''),
        syncMode: ['webhook', 'polling', 'manual'].includes(String(entry.syncMode || '').toLowerCase())
          ? String(entry.syncMode).toLowerCase()
          : 'manual',
        status: ['listed', 'sold', 'delisted', 'error'].includes(String(entry.status || '').toLowerCase())
          ? String(entry.status).toLowerCase()
          : 'listed',
        lastSyncedAt: new Date(),
        lastSyncMessage: String(entry.lastSyncMessage || 'Updated by creator'),
      }));

    if (!nextChannels.length) {
      return res.status(400).json({ ok: false, error: 'No valid marketplace channels in payload' });
    }

    item.omnichannel.channels = nextChannels;
    item.omnichannel.lastSyncAt = new Date();
    await item.save();

    return res.json({
      ok: true,
      itemId: String(item._id),
      channels: item.omnichannel.channels,
      soldState: item.omnichannel.soldState || { isSold: false },
      message: 'Marketplace listings saved',
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/sales/complete', async (req, res) => {
  try {
    const authHeader = req.headers['x-omni-sync-secret'];
    const secret = process.env.OMNICHANNEL_SYNC_SECRET || '';
    const hasServiceAuth = secret && authHeader === secret;

    if (!hasServiceAuth && !hasAdminAccess(req)) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const {
      itemId,
      saleSource = 'pva',
      externalSaleId,
      orderId,
      paymentMethod = 'manual',
      buyerEmail,
      buyerWallet,
      amountCents,
      currency = 'usd',
      idempotencyKey,
    } = req.body || {};

    if (!itemId) {
      return res.status(400).json({ ok: false, error: 'itemId is required' });
    }

    if (!SUPPORTED.includes(String(saleSource).toLowerCase())) {
      return res.status(400).json({ ok: false, error: 'Invalid saleSource' });
    }

    const item = await findItemByChannelOrId({ itemId });
    if (!item) return res.status(404).json({ ok: false, error: 'Item not found' });

    const result = await completeSaleAcrossChannels({
      item,
      orderId: mongoose.Types.ObjectId.isValid(orderId) ? orderId : undefined,
      saleSource: String(saleSource).toLowerCase(),
      externalSaleId: externalSaleId ? String(externalSaleId) : '',
      paymentMethod: String(paymentMethod || 'manual').toLowerCase(),
      buyerEmail: buyerEmail ? String(buyerEmail) : '',
      buyerWallet: buyerWallet ? String(buyerWallet) : '',
      amountCents: Number(amountCents || 0),
      currency: String(currency || 'usd').toLowerCase(),
      idempotencyKey: idempotencyKey ? String(idempotencyKey) : '',
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json({
      ok: true,
      duplicate: !!result.duplicate,
      alreadySold: !!result.alreadySold,
      itemId: String(result.item._id),
      soldState: result.item.omnichannel?.soldState || { isSold: false },
      delistResults: result.delistResults || [],
      blockchainReceipt: result.blockchainReceipt || null,
      saleId: result.sale?._id || null,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/:itemId/mark-sold', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const {
      saleSource = 'manual',
      externalSaleId = '',
      paymentMethod = 'manual',
      buyerEmail = '',
      buyerWallet = '',
      amountCents,
      currency = 'usd',
      idempotencyKey = '',
    } = req.body || {};

    if (!SUPPORTED.includes(String(saleSource).toLowerCase())) {
      return res.status(400).json({ ok: false, error: 'Invalid saleSource' });
    }

    const item = await findItemByChannelOrId({ itemId });
    if (!item) return res.status(404).json({ ok: false, error: 'Item not found' });
    if (!canManageItem(req, item)) return res.status(403).json({ ok: false, error: 'Forbidden' });

    const result = await completeSaleAcrossChannels({
      item,
      saleSource: String(saleSource).toLowerCase(),
      externalSaleId: String(externalSaleId || ''),
      paymentMethod: String(paymentMethod || 'manual').toLowerCase(),
      buyerEmail: String(buyerEmail || ''),
      buyerWallet: String(buyerWallet || ''),
      amountCents: Number(amountCents || Math.round(Number(item.price || 0) * 100) || 0),
      currency: String(currency || 'usd').toLowerCase(),
      idempotencyKey: String(idempotencyKey || `manual:${String(item._id)}:${String(externalSaleId || '')}`),
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json({
      ok: true,
      duplicate: !!result.duplicate,
      alreadySold: !!result.alreadySold,
      itemId: String(result.item._id),
      soldState: result.item.omnichannel?.soldState || { isSold: false },
      delistResults: result.delistResults || [],
      blockchainReceipt: result.blockchainReceipt || null,
      saleId: result.sale?._id || null,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/sync/poll-run', async (req, res) => {
  try {
    const authHeader = req.headers['x-omni-sync-secret'];
    const secret = process.env.OMNICHANNEL_SYNC_SECRET || '';
    const hasServiceAuth = secret && authHeader === secret;

    if (!hasServiceAuth && !hasAdminAccess(req)) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const limit = Math.max(1, Math.min(Number(req.body?.limit) || 25, 200));
    const result = await runPollingSync({ limit });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/webhooks/:channel/sale', async (req, res) => {
  try {
    const { channel } = req.params;
    const normalizedChannel = String(channel || '').toLowerCase();
    if (!LISTING_CHANNELS.includes(normalizedChannel)) {
      return res.status(400).json({ ok: false, error: 'Unsupported channel' });
    }

    const incomingToken = req.headers['x-omni-webhook-token'];
    const expectedToken = process.env.OMNICHANNEL_WEBHOOK_TOKEN || '';
    if (expectedToken && incomingToken !== expectedToken) {
      return res.status(401).json({ ok: false, error: 'Invalid webhook token' });
    }

    const payload = req.body || {};
    const item = await findItemByChannelOrId({
      itemId: payload.itemId,
      channel: normalizedChannel,
      externalListingId: payload.externalListingId,
    });

    if (!item) {
      return res.status(404).json({ ok: false, error: 'Mapped item not found for webhook sale' });
    }

    const result = await completeSaleAcrossChannels({
      item,
      saleSource: normalizedChannel,
      externalSaleId: String(payload.externalSaleId || payload.orderId || payload.transactionId || ''),
      paymentMethod: String(payload.paymentMethod || 'card').toLowerCase(),
      buyerEmail: String(payload.buyerEmail || ''),
      buyerWallet: String(payload.buyerWallet || ''),
      amountCents: Number(payload.amountCents || 0),
      currency: String(payload.currency || 'usd').toLowerCase(),
      idempotencyKey: String(payload.idempotencyKey || `${normalizedChannel}:${payload.externalSaleId || payload.orderId || payload.transactionId || ''}`),
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json({
      ok: true,
      itemId: String(result.item._id),
      duplicate: !!result.duplicate,
      alreadySold: !!result.alreadySold,
      delistResults: result.delistResults || [],
      blockchainReceipt: result.blockchainReceipt || null,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
