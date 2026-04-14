// backend/models/ShipmentTracking.js - Real-time shipment tracking with carrier integration
const mongoose = require('mongoose');

const shipmentTrackingSchema = new mongoose.Schema({
  // References
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  },
  fulfillmentCenterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FulfillmentCenter',
    required: true,
  },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Carrier info
  carrier: {
    type: String,
    enum: ['dhl', 'fedex', 'ups', 'usps', 'local', 'partner'],
    required: true,
  },
  trackingNumber: { type: String, required: true, index: true },
  carrierTrackingUrl: String,

  // Package details
  packageWeight: Number, // kg
  packageDimensions: {
    length: Number,
    width: Number,
    height: Number,
  },
  itemCount: Number,
  shippingMethod: {
    type: String,
    enum: ['standard', 'express', 'overnight', 'local'],
  },

  // Destination
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    phone: String,
  },

  // Status
  status: {
    type: String,
    enum: [
      'label_created',
      'picked',
      'packed',
      'shipped',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'delivery_attempted',
      'exception',
      'returned',
      'lost',
    ],
    default: 'label_created',
    index: true,
  },

  // Timeline
  pickedAt: Date,
  packedAt: Date,
  shippedAt: Date,
  estimatedDelivery: Date,
  actualDelivery: Date,

  // Tracking events from carrier
  events: [
    {
      timestamp: Date,
      status: String,
      location: {
        city: String,
        country: String,
      },
      message: String,
      signature: String, // proof of delivery
    },
  ],

  // Delivery proof
  proofOfDelivery: String, // URL to image/signature
  deliveredBy: String, // carrier name
  recipientSignature: String,

  // Cost
  shippingCost: Number, // cents
  insuranceValue: Number,
  codAmount: Number, // cash on delivery

  // Issues & exceptions
  exception: Boolean,
  exceptionType: String, // delivery_delayed, lost_package, damaged, etc.
  exceptionDetails: String,
  exceptionReportedAt: Date,
  resolvedAt: Date,
  resolution: String,

  // Return shipping
  returnTracking: String,
  returnReason: String,
  returnStatus: String,
  returnedAt: Date,

  // Notifications
  deliveryNotificationSent: Boolean,
  deliveryNotificationSentAt: Date,
  exceptionNotificationSent: Boolean,

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
shipmentTrackingSchema.index({ trackingNumber: 1 });
shipmentTrackingSchema.index({ orderId: 1 });
shipmentTrackingSchema.index({ status: 1, createdAt: -1 });

shipmentTrackingSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ShipmentTracking', shipmentTrackingSchema);
