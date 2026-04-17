const mongoose = require('mongoose');

const RoyaltyEventSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    creator_address: { type: String, required: true, index: true },
    sale_timestamp: { type: Date, default: Date.now, index: true },
    sale_type: {
      type: String,
      enum: ['PRIMARY', 'SECONDARY'],
      default: 'SECONDARY',
      index: true,
    },
    platform: { type: String, default: 'PVA_MARKET', index: true },
    sale_price: { type: Number, required: true, min: 0 },
    royalty_amount: { type: Number, required: true, min: 0 },
    creator_earning_amount: { type: Number, required: true, min: 0 },
    tx_hash: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    source: { type: String, default: 'dashboard-record' },
  },
  { timestamps: true }
);

RoyaltyEventSchema.index({ ownerUserId: 1, sale_timestamp: -1 });
RoyaltyEventSchema.index({ creator_address: 1, sale_timestamp: -1 });

module.exports = mongoose.model('RoyaltyEvent', RoyaltyEventSchema);
