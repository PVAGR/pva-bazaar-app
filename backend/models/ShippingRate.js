// backend/models/ShippingRate.js - Dynamic shipping rates by location, weight, carrier
const mongoose = require('mongoose');

const shippingRateSchema = new mongoose.Schema({
  // Route
  originCountry: { type: String, required: true, index: true },
  originRegion: String,
  destinationCountry: { type: String, required: true, index: true },
  destinationRegion: String,

  // Carrier
  carrier: {
    type: String,
    enum: ['dhl', 'fedex', 'ups', 'usps', 'local', 'partner'],
    required: true,
    index: true,
  },

  // Shipping method
  shippingMethod: {
    type: String,
    enum: ['standard', 'express', 'overnight', 'local'],
    required: true,
  },

  // Weight brackets (tiered pricing)
  weightMin: { type: Number, required: true }, // kg
  weightMax: { type: Number, required: true },

  // Pricing
  baseCost: Number, // cents, fixed cost
  perKgCost: Number, // variable cost per kg
  insuranceCost: Number, // per $100 value
  handlingFee: Number,
  totalCost: Number, // calculated: baseCost + (weight * perKgCost) + handling

  // Estimated delivery
  estimatedDaysMin: Number,
  estimatedDaysMax: Number,

  // Availability
  available: { type: Boolean, default: true },
  minOrderValue: Number, // cents (e.g., free shipping over $50)

  // Restrictions
  restrictedItems: [String], // e.g., ['hazardous', 'fragile']
  maxDimensions: {
    length: Number,
    width: Number,
    height: Number,
  },

  // Discount tiers
  discountTiers: [
    {
      minWeight: Number,
      maxWeight: Number,
      discountPercent: Number,
    },
  ],

  // Surcharges
  surcharges: [
    {
      condition: String, // e.g., 'remote_area', 'island', 'rural'
      percentage: Number,
    },
  ],

  // Last mile options
  lastMileOptions: {
    pickupPoints: Boolean,
    saturdayDelivery: Boolean,
    signatureRequired: Boolean,
    cashOnDelivery: Boolean,
  },

  // Data
  lastUpdatedAt: Date,
  nextUpdateAt: Date,
  updateFrequency: Number, // days

  // Performance
  deliveryAccuracy: Number, // % on-time
  damageRate: Number, // %
  lostRate: Number, // %

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
shippingRateSchema.index({
  originCountry: 1,
  destinationCountry: 1,
  carrier: 1,
  shippingMethod: 1,
});
shippingRateSchema.index({ available: 1 });

shippingRateSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  // Calculate total cost if components changed
  if (this.baseCost !== undefined) {
    this.totalCost = this.baseCost + (this.handlingFee || 0);
  }
  next();
});

module.exports = mongoose.model('ShippingRate', shippingRateSchema);
