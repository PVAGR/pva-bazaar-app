// backend/models/DigitalProduct.js - Track digital downloads and access logs
const mongoose = require('mongoose');

const digitalProductSchema = new mongoose.Schema({
  // Reference to ProductType
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
    required: true,
    index: true,
  },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // File storage
  fileUrls: [
    {
      filename: String,
      url: String, // S3 or CDN URL
      fileSize: Number,
      mimeType: String,
      uploadedAt: Date,
      version: { type: Number, default: 1 },
    },
  ],

  // Access control
  accessControl: {
    type: String,
    enum: ['one_time', 'subscription', 'limited_views', 'unlimited'],
    default: 'one_time',
  },
  downloadLimit: Number, // null = unlimited
  expiresAt: Date, // null = no expiration
  subscriptionRequired: { type: Boolean, default: false },
  subscriptionPrice: Number, // monthly in cents
  subscriptionDuration: { type: Number, default: 30 }, // days

  // Delivery method
  deliveryMethod: {
    type: String,
    enum: ['instant', 'email', 'custom'],
    default: 'instant',
  },
  emailDeliveryTemplate: String,

  // Download tracking
  downloads: [
    {
      buyerId: mongoose.Schema.Types.ObjectId,
      orderId: mongoose.Schema.Types.ObjectId,
      downloadedAt: { type: Date, default: Date.now },
      ipAddress: String,
      userAgent: String,
      expiresAt: Date,
      downloadCount: { type: Number, default: 0 },
    },
  ],

  // Stats
  totalDownloads: { type: Number, default: 0 },
  uniqueDownloaders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 }, // cents

  // Reset/revisions
  revisions: [
    {
      version: Number,
      fileUrls: [String],
      uploadedAt: Date,
      notes: String,
    },
  ],
  currentVersion: { type: Number, default: 1 },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
digitalProductSchema.index({ productId: 1 });
digitalProductSchema.index({ sellerId: 1, createdAt: -1 });

// Auto-update updatedAt on changes
digitalProductSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('DigitalProduct', digitalProductSchema);
