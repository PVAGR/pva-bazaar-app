/**
 * Rows for physical disc burn / fulfillment. One per paid order that needs a disc.
 * Why: Persistent consistency — every payment that requires a disc gets a row for manual/automated burn.
 */
const mongoose = require('mongoose');

const physicalFulfillmentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    itemId: { type: String, required: true, index: true },
    itemName: { type: String },
    customerEmail: { type: String },
    customerName: { type: String },
    status: {
      type: String,
      enum: ['pending', 'burn_queued', 'burned', 'shipped', 'delivered'],
      default: 'pending',
    },
    notes: { type: String },
    burnedAt: { type: Date },
    shippedAt: { type: Date },
    trackingNumber: { type: String },
  },
  { timestamps: true }
);

physicalFulfillmentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PhysicalFulfillment', physicalFulfillmentSchema);
