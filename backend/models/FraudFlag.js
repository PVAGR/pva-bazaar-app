// backend/models/FraudFlag.js - Detect and track suspicious pricing anomalies
const mongoose = require('mongoose');

const fraudFlagSchema = new mongoose.Schema({
  // Entity flagged
  flagType: {
    type: String,
    enum: ['product', 'seller', 'transaction', 'price_anomaly'],
    required: true,
    index: true,
  },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType', sparse: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, sparse: true },

  // Anomaly details
  anomalyType: {
    type: String,
    enum: [
      'price_spike',
      'price_dump',
      'rapid_repricing',
      'bulk_manipulation',
      'coordinated_activity',
      'fake_demand',
      'inventory_mismatch',
      'payment_reversal',
      'duplicate_account',
      'unusual_volume',
    ],
    required: true,
    index: true,
  },

  // Detection method
  detectionMethod: {
    type: String,
    enum: ['ai_algorithm', 'rule_based', 'manual_report', 'statistical', 'behavioral'],
    default: 'ai_algorithm',
  },

  // Risk scoring
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  }, // 0-100, higher = more suspicious
  confidence: { type: Number, min: 0, max: 100 }, // How confident we are

  // Details & evidence
  details: {
    offenceDescription: String,
    priceHistory: [
      {
        price: Number,
        date: Date,
      },
    ],
    averageMarketPrice: Number,
    flaggedPrice: Number,
    priceDeviation: Number, // percentage from average
    volumeAnomaly: Number, // % above/below normal
  },

  // Impact assessment
  financialImpact: Number, // cents, estimated loss/manipulation value
  affectedListingCount: Number,
  affectedBuyerCount: Number,

  // Status & actions
  status: {
    type: String,
    enum: ['new', 'investigating', 'confirmed', 'resolved', 'false_positive'],
    default: 'new',
    index: true,
  },

  // Resolution
  resolutionMeasure: {
    type: String,
    enum: ['none', 'warning', 'listing_removed', 'account_suspended', 'account_banned'],
  },
  resolvedAt: Date,
  resolvedBy: mongoose.Schema.Types.ObjectId, // admin
  resolutionNotes: String,

  // Appeal
  appealedBy: mongoose.Schema.Types.ObjectId, // seller contesting flag
  appealMessage: String,
  appealedAt: Date,
  appealResolved: Boolean,

  // Related flags
  relatedFlags: [mongoose.Schema.Types.ObjectId],
  pattern: String, // e.g., "same seller, multiple products, 3 flags in 7 days"

  // Notification tracking
  notifiedSeller: { type: Boolean, default: false },
  notifiedAt: Date,
  notificationResponse: String,

  // Auto-remediation
  autoRemediationApplied: Boolean,
  autoRemediationDetails: String, // e.g., "Price capped to market average"

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
fraudFlagSchema.index({ sellerId: 1, status: 1 });
fraudFlagSchema.index({ anomalyType: 1, riskScore: -1 });
fraudFlagSchema.index({ status: 1, createdAt: -1 });
fraudFlagSchema.index({ riskScore: -1 });

fraudFlagSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FraudFlag', fraudFlagSchema);
