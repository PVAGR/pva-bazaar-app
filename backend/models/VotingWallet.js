const mongoose = require('mongoose');

/**
 * VotingWallet Model
 * Tracks user's prize pool and voting account balance
 */

const VotingWalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },

    // Balance tracking (in cents)
    availableBalance: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 },
    totalLost: { type: Number, default: 0 },
    totalBet: { type: Number, default: 0 },

    // Account status
    status: {
      type: String,
      enum: ['active', 'suspended', 'closed'],
      default: 'active',
    },

    // KYC/Verification status
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: Date,
    passportVerified: { type: Boolean, default: false },
    passportVerifiedAt: Date,
    kycStatus: {
      type: String,
      enum: ['not_started', 'pending', 'verified', 'rejected', 'suspended'],
      default: 'not_started',
    },

    // Preferences
    preferences: {
      categories: [String], // favorite categories
      notificationsEnabled: { type: Boolean, default: true },
      monthlyBudget: Number, // in cents
    },

    // Audit
    lastActivityAt: Date,
    totalMarketsParticipated: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 }, // 0-100%
  },
  { timestamps: true },
);

// Indexes
VotingWalletSchema.index({ userEmail: 1 });
VotingWalletSchema.index({ status: 1, availableBalance: -1 });
VotingWalletSchema.index({ kycStatus: 1 });

module.exports = mongoose.model('VotingWallet', VotingWalletSchema);
