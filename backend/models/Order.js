const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.Mixed, required: true },
    itemSnapshot: {
      name: String,
      slug: String,
      priceCents: Number,
      currency: String,
      media0: String,
    },
    stripeSessionId: { type: String, unique: true, required: true },
    stripePaymentIntentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    refundStatus: {
      type: String,
      enum: ["none", "pending", "refunded", "failed"],
      default: "none",
    },
    stripeRefundId: { type: String },
    refundAmountCents: { type: Number },
    refundedAt: { type: Date },
    amountTotal: Number,
    currency: String,
    customerEmail: String,
    customerName: String,
    shipping: Object,
    fulfillmentStatus: {
      type: String,
      enum: ["unfulfilled", "processing", "shipped", "delivered"],
      default: "unfulfilled",
    },
    adminNotes: { type: String, default: "" },
    trackingNumber: { type: String },
    carrier: { type: String },
    fulfilledAt: { type: Date },
    reservationId: { type: String },
    downloadGrantedAt: { type: Date },
    downloadToken: { type: String },
    certificateId: { type: String },
    // Attribution & influence economy tracking
    attribution: {
      // UTM parameters from referral link
      utm_source: { type: String, default: null },      // creator handle or platform
      utm_medium: { type: String, default: 'referral' }, // referral, email, social, etc
      utm_campaign: { type: String, default: null },    // campaign name
      utm_content: { type: String, default: null },     // variant name for A/B tests
      // Creator attribution
      creatorHandle: { type: String, default: null, index: true },
      creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      referralCode: { type: String, default: null, index: true },
      // Commission variables
      commissionRate: { type: Number, default: 0 },     // e.g., 0.10 for 10%
      commissionAmountCents: { type: Number, default: 0 },
      // Metadata
      attributionSource: { type: String, default: 'direct' }, // direct, utm, referral_code, affiliate
      attributedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

// Indexes for attribution reporting
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'attribution.creatorHandle': 1, createdAt: -1 });
OrderSchema.index({ 'attribution.creatorId': 1, createdAt: -1 });
OrderSchema.index({ 'attribution.referralCode': 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
