// backend/routes/integrations.js - Partner integrations (Shopify, Amazon, OpenSea, WeChat, etc.)
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const APIKey = require('../models/APIKey');
const PartnerIntegration = require('../models/PartnerIntegration');
const ProductType = require('../models/ProductType');
const Order = require('../models/Order');
const InventoryLocation = require('../models/InventoryLocation');

// Middleware: Authenticate API key
const authenticateAPIKey = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid API key' });
    }

    const apiKey = authHeader.substring(7);
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const key = await APIKey.findOne({ keyHash, status: 'active' });
    if (!key) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      return res.status(401).json({ error: 'API key expired' });
    }

    // Rate limiting
    const now = new Date();
    if (!key.rateLimit.resetMinuteAt || now > key.rateLimit.resetMinuteAt) {
      key.rateLimit.currentMinuteRequests = 0;
      key.rateLimit.resetMinuteAt = new Date(now.getTime() + 60000);
    }

    if (key.rateLimit.currentMinuteRequests >= key.rateLimit.requestsPerMinute) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    key.rateLimit.currentMinuteRequests++;
    key.totalRequests++;
    key.lastUsedAt = now;
    await key.save();

    req.apiKey = key;
    req.sellerId = key.developerId;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ API Key Management ============

/**
 * Create new API key for developer
 * POST /api/v1/keys
 */
