const mongoose = require('mongoose');

/**
 * SellerProfile Model
 * Enhanced seller information (links to User)
 * Extends user credentials with business details
 */

const SellerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      index: true,
    },

    // Business Info
    businessName: String,
    businessType: {
      type: String,
      enum: ['individual', 'family', 'cooperative', 'collective', 'organization', 'company'],
      default: 'individual',
    },
    taxId: String, // EIN, VAT, etc (encrypted separately in production)
    businessRegistrationNumber: String,

    // Artisan/Creator Info
    provenanceStory: String, // Origin story of their craft
    traditionsDescription: String, // Cultural/traditional significance
    yearsInBusiness: Number,
    specializations: [String], // e.g., ['weaving', 'natural-dye', 'sustainable']

    // Credentials & Verification
    certifications: [
      {
        name: String,
        issuer: String,
        issuedAt: Date,
        expiresAt: Date,
        certificateUrl: String,
      },
    ],
    portfolioUrls: [String], // Links to portfolio/social/website
    backgroundVerified: { type: Boolean, default: false },
    backgroundVerifiedAt: Date,
    backgroundVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin

    // Location & Shipping
    country: String,
    region: String,
    preferredShippingMethods: [String], // Standard, Express, International, etc.
    fulfillmentCenters: [
      {
        centerId: mongoose.Schema.Types.ObjectId,
        isDefault: Boolean,
      },
    ],

    // Stats
    totalSales: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }, // in cents
    averageRating: { type: Number, default: 5, min: 1, max: 5 },
    reviewCount: { type: Number, default: 0 },
    returnRate: { type: Number, default: 0 }, // 0-100 as percentage
    responseTime: { type: Number, default: 0 }, // in hours

    // Badges/Status
    badges: [
      {
        type: String,
        enum: [
          'verified',
          'top_seller',
          'eco_friendly',
          'fair_trade',
          'fast_shipper',
          'responsive',
        ],
      },
    ],
    onboardingComplete: { type: Boolean, default: false },
    onboardingCompletedAt: Date,

    // Preferences
    preferences: {
      language: { type: String, default: 'en' },
      timezone: String,
      communicationFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly',
      },
    },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Indexes
SellerProfileSchema.index({ userId: 1 });
SellerProfileSchema.index({ shopId: 1 });
SellerProfileSchema.index({ backgroundVerified: 1 });
SellerProfileSchema.index({ country: 1 });
SellerProfileSchema.index({ averageRating: -1 });
SellerProfileSchema.index({ totalSales: -1 });

module.exports = mongoose.model('SellerProfile', SellerProfileSchema);
