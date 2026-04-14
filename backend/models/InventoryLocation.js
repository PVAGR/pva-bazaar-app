// backend/models/InventoryLocation.js - Track inventory across fulfillment centers
const mongoose = require('mongoose');

const inventoryLocationSchema = new mongoose.Schema({
  // References
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
    required: true,
    index: true,
  },
  fulfillmentCenterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FulfillmentCenter',
    required: true,
    index: true,
  },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

  // Inventory levels
  qtyOnHand: { type: Number, default: 0 },
  qtyReserved: { type: Number, default: 0 }, // holds from carts/pending orders
  qtyInTransit: { type: Number, default: 0 }, // from warehouse transfers
  qtyDamaged: { type: Number, default: 0 }, // unusable
  availableQty: { type: Number, default: 0 }, // qtyOnHand - qtyReserved

  // Bin location
  binLocation: String, // e.g., "A-12-C-5"
  aisle: String,
  shelf: String,
  bin: String,

  // Turnover rate
  lastReceivedAt: Date,
  lastShippedAt: Date,
  daysInventoryOutstanding: Number, // calculated

  // Physical attributes
  weight: Number, // kg
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: String, // cm
  },

  // Costs
  unitCost: Number, // cost per unit
  storageCostPerMonth: Number,

  // Cycle count & verification
  lastCountedAt: Date,
  nextCountAt: Date,
  countCycleFrequency: { type: Number, default: 30 }, // days
  countAccuracy: Number, // percentage

  // Status
  active: { type: Boolean, default: true },
  frozen: { type: Boolean, default: false }, // hold for quality issue

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
inventoryLocationSchema.index({ productId: 1, fulfillmentCenterId: 1 });
inventoryLocationSchema.index({ sellerId: 1, fulfillmentCenterId: 1 });

inventoryLocationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  this.availableQty = Math.max(0, this.qtyOnHand - this.qtyReserved);
  next();
});

module.exports = mongoose.model('InventoryLocation', inventoryLocationSchema);
