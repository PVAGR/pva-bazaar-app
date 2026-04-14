// backend/models/PricingHistory.js - Track historical prices for market analysis
const mongoose = require('mongoose');

const pricingHistorySchema = new mongoose.Schema({
  // Product reference
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
    required: true,
    index: true,
  },
  productType: {
    type: String,
    enum: ['physical_good', 'digital_download', 'course', 'expertise', 'nft', 'service'],
    required: true,
    index: true,
  },

  // Seller info
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },

  // Price data
  originalPrice: Number, // Price paid by seller (if applicable)
  listingPrice: Number, // Price seller lists at
  salePrice: Number, // Actual sale price
  currency: { type: String, default: 'USD' },

  // Market context at time of listing
  marketAvgPrice: Number, // Average market price at time
  marketMinPrice: Number,
  marketMaxPrice: Number,
  pricePercentile: Number, // Where this price falls in market (0-100)

  // Flags & context
  urgency: {
    type: String,
    enum: ['normal', 'urgent', 'clearance', 'exclusive', 'limited_time'],
    default: 'normal',
  },
  discount: { type: Number, default: 0 }, // percentage
  priceModifiers: [
    {
      reason: String, // e.g., "bulk_discount", "seasonal", "new_seller"
      adjustment: Number, // cents
    },
  ],

  // Outcome
  status: {
    type: String,
    enum: ['listed', 'sold', 'delisted', 'expired'],
    default: 'listed',
  },
  soldAt: Date,
  daysToSell: Number, // calculated
  conversionRate: Number, // clicks to sales

  // Analysis
  priceAccuracy: Number, // 0-100 (how well seller priced vs market)
  profitMargin: Number, // percentage
  suspiciousFlag: Boolean, // AI-detected anomaly
  suspiciousReason: String,

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
pricingHistorySchema.index({ productId: 1, createdAt: -1 });
pricingHistorySchema.index({ sellerId: 1, createdAt: -1 });
pricingHistorySchema.index({ productType: 1, createdAt: -1 });
pricingHistorySchema.index({ status: 1, createdAt: -1 });
pricingHistorySchema.index({ suspiciousFlag: 1 });

pricingHistorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  // Calculate days to sell if sold
  if (this.status === 'sold' && this.soldAt && this.createdAt) {
    this.daysToSell = Math.round((this.soldAt - this.createdAt) / (1000 * 60 * 60 * 24));
  }
  next();
});

module.exports = mongoose.model('PricingHistory', pricingHistorySchema);
