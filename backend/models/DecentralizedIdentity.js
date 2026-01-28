const mongoose = require('mongoose');

/**
 * DecentralizedIdentity Model
 * Stores user's DID (Decentralized Identifier) and associated metadata
 * Enables self-sovereign identity without centralized auth dependency
 */
const decentralizedIdentitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  // DID standard format: did:method:identifier
  did: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  didMethod: {
    type: String,
    enum: ['key', 'web', 'ethr', 'ion', 'pkh'], // Common DID methods
    default: 'key',
  },
  // Public key for verification (DID Document)
  publicKey: {
    type: String,
    required: true,
  },
  // Encrypted private key (if stored - NOT RECOMMENDED for production)
  // Users should control private keys themselves
  encryptedPrivateKey: {
    type: String,
    select: false, // Never return in queries
  },
  // DID Document (W3C standard)
  didDocument: {
    type: mongoose.Schema.Types.Mixed, // JSON object
  },
  // Verifiable Credentials (optional)
  credentials: [{
    issuer: String,
    type: String,
    credentialSubject: mongoose.Schema.Types.Mixed,
    proof: mongoose.Schema.Types.Mixed,
    issuedAt: Date,
  }],
  // IPFS hash of DID Document (for decentralized backup)
  didDocumentIpfsHash: {
    type: String,
  },
  // Metadata
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update `updatedAt` on save
decentralizedIdentitySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient DID lookups
decentralizedIdentitySchema.index({ did: 1 });
decentralizedIdentitySchema.index({ userId: 1 });

module.exports = mongoose.model('DecentralizedIdentity', decentralizedIdentitySchema);
