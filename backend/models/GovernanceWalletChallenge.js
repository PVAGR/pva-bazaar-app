const mongoose = require('mongoose');

const governanceWalletChallengeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  nonce: {
    type: String,
    required: true,
    unique: true,
  },
  message: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  usedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

governanceWalletChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('GovernanceWalletChallenge', governanceWalletChallengeSchema);
