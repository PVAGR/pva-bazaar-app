const mongoose = require('mongoose');

/**
 * Token - ERC20 tokens created by users
 * Links deployed contract to owner
 */
const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  contractAddress: {
    type: String,
    required: true,
    index: true,
  },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  decimals: { type: Number, default: 18 },
  totalSupply: { type: String, default: '0' },
  ownerAddress: {
    type: String,
    required: true,
    index: true,
  },
  chainId: { type: Number, default: 8453 },
  txHash: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

tokenSchema.index({ userId: 1, contractAddress: 1 }, { unique: true });

module.exports = mongoose.model('Token', tokenSchema);
