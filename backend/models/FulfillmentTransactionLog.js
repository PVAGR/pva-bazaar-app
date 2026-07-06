/**
 * Immutable audit log for every fulfillment-related action (payment success, download grant, physical row, email).
 * Why: No hidden traps — every transaction is logged for future audit (Persistent Consistency).
 */
const mongoose = require('mongoose');

const fulfillmentTransactionLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, index: true },
    orderId: { type: String, index: true },
    action: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    success: { type: Boolean, default: true },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

fulfillmentTransactionLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FulfillmentTransactionLog', fulfillmentTransactionLogSchema);
