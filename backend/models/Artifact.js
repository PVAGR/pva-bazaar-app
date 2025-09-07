const mongoose = require('mongoose');

const ArtifactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  physicalSerial: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  creationDate: {
    type: Date,
    required: true
  },
  materials: [{
    type: String,
    trim: true
  }],
  artisan: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  ipfsImageHash: {
    type: String,
    trim: true
  },
  blockchainDetails: {
    network: {
      type: String,
      default: 'base',
      enum: ['base', 'ethereum', 'polygon']
    },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true
    },
    tokenId: {
      type: String,
      required: true
    },
    tokenStandard: {
      type: String,
      default: 'ERC-721',
      enum: ['ERC-721', 'ERC-1155']
    }
  },
  // Other fields remain unchanged
  ownershipHistory: [{
    owner: {
      type: String,
      required: true
    },
    walletAddress: {
      type: String,
      lowercase: true,
      required: true
    },
    ownershipType: {
      type: String,
      enum: ['Minter', 'Full Ownership', 'Fractional Owner', 'Custodian'],
      required: true
    },
    dateAcquired: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['Current', 'Previous'],
      default: 'Current'
    }
  }],
  provenanceHash: {
    type: String,
    trim: true
  },
  authenticationCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  lastVerification: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Text index for traditional search
ArtifactSchema.index({
  name: 'text',
  description: 'text',
  materials: 'text',
  artisan: 'text'
});

// Index for better performance
ArtifactSchema.index({ physicalSerial: 1 });
ArtifactSchema.index({ 'blockchainDetails.contractAddress': 1, 'blockchainDetails.tokenId': 1 });
ArtifactSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Artifact', ArtifactSchema);