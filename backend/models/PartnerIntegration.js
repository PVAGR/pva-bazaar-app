// backend/models/PartnerIntegration.js - Partner sync tracking (Shopify, Amazon, OpenSea, etc.)
const mongoose = require('mongoose');

const partnerIntegrationSchema = new mongoose.Schema({
  // Seller & partner
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  partner: {
    type: String,
    enum: ['shopify', 'woocommerce', 'amazon', 'etsy', 'opensea', 'wechat', 'ebay', 'tiktok_shop'],
    required: true,
  },

  // Partner account connection
  partnerAccountId: String, // e.g., Shopify shop ID
  partnerAccountName: String, // e.g., "my-shop.myshopify.com"
  partnerAccessToken: String, // encrypted in DB
  partnerApiUrl: String,

  // Sync settings
  syncStatus: {
    type: String,
    enum: ['connected', 'paused', 'error', 'disconnected'],
    default: 'connected',
    index: true,
  },
  autoSync: { type: Boolean, default: true },
  syncIntervalMinutes: { type: Number, default: 60 },

  // Sync tracking
  lastSyncAt: Date,
  nextSyncAt: Date,
  lastSyncStatus: String, // 'success', 'partial', 'failed'
  lastSyncMessage: String,
  syncErrorCount: { type: Number, default: 0 },

  // What syncs
  syncProductData: { type: Boolean, default: true },
  syncInventory: { type: Boolean, default: true },
  syncOrders: { type: Boolean, default: true },
  syncCustomers: { type: Boolean, default: false },

  // Mapping
  productMapping: [
    {
      pvaProductId: mongoose.Schema.Types.ObjectId,
      partnerProductId: String,
      syncedAt: Date,
    },
  ],

  // Statistics
  totalProductsLinked: { type: Number, default: 0 },
  totalOrdersSynced: { type: Number, default: 0 },
  totalInventoryUpdates: { type: Number, default: 0 },

  // Configuration
  settings: {
    excludeOutOfStock: { type: Boolean, default: false },
    autoPublishProducts: { type: Boolean, default: true },
    priceMarkup: { type: Number, default: 0 }, // percentage
    customTaxRate: Number, // override tax calc
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

partnerIntegrationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PartnerIntegration', partnerIntegrationSchema);
