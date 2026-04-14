const mongoose = require('mongoose');

/**
 * VotingMarket Model
 * Simplified from GovernanceProposal - focused on Kalshi-style prediction markets
 * Binary/categorical outcomes, end-of-day resolution, instant payouts
 */

const VotingMarketSchema = new mongoose.Schema(
  {
    // Market metadata
    title: {
      type: String,
      required: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['politics', 'sports', 'crypto', 'economy', 'tech', 'entertainment', 'other'],
      default: 'other',
    },
    imageUrl: String,

    // Outcomes
    outcomes: [
      {
        label: { type: String, required: true },
        odds: { type: Number, default: 2 }, // e.g., 2.0 means 2-to-1
        allocation: { type: Number, default: 0 }, // total amount bet on this outcome (in cents)
        betCount: { type: Number, default: 0 },
      },
    ],

    // Market lifecycle
    status: {
      type: String,
      enum: ['draft', 'live', 'locked', 'resolved', 'disputed', 'cancelled'],
      default: 'draft',
    },
    votingWindow: {
      startsAt: Date,
      endsAt: Date,
      isOpen: { type: Boolean, default: false },
    },

    // Resolution
    resolution: {
      correctOutcomeIndex: Number, // index into outcomes array
      correctOutcomeLabel: String,
      source: {
        type: String,
        enum: ['admin', 'oracle', 'crowd_consensus'],
        default: 'admin',
      },
      resolvedAt: Date,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      lockReason: String,
    },

    // Payout configuration
    payoutRule: {
      method: {
        type: String,
        enum: ['equal_split', 'odds_based', 'proportional'],
        default: 'equal_split',
      },
      winner_share_pct: { type: Number, default: 95 }, // 95% to winners, 5% to platform
      platform_fee_pct: { type: Number, default: 5 },
    },

    // Market pool
    totalPoolCents: { type: Number, default: 0 },
    totalBets: { type: Number, default: 0 },

    // Creators
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: String,

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,

    // Audit trail
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes
VotingMarketSchema.index({ status: 1, createdAt: -1 });
VotingMarketSchema.index({ category: 1, status: 1 });
VotingMarketSchema.index({ 'votingWindow.startsAt': 1, 'votingWindow.endsAt': 1 });
VotingMarketSchema.index({ createdBy: 1, createdAt: -1 });
VotingMarketSchema.index({ 'resolution.resolvedAt': 1 });

module.exports = mongoose.model('VotingMarket', VotingMarketSchema);