router.post('/keys', authenticateToken, async (req, res) => {
  try {
    const { applicationName, permissions = [], environment = 'test', expiresInDays = 365 } = req.body;

    if (!applicationName) {
      return res.status(400).json({ error: 'applicationName required' });
    }

    const keyPrefix = environment === 'live' ? 'pk_live_' : 'pk_test_';

    const apiKey = new APIKey({
      developerId: req.user.id,
      applicationName,
      permissions,
      environment,
      keyPrefix,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    });

    await apiKey.save();

    res.status(201).json({
      id: apiKey._id,
      key: `${apiKey.keyPrefix}${crypto.randomBytes(32).toString('hex')}`, // Only shown once
      maskedKey: apiKey.maskedKey,
      environment,
      permissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List API keys for authenticated developer
 * GET /api/v1/keys
 */
router.get('/keys', authenticateToken, async (req, res) => {
  try {
    const keys = await APIKey.find({ developerId: req.user.id }).select('-keyHash');

    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Revoke API key
 * DELETE /api/v1/keys/:keyId
 */
router.delete('/keys/:keyId', authenticateToken, async (req, res) => {
  try {
    const { keyId } = req.params;

    const key = await APIKey.findOneAndUpdate(
      { _id: keyId, developerId: req.user.id },
      { status: 'revoked', revokedAt: new Date(), revokeReason: 'User revoked' },
      { new: true }
    );

    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }

    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Public API Endpoints (v1) ============

/**
 * List seller's products (for partners)
 * GET /api/v1/products
 */
router.get('/products', authenticateAPIKey, async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;

    const query = { sellerId: req.sellerId };
    if (type) query.type = type;

    const products = await ProductType.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('title description price type stockQty status');

    const total = await ProductType.countDocuments(query);

    res.json({
      products,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single product details
 * GET /api/v1/products/:productId
 */
router.get('/products/:productId', authenticateAPIKey, async (req, res) => {
  try {
    const product = await ProductType.findOne({
      _id: req.params.productId,
      sellerId: req.sellerId,
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Sync inventory levels
 * POST /api/v1/inventory/sync
 */
router.post('/inventory/sync', authenticateAPIKey, async (req, res) => {
  try {
    const { updates } = req.body; // [{ productId, fulfillmentCenterId, qtyOnHand }, ...]

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates must be array' });
    }

    const results = [];

    for (const update of updates) {
      const inventory = await InventoryLocation.findOneAndUpdate(
        {
          productId: update.productId,
          fulfillmentCenterId: update.fulfillmentCenterId,
        },
        { qtyOnHand: update.qtyOnHand },
        { new: true }
      );

      results.push({ productId: update.productId, success: !!inventory });
    }

    res.json({ synced: results.length, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List seller's orders
 * GET /api/v1/orders
 */
router.get('/orders', authenticateAPIKey, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;

    const query = { sellerId: req.sellerId };
    if (status) query.fulfillmentStatus = status;

    const orders = await Order.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark order as fulfilled
 * POST /api/v1/orders/:orderId/fulfill
 */
router.post('/orders/:orderId/fulfill', authenticateAPIKey, async (req, res) => {
  try {
    const { trackingNumber, carrier } = req.body;

    const order = await Order.findOneAndUpdate(
      { _id: req.params.orderId, sellerId: req.sellerId },
      {
        fulfillmentStatus: 'shipped',
        shippedAt: new Date(),
        trackingNumber,
        carrier,
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get seller analytics
 * GET /api/v1/analytics
 */
router.get('/analytics', authenticateAPIKey, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Simplified analytics response
    const analytics = {
      period,
      totalRevenue: 0,
      totalOrders: 0,
      totalProducts: 0,
      conversionRate: 0,
      averageOrderValue: 0,
      topProducts: [],
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Register webhook
 * POST /api/v1/webhooks/register
 */
router.post('/webhooks/register', authenticateAPIKey, async (req, res) => {
  try {
    const { event, url } = req.body;

    if (!['product.created', 'product.updated', 'order.created', 'order.updated', 'inventory.changed'].includes(event)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    if (!url) {
      return res.status(400).json({ error: 'url required' });
    }

    // In production, store webhook registration and trigger on events
    res.json({
      success: true,
      webhook: {
        event,
        url,
        active: true,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ Partner Integrations ============

/**
 * Connect partner account (OAuth callback handler)
 * POST /api/integrations/connect/:partner
 */
router.post('/connect/:partner', authenticateToken, async (req, res) => {
  try {
    const { partner } = req.params;
    const { partnerAccessToken, partnerAccountId, partnerAccountName } = req.body;

    if (!['shopify', 'amazon', 'etsy', 'opensea', 'wechat', 'woocommerce', 'ebay', 'tiktok_shop'].includes(partner)) {
      return res.status(400).json({ error: 'Invalid partner' });
    }

    if (!partnerAccessToken) {
      return res.status(400).json({ error: 'partnerAccessToken required' });
    }

    let integration = await PartnerIntegration.findOne({
      sellerId: req.user.id,
      partner,
    });

    if (!integration) {
      integration = new PartnerIntegration({
        sellerId: req.user.id,
        partner,
      });
    }

    integration.partnerAccessToken = partnerAccessToken; // In production, encrypt this
    integration.partnerAccountId = partnerAccountId;
    integration.partnerAccountName = partnerAccountName;
    integration.syncStatus = 'connected';
    integration.nextSyncAt = new Date();

    await integration.save();

    res.json({
      success: true,
      integration: {
        _id: integration._id,
        partner: integration.partner,
        partnerAccountName: integration.partnerAccountName,
        syncStatus: integration.syncStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List seller's partner integrations
 * GET /api/integrations
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const integrations = await PartnerIntegration.find({ sellerId: req.user.id }).select('-partnerAccessToken');

    res.json(integrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Manually trigger sync with partner
 * POST /api/integrations/:partner/sync
 */
router.post('/:partner/sync', authenticateToken, async (req, res) => {
  try {
    const { partner } = req.params;

    const integration = await PartnerIntegration.findOne({
      sellerId: req.user.id,
      partner,
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (integration.syncStatus !== 'connected') {
      return res.status(400).json({ error: `Integration status is ${integration.syncStatus}` });
    }

    // Trigger sync (in production, queue background job)
    integration.lastSyncAt = new Date();
    integration.nextSyncAt = new Date(Date.now() + integration.syncIntervalMinutes * 60 * 1000);
    integration.lastSyncStatus = 'in_progress';

    await integration.save();

    res.json({
      success: true,
      message: `Sync started for ${partner}`,
      nextSync: integration.nextSyncAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
