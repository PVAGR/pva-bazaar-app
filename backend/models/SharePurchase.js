const mongoose = require('mongoose');

/**
 * SharePurchase – records each fractional share acquisition for an Artifact.
 * One document per Stripe checkout session (idempotent on stripeSessionId).
 */
const SharePurchaseSchema = new mongoose.Schema(
  {
    artifactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artifact',
      required: true,
      index: true,
    },
    artifactSlug: { type: String, default: '' },

    stripeSessionId: { type: String, unique: true, sparse: true },
    stripePaymentIntentId: { type: String, default: '' },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    quantity: { type: Number, required: true, min: 1 },
    pricePerShareCents: { type: Number, required: true },
    totalAmountCents: { type: Number, required: true },
    currency: { type: String, default: 'USD' },

    buyerEmail: { type: String, default: '' },
    buyerName: { type: String, default: '' },
    ownerAddress: { type: String, default: '' },

    // On-chain provenance for share transfer (set after NFT split / or off-chain record)
    transactionHash: { type: String, default: '' },

    // Tracks idempotent processing across webhook + finalize paths
    idempotencyKey: { type: String, index: true, sparse: true },
    finalizedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SharePurchase', SharePurchaseSchema);
