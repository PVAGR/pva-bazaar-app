const mongoose = require('mongoose');

/**
 * VotingBet Model
 * Records individual bets placed on voting markets
 */

const VotingBetSchema = new mongoose.Schema(
  {
    // References
    marketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VotingMarket',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: String,

    // Bet details
    outcomeIndex: {
      type: Number,
      required: true,
    }, // index into market.outcomes
    outcomeLabel: String,
    amountCents: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: { type: String, default: 'USD' },

    // Payout calculation (filled in on market resolution)
    isWinner: { type: Boolean, default: null },
    winnings: { type: Number, default: 0 }, // in cents
    payoutStatus: {
      type: String,
      enum: ['pending', 'calculated', 'initiated', 'completed', 'failed'],
      default: 'pending',
    },

    // Payment tracking
    paymentIntentId: String, // Stripe or bank transfer ID
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'failed', 'refunded'],
      default: 'unpaid',
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'cancelled', 'settled'],
      default: 'active',
    },
    cancelledAt: Date,
    settledAt: Date,

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

// Indexes
VotingBetSchema.index({ marketId: 1, userId: 1 }, { unique: true }); // one bet per user per market
VotingBetSchema.index({ userId: 1, createdAt: -1 });
VotingBetSchema.index({ marketId: 1, status: 1 });
VotingBetSchema.index({ payoutStatus: 1, createdAt: -1 });

module.exports = mongoose.model('VotingBet', VotingBetSchema);
