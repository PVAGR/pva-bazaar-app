const mongoose = require('mongoose');

/**
 * JournalEntry Model
 * Personal reflections, thoughts, and writings linked to streams or standalone
 */
const journalEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    enum: ['markdown', 'html', 'plaintext'],
    default: 'markdown',
  },
  // Link to stream session (optional)
  streamSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StreamSession',
  },
  // Decentralized storage
  ipfsHash: {
    type: String, // IPFS CID if user wants to backup journal entry
  },
  // Metadata
  tags: [
    {
      type: String,
    },
  ],
  mood: {
    type: String, // e.g., 'reflective', 'uplifting', 'vulnerable'
  },
  isPublic: {
    type: Boolean,
    default: false, // Private by default
  },
  publishedAt: {
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
journalEntrySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
journalEntrySchema.index({ userId: 1, createdAt: -1 });
journalEntrySchema.index({ tags: 1 });
journalEntrySchema.index({ isPublic: 1, publishedAt: -1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
