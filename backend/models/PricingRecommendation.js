// backend/models/PricingRecommendation.js - AI pricing suggestions for sellers
const mongoose = require('mongoose');

const pricingRecommendationSchema = new mongoose.Schema({
  // Product reference
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
    required: true,
    index: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Seller's inputs
  initialPrice: Number, // What seller entered
  costBasis: Number, // What seller paid
  desiredMargin: Number, // percentage

  // Market analysis inputs
  category: String,
  material: [String],
  condition: String, // new, like_new, good, fair, poor
  urgency: String,
  targetMarketSize: String, // local, regional, global

  // Recommendation details
  recommendedPrice: { type: Number, required: true },
  minPrice: Number,
  maxPrice: Number,
  priceRange: String, // e.g., "competitive", "premium", "value"

  // Reasoning
  rationale: {
    marketAvg: Number,
    competitorComparison: String, // "below", "at", "above"
    demandLevel: String, // "high", "medium", "low"
    seasonalAdjustment: Number,
    urgencyAdjustment: Number,
    profitMarginResult: Number, // what margin they'll get
  },

  // Alternative suggestions
  alternatives: [
    {
      price: Number,
      strategy: String, // e.g., "aggressive_sales", "premium_positioning"
      expectedDaysToSell: Number,
      expectedProfitMargin: Number,
    },
  ],

  // Guidance text
  sellerGuidance: String, // Human-readable explanation
  warnings: [String], // e.g., "Price is 40% above market average"
  opportunities: [String], // e.g., "Add certification photo to justify premium"

  // Acceptance & feedback
  accepted: { type: Boolean, default: false },
  acceptedPrice: Number,
  acceptedAt: Date,
  feedback: String, // Why they rejected or modified

  // Performance tracking
  actualListingPrice: Number,
  sold: { type: Boolean, default: false },
  salePrice: Number,
  daysToSell: Number,
  performanceScore: Number, // how well recommendation worked (0-100)

  // Evaluation
  recommendationAccuracy: Number, // percentage match between recommended and sale price
  profitabilityMet: Boolean,
  timelineMet: Boolean,

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
pricingRecommendationSchema.index({ sellerId: 1, createdAt: -1 });
pricingRecommendationSchema.index({ productId: 1 });
pricingRecommendationSchema.index({ accepted: 1 });
pricingRecommendationSchema.index({ sold: 1 });

pricingRecommendationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PricingRecommendation', pricingRecommendationSchema);
