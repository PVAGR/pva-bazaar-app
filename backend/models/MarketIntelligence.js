// backend/models/MarketIntelligence.js - Daily admin market health reports
const mongoose = require('mongoose');

const marketIntelligenceSchema = new mongoose.Schema({
  // Report identity
  reportDate: { type: Date, default: Date.now, index: true },
  reportPeriod: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily',
  },

  // Global market snapshot
  totalListings: Number,
  newListingsToday: Number,
  totalSoldToday: Number,
  activeSellerCount: Number,
  newSellerCount: Number,

  // Pricing health
  priceIndex: Number, // 100 = baseline
  priceIndexChange: Number, // percentage vs yesterday
  avgProductPrice: Number,
  medianProductPrice: Number,
  priceVolatility: Number, // std dev

  // Volume metrics
  totalTransactionValue: Number, // cents
  averageTransactionValue: Number,
  transactionCount: Number,
  avgItemsPerTransaction: Number,

  // Conversion & engagement
  conversionRate: Number, // percentage
  avgTimeToSell: Number, // days
  avgTimeToFirstView: Number, // hours
  cartAbandonmentRate: Number,
  searchToListingClickRate: Number,

  // Category performance
  topCategories: [
    {
      category: String,
      listingCount: Number,
      salesCount: Number,
      avgPrice: Number,
      priceChange: Number,
      trend: String,
    },
  ],

  // Regional performance
  topRegions: [
    {
      region: String,
      listingCount: Number,
      salesCount: Number,
      totalValue: Number,
    },
  ],

  // Seller insights
  sellerMetrics: {
    avgListingsPerSeller: Number,
    avgSalesPerSeller: Number,
    newSellerSuccessRate: Number, // % of new sellers who make first sale
    topSellerCount: Number, // sellers with 10+ sales
    suspiciousSellerCount: Number,
  },

  // Buyer insights
  buyerMetrics: {
    totalActiveBuyers: Number,
    newBuyerCount: Number,
    repeatBuyerRate: Number, // percentage
    avgSpendPerBuyer: Number,
    avgItemsPerBuyer: Number,
  },

  // Risk & fraud monitoring
  fraudMetrics: {
    flagsRaisedToday: Number,
    confirmedFraudCount: Number,
    chargebacksToday: Number,
    chargebackRate: Number, // percentage of transactions
    suspiciousPriceCount: Number,
    listedCountdown: Number, // listings with suspicious activity
  },

  // Technology & performance
  systemMetrics: {
    apiResponseTime: Number, // ms
    pageLoadTime: Number,
    errorRate: Number, // percentage
    downtime: Number, // minutes
  },

  // Sentiment & feedback
  customerSentiment: {
    positiveReviewPercent: Number,
    negativeReviewPercent: Number,
    avgRating: Number,
    reviewCount: Number,
    topComplaints: [String],
  },

  // Alerts & anomalies
  alerts: [
    {
      priority: String, // critical, high, medium, low
      type: String, // e.g., "price_spike", "fraud_cluster", "system_issue"
      description: String,
      affectedCount: Number,
    },
  ],

  // Recommendations for admins
  recommendations: [
    {
      type: String, // action type
      target: String, // what/who to target
      reason: String,
      urgency: String,
    },
  ],

  // Financial summary
  revenue: {
    platformFees: Number,
    transactionFees: Number,
    total: Number,
  },
  costs: {
    payouts: Number,
    infrastructure: Number,
    support: Number,
  },

  // Status
  completedAt: Date,
  generatedBy: mongoose.Schema.Types.ObjectId, // system or admin

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
marketIntelligenceSchema.index({ reportDate: -1 });
marketIntelligenceSchema.index({ reportPeriod: 1, reportDate: -1 });

marketIntelligenceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MarketIntelligence', marketIntelligenceSchema);
