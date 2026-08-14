const mongoose = require('mongoose');

/**
 * ReferralCode
 * Persists one referral code per person (keyed by email) so the referral
 * program never depends on browser memory. The code is delivered to the owner
 * by email, and each paid order attributed to it automatically accrues a
 * commission kickback on this record (plus a Payout row for admin settlement).
 */
const referralCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  name: { type: String, trim: true, default: '' },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  commissionRate: { type: Number, default: 0.1 },

  // Lifetime + pending earnings (in minor currency units, e.g. cents)
  sales: { type: Number, default: 0 },
  totalCommissionsCents: { type: Number, default: 0 },
  pendingCents: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  lastClickedAt: { type: Date },
  pendingOrders: [
    {
      orderId: { type: String },
      itemName: { type: String, default: '' },
      totalCents: { type: Number, default: 0 },
      commissionCents: { type: Number, default: 0 },
      currency: { type: String, default: 'usd' },
      settledAt: { type: Date, default: Date.now },
    },
  ],

  // Email delivery bookkeeping
  emailsSent: { type: Number, default: 0 },
  lastEmailedAt: { type: Date },
  joinedAt: { type: Date, default: Date.now },
});

// One active code per email address (duplicates simply return the existing code).
referralCodeSchema.index({ email: 1 }, { unique: true });

referralCodeSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    code: this.code,
    name: this.name,
    email: this.email,
    commissionRate: this.commissionRate,
    sales: this.sales,
    totalCommissionsCents: this.totalCommissionsCents,
    pendingCents: this.pendingCents,
    clicks: this.clicks,
    joinedAt: this.joinedAt,
    status: this.status,
  };
};

module.exports = mongoose.model('ReferralCode', referralCodeSchema);