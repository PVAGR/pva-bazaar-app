// backend/models/MarketData.js - Real-time market information for pricing intelligence
const mongoose = require('mongoose');

const marketDataSchema = new mongoose.Schema({
  // Market segment identifier
  category: { type: String, required: true, index: true },
  subcategory: String,
  productType: {
    type: String,
    enum: ['physical_good', 'digital_download', 'course', 'expertise', 'nft', 'service'],
    index: true,
  },

  // Geographic/material matching
  material: [String], // e.g., ['gold', 'diamond', 'platinum']
  craftType: [String], // e.g., ['handmade', 'jewelry', 'vintage']
  origin: String, // country
  region: String,

  // Market pricing statistics (last 30 days)
  sampleSize: { type: Number, default: 0 }, // number of recent sales
  avgPrice: { type: Number, default: 0 },
  medianPrice: { type: Number, default: 0 },
  minPrice: { type: Number, default: 0 },
  maxPrice: { type: Number, default: 0 },
  stdDev: { type: Number, default: 0 }, // standard deviation

  // Price distribution
  pricePercentiles: {
    p10: Number,
    p25: Number,
    p50: Number, // median
    p75: Number,
    p90: Number,
  },

  // Demand metrics
  totalListings: Number,
  totalSold: Number,
  avgDaysToSell: Number,
  conversionRate: Number, // percentage of listings that sold
  demandTrend: {
    type: String,
    enum: ['rising', 'stable', 'falling'],
    default: 'stable',
  },
  demandChangePercent: Number, // vs last period

  // Supply insights
  newListingsPerDay: Number,
  inventoryTurn: Number, // ratio
  sellerCount: Number, // unique sellers

  // Seasonality
  seasonalMultiplier: { type: Number, default: 1.0 }, // e.g., 1.2 for holiday season
  season: {
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter'],
  },

  // Premium factors
  premiumFactors: [
    {
      name: String, // e.g., "certified", "limited_edition", "designer"
      priceMultiplier: Number, // e.g., 1.5
      frequency: Number, // how often this factor appears
    },
  ],

  // Discount insights
  discountMetrics: {
    avgDiscount: Number, // percentage
    maxDiscount: Number,
    discountedListingPercent: Number, // % of listings with discount
  },

  // Geographic pricing variance
  priceByRegion: [
    {
      region: String,
      avgPrice: Number,
      count: Number,
    },
  ],

  // Currency conversion
  currency: { type: String, default: 'USD' },
  exchangeRates: {
    type: Map,
    of: Number, // e.g., EUR: 0.92, GBP: 0.79
  },

  // Fraud/anomaly detection
  suspiciousPrices: Number, // count of flagged listings
  priceAnomalies: [
    {
      description: String,
      count: Number,
      threshold: Number,
    },
  ],

  // Data quality
  dataQuality: {
    type: Number,
    min: 0,
    max: 100,
  }, // confidence score

  // Last updated
  lastUpdatedAt: { type: Date, default: Date.now },
  nextUpdateAt: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
marketDataSchema.index({ category: 1, productType: 1 });
marketDataSchema.index({ material: 1 });
marketDataSchema.index({ origin: 1, region: 1 });
marketDataSchema.index({ lastUpdatedAt: -1 });

marketDataSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MarketData', marketDataSchema);
