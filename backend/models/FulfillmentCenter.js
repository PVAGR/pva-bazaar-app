// backend/models/FulfillmentCenter.js - Warehouse locations for global fulfillment
const mongoose = require('mongoose');

const fulfillmentCenterSchema = new mongoose.Schema({
  // Center identity
  name: { type: String, required: true },
  code: { type: String, unique: true, required: true, index: true },
  type: {
    type: String,
    enum: ['warehouse', 'distribution_center', 'local_pickup', 'partner_location'],
    default: 'warehouse',
  },

  // Location
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, required: true, index: true },
  },
  coordinates: {
    type: { type: String, default: 'Point' },
    coordinates: [Number], // [longitude, latitude]
  },
  timezone: String,

  // Capacity
  capacity: {
    totalSquareFeet: Number,
    currentUtilization: { type: Number, default: 0 }, // percentage
    maxSKUs: Number,
    currentSKUCount: { type: Number, default: 0 },
  },

  // Operational hours
  operatingHours: {
    monday: { open: String, close: String, operational: Boolean },
    tuesday: { open: String, close: String, operational: Boolean },
    wednesday: { open: String, close: String, operational: Boolean },
    thursday: { open: String, close: String, operational: Boolean },
    friday: { open: String, close: String, operational: Boolean },
    saturday: { open: String, close: String, operational: Boolean },
    sunday: { open: String, close: String, operational: Boolean },
  },

  // Fulfillment capabilities
  processingSpeeds: {
    pickingTime: Number, // hours
    packingTime: Number,
    maxItemsPerOrder: Number,
  },
  supportedShippingCarriers: [String], // e.g., ['DHL', 'FedEx', 'UPS', 'Local']
  shippingMethods: [String], // e.g., ['standard', 'express', 'overnight']

  // Returns
  acceptsReturns: { type: Boolean, default: true },
  returnsProcessingTime: Number, // hours

  // Contact
  contactName: String,
  contactEmail: String,
  contactPhone: String,
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Performance metrics
  metrics: {
    ordersProcessedThisMonth: { type: Number, default: 0 },
    averagePickTime: Number,
    averagePackTime: Number,
    orderAccuracy: Number, // percentage
    returnRate: Number,
    customerSatisfaction: Number,
  },

  // Status
  active: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  maintenanceUntil: Date,

  // Cost
  costPerOrder: Number,
  costPerPound: Number,
  minimumMonthlyFee: Number,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Geospatial index for nearby lookups
fulfillmentCenterSchema.index({ 'coordinates': '2dsphere' });
fulfillmentCenterSchema.index({ country: 1, active: 1 });

fulfillmentCenterSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FulfillmentCenter', fulfillmentCenterSchema);
