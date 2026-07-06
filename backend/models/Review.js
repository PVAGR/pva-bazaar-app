// backend/models/Review.js - Product/seller reviews with verification
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Reference to product/seller being reviewed
  reviewType: {
    type: String,
    enum: ['product', 'seller'],
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
    sparse: true,
    index: true,
  },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true, index: true },

  // Reviewer info
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Order verification
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  verifiedPurchase: { type: Boolean, default: false },

  // Rating and comment
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: String,
  comment: { type: String, required: true },

  // Aspects (for detailed feedback)
  aspects: [
    {
      aspect: String, // e.g., "Quality", "Communication", "Shipping"
      rating: Number,
    },
  ],

  // Media
  photos: [String], // URLs
  videos: [String], // URLs

  // Engagement metrics
  helpful: { type: Number, default: 0 },
  unhelpful: { type: Number, default: 0 },
  helperIds: [mongoose.Schema.Types.ObjectId], // Users who marked helpful
  helperCounts: {
    helpful: { type: Map, of: Number, default: new Map() },
    unhelpful: { type: Map, of: Number, default: new Map() },
  },

  // Seller response
  sellerResponse: {
    comment: String,
    respondedAt: Date,
  },

  // Moderation
  flagged: { type: Boolean, default: false },
  flagReason: String,
  flaggedBy: mongoose.Schema.Types.ObjectId,
  flaggedAt: Date,
  blurredForModeration: { type: Boolean, default: false },

  // Status
  published: { type: Boolean, default: true },
  verified: { type: Boolean, default: false },
  verifiedAt: Date,

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
reviewSchema.index({ productId: 1, rating: 1 });
reviewSchema.index({ sellerId: 1, rating: 1 });
reviewSchema.index({ reviewerId: 1, createdAt: -1 });
reviewSchema.index({ verifiedPurchase: 1, published: 1 });

// Auto-update updatedAt
reviewSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Review', reviewSchema);
