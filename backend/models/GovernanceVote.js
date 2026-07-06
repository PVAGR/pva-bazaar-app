const mongoose = require('mongoose');

const governanceVoteSchema = new mongoose.Schema(
  {
    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GovernanceProposal',
      required: true,
      index: true,
    },
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
    },
    choice: {
      type: String,
      enum: ['yes', 'no', 'abstain'],
      required: true,
    },
    chainId: {
      type: Number,
      required: true,
    },
    txHash: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    blockNumber: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['submitted', 'confirmed', 'invalidated'],
      default: 'submitted',
    },
  },
  {
    timestamps: true,
  },
);

governanceVoteSchema.index({ proposalId: 1, userId: 1 }, { unique: true });
governanceVoteSchema.index({ proposalId: 1, choice: 1 });

module.exports = mongoose.model('GovernanceVote', governanceVoteSchema);
