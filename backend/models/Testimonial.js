// backend/models/Testimonial.js - Seller testimonials and case studies
const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  // Testimonial context
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },

  // Author (may be anonymous)
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
  authorName: { type: String, required: true },
  authorEmail: String,
  authorCompany: String,
  authorTitle: String,
  authorAvatar: String,

  // Testimonial content
  title: String,
  text: { type: String, required: true },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5,
  },

  // Verification
  verified: { type: Boolean, default: false },
  verificationMethod: {
    type: String,
    enum: ['purchase_history', 'email_verification', 'manual_review'],
  },
  verifiedAt: Date,

  // Related purchase (for verified testimonials)
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType' },
  purchaseDate: Date,

  // Display settings
  featured: { type: Boolean, default: false },
  pinnedOrder: Number, // For ordering on shop page
  displayOrder: Number,

  // Metrics
  views: { type: Number, default: 0 },
  helpful: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },

  // Media
  photos: [String],
  videos: [String],

  // Tags for categorization
  tags: [String], // e.g., "quality", "communication", "delivery", "value"
  category: {
    type: String,
    enum: ['general', 'product_quality', 'customer_service', 'shipping', 'value_for_money', 'craftsmanship'],
    default: 'general',
  },

  // Case study (extended testimonial)
  isCaseStudy: { type: Boolean, default: false },
  caseStudyDetails: {
    background: String,
    challenge: String,
    solution: String,
    result: String,
    impact: String,
  },

  // Context/request
  requestId: mongoose.Schema.Types.ObjectId,
  requestMessage: String, // What seller asked for

  // Moderation & approval
  approved: { type: Boolean, default: true },
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvedAt: Date,
  flagged: { type: Boolean, default: false },
  flagReason: String,
  flaggedAt: Date,

  // Seller response to testimonial
  sellerResponse: {
    message: String,
    respondedAt: Date,
  },

  // Publish settings
  published: { type: Boolean, default: false },
  publishedAt: Date,
  consentGiven: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
testimonialSchema.index({ sellerId: 1, featured: 1 });
testimonialSchema.index({ shopId: 1, published: 1 });
testimonialSchema.index({ verified: 1, published: 1 });
testimonialSchema.index({ authorId: 1 });

// Auto-update updatedAt
testimonialSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Testimonial', testimonialSchema);
