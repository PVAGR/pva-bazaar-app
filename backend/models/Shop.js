const mongoose = require('mongoose');

/**
 * Shop Model
 * Represents a seller's storefront/shop
 * Supports branding, policies, product listings
 */

const ShopSchema = new mongoose.Schema(
  {
    // Owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Shop Identity
    shopName: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: String,
    story: String, // Seller's origin story / mission statement

    // Branding
    bannerUrl: String, // Hero/banner image
    logoUrl: String, // Shop logo
    accentColor: { type: String, default: '#000000' }, // For theming
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },

    // Customization
    tags: [String], // e.g., ['handmade', 'organic', 'fair-trade']
    categories: [String], // Shop specialization (artisan, designer, seller, etc.)
    socialLinks: {
      instagram: String,
      twitter: String,
      tiktok: String,
      facebook: String,
      website: String,
      portfolio: String,
    },

    // Policies
    shippingPolicy: String,
    returnsPolicy: String,
    privacyPolicy: String,
    termsOfService: String,
    faqText: String,
    contactMessage: String, // How to contact seller

    // Payment Settings
    acceptedPaymentMethods: {
      stripe: { type: Boolean, default: true },
      crypto: { type: Boolean, default: false },
      paypal: { type: Boolean, default: false },
      bankTransfer: { type: Boolean, default: false },
    },
    currencyPreference: { type: String, default: 'USD' },

    // Shop Settings
    status: {
      type: String,
      enum: ['draft', 'live', 'paused', 'suspended'],
      default: 'draft',
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'members_only'],
      default: 'public',
    },

    // Analytics & Stats
    analytics: {
      totalViews: { type: Number, default: 0 },
      totalFollowers: { type: Number, default: 0 },
      totalProducts: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 }, // in cents
      avgRating: { type: Number, default: 5, min: 1, max: 5 },
      reviewCount: { type: Number, default: 0 },
    },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    launchedAt: Date, // When shop went live
    suspendedAt: Date,
    suspensionReason: String,
  },
  { timestamps: true },
);

// Indexes
ShopSchema.index({ userId: 1 });
ShopSchema.index({ slug: 1 });
ShopSchema.index({ status: 1 });
ShopSchema.index({ 'analytics.totalViews': -1 }); // For trending shops
ShopSchema.index({ 'analytics.avgRating': -1 }); // For top-rated
ShopSchema.index({ createdAt: -1 }); // For newest shops

module.exports = mongoose.model('Shop', ShopSchema);
