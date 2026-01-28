const mongoose = require('mongoose');

/**
 * CustomDatabase Model
 * Allows users to create their own "piratebay-like" databases
 * for organizing files, links, and data with full autonomy
 */
const customDatabaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  type: {
    type: String,
    enum: ['files', 'links', 'media', 'mixed'],
    default: 'mixed',
  },
  // Database entries (flexible schema)
  entries: [{
    title: String,
    description: String,
    url: String, // External URL or IPFS gateway
    ipfsHash: String, // IPFS CID
    fileType: String, // video, audio, document, etc.
    fileSize: Number,
    thumbnailIpfsHash: String,
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Access control
  isPublic: {
    type: Boolean,
    default: false,
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Decentralized backup
  ipfsBackupHash: {
    type: String, // IPFS CID of entire database export
  },
  lastBackupAt: {
    type: Date,
  },
  // Metadata
  totalEntries: {
    type: Number,
    default: 0,
  },
  totalSize: {
    type: Number,
    default: 0, // Total size in bytes
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

// Update stats on entry changes
customDatabaseSchema.methods.updateStats = function () {
  this.totalEntries = this.entries.length;
  this.totalSize = this.entries.reduce((sum, e) => sum + (e.fileSize || 0), 0);
  this.updatedAt = Date.now();
};

// Index for efficient queries
customDatabaseSchema.index({ userId: 1, createdAt: -1 });
customDatabaseSchema.index({ isPublic: 1 });
customDatabaseSchema.index({ 'entries.tags': 1 });

module.exports = mongoose.model('CustomDatabase', customDatabaseSchema);
