// backend/models/SellerAnalytics.js - Seller performance metrics
const mongoose = require('mongoose');

const sellerAnalyticsSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', unique: true, sparse: true },

  // Time period reporting
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'monthly',
  },

  // Visitor & engagement metrics
  totalVisitors: { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  pageViews: { type: Number, default: 0 },
  returning: { type: Number, default: 0 }, // Returning visitors

  // Product engagement
  productViews: { type: Number, default: 0 },
  productClicks: { type: Number, default: 0 },
  avgTimeOnProductPage: { type: Number, default: 0 }, // seconds

  // Checkout funnel
  cartCreated: { type: Number, default: 0 },
  checkoutStarted: { type: Number, default: 0 },
  completedOrders: { type: Number, default: 0 },

  // Conversion metrics
  conversionRate: { type: Number, default: 0 }, // percentage
  cartAbandonment: { type: Number, default: 0 }, // percentage
  avgOrderValue: { type: Number, default: 0 }, // cents
  repeatCustomerRate: { type: Number, default: 0 }, // percentage

  // Revenue metrics
  totalRevenue: { type: Number, default: 0 }, // cents
  totalCommission: { type: Number, default: 0 }, // cents
  netEarnings: { type: Number, default: 0 }, // cents
  refunds: { type: Number, default: 0 }, // cents
  chargebacks: { type: Number, default: 0 }, // cents

  // Customer metrics
  newCustomers: { type: Number, default: 0 },
  customerRetention: { type: Number, default: 0 }, // percentage
  customerLifetimeValue: { type: Number, default: 0 }, // cents
  avgCustomerSpend: { type: Number, default: 0 }, // cents

  // Marketing metrics
  customerAcquisitionCost: { type: Number, default: 0 }, // cents
  marketingSpend: { type: Number, default: 0 }, // cents
  roi: { type: Number, default: 0 }, // percentage

  // Traffic sources
  trafficSources: {
    direct: { type: Number, default: 0 },
    organic: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    referral: { type: Number, default: 0 },
    social: { type: Number, default: 0 },
    email: { type: Number, default: 0 },
  },

  // Device breakdown
  deviceBreakdown: {
    mobile: { type: Number, default: 0 },
    desktop: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 },
  },

  // Geographic breakdown
  topCountries: [
    {
      country: String,
      visitors: Number,
      orders: Number,
      revenue: Number,
    },
  ],

  // Top performing products
  topProducts: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      productName: String,
      views: Number,
      sales: Number,
      revenue: Number,
      rating: Number,
    },
  ],

  // Ratings & reviews
  avgRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  positiveReviews: { type: Number, default: 0 }, // 4-5 stars
  negativeReviews: { type: Number, default: 0 }, // 1-2 stars
  sentimentScore: { type: Number, default: 0 }, // -1 to 1

  // Response metrics
  avgResponseTime: { type: Number, default: 0 }, // hours
  customerSatisfaction: { type: Number, default: 0 }, // percentage
  returnRate: { type: Number, default: 0 }, // percentage
  disputeRate: { type: Number, default: 0 }, // percentage

  // Trend comparisons
  vsLastPeriodMetrics: {
    revenueChange: { type: Number, default: 0 }, // percentage
    ordersChange: { type: Number, default: 0 }, // percentage
    conversionChange: { type: Number, default: 0 }, // percentage
  },

  // Time range for this report
  dateRange: {
    startDate: Date,
    endDate: Date,
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
sellerAnalyticsSchema.index({ sellerId: 1, createdAt: -1 });
sellerAnalyticsSchema.index({ dateRange: 1 });

// Auto-update updatedAt
sellerAnalyticsSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SellerAnalytics', sellerAnalyticsSchema);
