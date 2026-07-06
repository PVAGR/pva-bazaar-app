const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema(
  {
    // Payout batch metadata
    batchId: { type: String, unique: true, required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'ready', 'processing', 'completed', 'failed'],
      default: 'draft',
      index: true,
    },
    payoutPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },

    // Creator details
    creatorHandle: { type: String, required: true, index: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    creatorEmail: { type: String, default: '' },

    // Financial details
    totalCommissionsCents: { type: Number, required: true, default: 0 }, // Total owed
    deductionsCents: { type: Number, default: 0 }, // Fees, refunds, adjustments
    netPayoutCents: { type: Number, required: true, default: 0 }, // Amount to pay after deductions
    currency: { type: String, default: 'USD' },

    // Payment method & details
    paymentMethod: {
      type: String,
      enum: ['stripe', 'bank_transfer', 'paypal', 'crypto', 'credit'],
      default: 'stripe',
    },
    paymentDestination: {
      // Varies by method: Stripe account ID, bank account hash, PayPal email, wallet address, etc.
      type: String,
      default: '',
    },

    // Transaction reference
    transactionId: { type: String, index: true, sparse: true }, // Stripe transfer ID, ACH ref, etc.
    transactionDate: { type: Date, sparse: true },

    // Admin notes & processing
    adminNotes: { type: String, default: '' },
    processedAt: { type: Date, sparse: true },
    completedAt: { type: Date, sparse: true },
    failureReason: { type: String, default: '' },

    // Metadata for auditing
    attributionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: [] }],
    orderCount: { type: Number, default: 0 },
    isReconciled: { type: Boolean, default: false },
    reconciliationDate: { type: Date, sparse: true },
  },
  { timestamps: true },
);

// Indexes for efficient querying
PayoutSchema.index({ creatorHandle: 1, payoutPeriod: 1 });
PayoutSchema.index({ status: 1, createdAt: -1 });
PayoutSchema.index({ 'payoutPeriod.endDate': -1 });

module.exports = mongoose.model('Payout', PayoutSchema);
