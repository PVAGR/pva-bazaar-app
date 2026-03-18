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
  },
  { timestamps: true }
);

OrderSchema.index({ stripeSessionId: 1 }, { unique: true });
OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
