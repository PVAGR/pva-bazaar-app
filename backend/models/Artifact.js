// backend/models/Artifact.js - Enhanced version
const mongoose = require('mongoose');

const artifactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  physicalSerial: { type: String, unique: true },
  materials: [String],
  artisan: { type: String, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Blockchain integration
  blockchainDetails: {
    network: { type: String, default: 'base' },
    contractAddress: String,
    tokenId: String,
    tokenStandard: { type: String, default: 'ERC-721' }
  },
  
  // Fractionalization for shares
  fractionalization: {
    enabled: { type: Boolean, default: false },
    totalShares: { type: Number, default: 0 },
    soldShares: { type: Number, default: 0 },
    sharePrice: { type: Number, default: 0 },
    majorityThreshold: { type: Number, default: 0 }
  },
  
  // Ownership and verification
  ownershipHistory: [{
    owner: String,
    date: { type: Date, default: Date.now },
    transactionHash: String
  }],
  
  authenticationCode: String,
  lastVerification: Date,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
// Text index for search endpoints and vector fallback
artifactSchema.index({
  name: 'text',
  title: 'text',
  description: 'text',
  materials: 'text',
  artisan: 'text',
  category: 'text'
});

module.exports = mongoose.model('Artifact', artifactSchema);