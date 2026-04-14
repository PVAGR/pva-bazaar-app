const mongoose = require('mongoose');

/**
 * PaymentSplit Model
 * Immutable audit log of payment splits (artist %, platform %, intermediary %)
 * Ensures all splits can be verified and reconciled
 */

const PaymentSplitSchema = new mongoose.Schema(
  {
    // Source transaction
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    stripePaymentIntentId: { type: String },
    cryptoTxHash: { type: String },

    // Source amount (in cents for fiat, wei for crypto)
    sourceAmount: { type: Number, required: true },
    sourceCurrency: { type: String, required: true }, // USD, KES, etc. or WEI
    sourceType: {
      type: String,
      enum: ['stripe_card', 'crypto', 'paypal'],
      required: true,
    },

    // Splits breakdown
    splits: [
      {
        recipientType: {
          type: String,
          enum: ['artist', 'platform', 'intermediary', 'pool'],
          required: true,
        },
        recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        recipientEmail: String,
        percentage: { type: Number, required: true }, // 0-100
        amountCents: { type: Number, required: true },
        destinationType: {
          type: String,
          enum: ['bank_account', 'wallet', 'platform_fund'],
          required: true,
        },
        destinationAddress: String, // bank account ID or wallet address
        transferStatus: {
          type: String,
          enum: ['pending', 'initiated', 'processing', 'completed', 'failed'],
          default: 'pending',
        },
        transferId: String, // bank transfer ID or tx hash
        transferedAt: Date,
        failureReason: String,
      },
    ],

    // Conversion details (if crypto involved)
    conversion: {
      fromToken: String, // USDC, ETH, etc.
      toFiat: String, // KES, USD, etc.
      rate: Number,
      rateProvider: String,
      rateTimestamp: Date,
    },

    // Status tracking
    status: {
      type: String,
      enum: ['draft', 'initiated', 'processing', 'completed', 'failed', 'reconciled'],
      default: 'draft',
    },
    completedAt: Date,

    // Auditing
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: mongoose.Schema.Types.Mixed,

    // Reconciliation
    reconciled: { type: Boolean, default: false },
    reconciledAt: Date,
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes for queries
PaymentSplitSchema.index({ orderId: 1 });
PaymentSplitSchema.index({ stripePaymentIntentId: 1 });
PaymentSplitSchema.index({ cryptoTxHash: 1 });
PaymentSplitSchema.index({ status: 1, createdAt: -1 });
PaymentSplitSchema.index({ 'splits.recipientId': 1, createdAt: -1 });
PaymentSplitSchema.index({ reconciled: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentSplit', PaymentSplitSchema);
