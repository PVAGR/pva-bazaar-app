const mongoose = require('mongoose');

const blockchainTransferSchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    network: {
      type: String,
      enum: ['base', 'base-sepolia', 'ethereum', 'sepolia', 'polygon', 'arbitrum', 'optimism'],
      default: 'base',
      index: true,
    },
    txHash: { type: String, required: true, unique: true, index: true },
    chainId: { type: Number, default: null },
    blockNumber: { type: Number, default: null },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed', 'unknown'],
      default: 'pending',
      index: true,
    },
    fromAddress: { type: String, default: '' },
    toAddress: { type: String, default: '' },
    tokenSymbol: { type: String, default: 'USDC' },
    tokenAmount: { type: String, default: '' },
    amountUsd: { type: Number, default: 0 },
    note: { type: String, default: '' },
    mediaUrl: { type: String, default: '' },
    referenceUrl: { type: String, default: '' },
    explorerUrl: { type: String, default: '' },
    txTimestamp: { type: Date, default: null },
    lastCheckedAt: { type: Date, default: null },
    rawError: { type: String, default: '' },
  },
  { timestamps: true }
);

blockchainTransferSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model('BlockchainTransfer', blockchainTransferSchema);
