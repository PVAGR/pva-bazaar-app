const mongoose = require('mongoose');

const SolanaPayoutSchema = new mongoose.Schema(
  {
    artifactId: { type: String, default: '' }, // link back to artifact or archive entry
    artifactTitle: { type: String, default: '' },
    ritualId: { type: String, default: '' }, // optional external/agent job id
    walletAddress: { type: String, required: true }, // destination (treasury) wallet
    amountSol: { type: Number, required: true, min: 0 },
    network: { type: String, default: 'devnet' }, // devnet | testnet | mainnet-beta
    txSignature: { type: String, default: '' },
    status: {
      type: String,
      enum: ['simulated', 'pending', 'confirmed', 'failed'],
      default: 'simulated',
    },
    error: { type: String, default: '' },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true },
);

SolanaPayoutSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SolanaPayout', SolanaPayoutSchema);
