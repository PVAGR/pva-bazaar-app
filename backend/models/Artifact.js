// backend/models/Artifact.js - Enhanced version
const mongoose = require('mongoose');

const artifactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrls: [{ type: String }], // Support multiple images
  price: { type: Number, required: true },
  salePrice: { type: Number },
  category: { type: String, required: true },
  physicalSerial: { type: String, unique: true },
  materials: [String],
  artisan: { type: String, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Canonical MarketplaceItem fields
  slug: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['draft', 'published'], default: 'published' },
  tags: [{ type: String }],

  // Inventory fields
  stockQty: { type: Number, default: 0 },
  reservedQty: { type: Number, default: 0 },
  soldQty: { type: Number, default: 0 },
  isUnlimited: { type: Boolean, default: false },

  // Payout and consignment info
  payoutInfo: {
    artisanWallet: String,
    partnerWallet: String,
    bankDetails: String,
    promoterName: String,
    promoterContact: String,
  },
  consignment: {
    artisanShare: { type: Number, default: 50 },
    pvaFee: { type: Number, default: 35 },
    promoterShare: { type: Number, default: 15 },
    digitalSignature: String,
    agreed: { type: Boolean, default: false },
  },

  // Blockchain integration
  blockchainDetails: {
    network: { type: String, default: 'base' },
    contractAddress: String,
    tokenId: String,
    tokenStandard: { type: String, default: 'ERC-721' },
  },

  // Fractionalization for shares
  fractionalization: {
    enabled: { type: Boolean, default: false },
    totalShares: { type: Number, default: 0 },
    soldShares: { type: Number, default: 0 },
    sharePrice: { type: Number, default: 0 },
    majorityThreshold: { type: Number, default: 0 },
  },

  // Ownership and verification
  ownershipHistory: [
    {
      owner: String,
      date: { type: Date, default: Date.now },
      transactionHash: String,
    },
  ],

  authenticationCode: String,
  lastVerification: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound index for pagination
artifactSchema.index({ createdAt: -1, _id: -1 });
// Unique slug index
artifactSchema.index({ slug: 1 }, { unique: true, sparse: true });
// Text index for search endpoints and vector fallback
artifactSchema.index({
  name: 'text',
  title: 'text',
  description: 'text',
  category: 'text',
  tags: 'text',
  materials: 'text',
  artisan: 'text',
});

module.exports = mongoose.model('Artifact', artifactSchema);
