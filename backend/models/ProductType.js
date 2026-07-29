// backend/models/ProductType.js - Multi-product type model with discriminator
const mongoose = require('mongoose');

const productTypeSchema = new mongoose.Schema({
  // Basic info
  name: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  salePrice: { type: Number },
  imageUrls: [{ type: String }],

  // Product type discriminator
  productType: {
    type: String,
    enum: ['physical_good', 'digital_download', 'course', 'expertise', 'nft', 'service'],
    required: true,
    index: true,
  },

  // Creator/seller info
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },

  // Common fields
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true,
  },
  tags: [String],
  category: String,

  // Inventory for physical goods
  stockQty: { type: Number, default: 0 },
  reservedQty: { type: Number, default: 0 },
  soldQty: { type: Number, default: 0 },
  isUnlimited: { type: Boolean, default: false },

  // Digital product specific
  digital: {
    deliveryMethod: {
      type: String,
      enum: ['instant', 'email', 'custom'],
      default: 'instant',
    },
    fileSize: Number, // bytes
    downloadLimit: Number, // max downloads, null = unlimited
    expiresAt: Date, // when downloads expire
    accessControl: {
      type: String,
      enum: ['one_time', 'subscription', 'limited_views'],
      default: 'one_time',
    },
  },

  // Course specific
  course: {
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    moduleCount: Number,
    totalDuration: Number, // minutes
    certificateTemplate: String, // URL to template
    enrollmentCap: Number,
  },

  // Expertise/service specific
  expertise: {
    hourlyRate: Number,
    minBookingHours: { type: Number, default: 1 },
    availability: {
      timezone: String,
      workingHours: {
        monday: { start: { type: String }, end: { type: String }, available: { type: Boolean } },
        tuesday: { start: { type: String }, end: { type: String }, available: { type: Boolean } },
        wednesday: { start: { type: String }, end: { type: String }, available: { type: Boolean } },
        thursday: { start: { type: String }, end: { type: String }, available: { type: Boolean } },
        friday: { start: { type: String }, end: { type: String }, available: { type: Boolean } },
        saturday: { start: { type: String }, end: { type: String }, available: { type: Boolean } },
        sunday: { start: { type: String }, end: { type: String }, available: { type: Boolean } },
      },
    },
  },

  // NFT specific
  nft: {
    chainId: Number,
    contractAddress: String,
    tokenId: String,
    tokenStandard: {
      type: String,
      enum: ['ERC-721', 'ERC-1155'],
      default: 'ERC-721',
    },
  },

  // Analytics
  analytics: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    cartAdds: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },

  // Payment and split info
  paymentSplit: {
    creatorSplit: { type: Number, default: 70 },
    platformSplit: { type: Number, default: 20 },
    partnerSplit: { type: Number, default: 10 },
  },

  metadata: mongoose.Schema.Types.Mixed,

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
productTypeSchema.index({ createdBy: 1, status: 1 });
productTypeSchema.index({ shopId: 1, status: 1 });
productTypeSchema.index({ productType: 1, status: 1 });
productTypeSchema.index({ tags: 1 });
productTypeSchema.index({ category: 1 });

// Auto-update updatedAt on changes
productTypeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ProductType', productTypeSchema);
