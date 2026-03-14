const mongoose = require('mongoose');

const blockchainTransferSchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    artifactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artifact', index: true, default: null },
    artifactSlug: { type: String, default: '' },
    artifactTitle: { type: String, default: '' },
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
    contractVersion: { type: String, default: 'v1' },
    contractTerms: {
      partyOneName: { type: String, default: '' },
      partyOneRole: { type: String, default: 'Operator' },
      partyTwoName: { type: String, default: '' },
      partyTwoRole: { type: String, default: 'Counterparty' },
      additionalClauses: { type: String, default: '' },
    },
    signatures: {
      partyOneSignerName: { type: String, default: '' },
      partyOneSignerWallet: { type: String, default: '' },
      partyOneSignedAt: { type: Date, default: null },
      partyTwoSignerName: { type: String, default: '' },
      partyTwoSignerWallet: { type: String, default: '' },
      partyTwoSignedAt: { type: Date, default: null },
      witnessName: { type: String, default: '' },
      witnessWallet: { type: String, default: '' },
      witnessSignedAt: { type: Date, default: null },
    },
    attestation: {
      message: { type: String, default: '' },
      partyOneSignature: { type: String, default: '' },
      partyTwoSignature: { type: String, default: '' },
      witnessSignature: { type: String, default: '' },
      partyOneValid: { type: Boolean, default: false },
      partyTwoValid: { type: Boolean, default: false },
      witnessValid: { type: Boolean, default: false },
      verifiedAt: { type: Date, default: null },
    },
    finalizationNote: { type: String, default: '' },
    finalizedAt: { type: Date, default: null, index: true },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalizationDigest: { type: String, default: '', index: true },
    finalizationSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    auditEvents: [
      {
        eventType: { type: String, default: '' },
        eventAt: { type: Date, default: Date.now },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        actorRole: { type: String, default: '' },
        details: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    ],
    rawError: { type: String, default: '' },
  },
  { timestamps: true }
);

blockchainTransferSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model('BlockchainTransfer', blockchainTransferSchema);
