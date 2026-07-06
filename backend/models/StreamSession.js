const mongoose = require('mongoose');

/**
 * StreamSession Model
 * Tracks livestream sessions with decentralized storage for recordings
 */
const streamSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'Untitled Stream',
  },
  description: {
    type: String,
    default: '',
  },
  platform: {
    type: String,
    enum: ['twitch', 'kick', 'youtube', 'livepeer', 'custom', 'none'],
    default: 'none',
  },
  platformStreamKey: {
    type: String, // Encrypted stream key for platform integration
    select: false, // Don't return by default for security
  },
  platformStreamUrl: {
    type: String, // External platform URL (e.g., twitch.tv/username)
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'error'],
    default: 'scheduled',
  },
  startedAt: {
    type: Date,
  },
  endedAt: {
    type: Date,
  },
  // Decentralized storage
  ipfsHash: {
    type: String, // IPFS CID for recorded video
  },
  ipfsGatewayUrl: {
    type: String, // Public gateway URL for playback
  },
  recordingDuration: {
    type: Number, // Duration in seconds
  },
  recordingSize: {
    type: Number, // File size in bytes
  },
  thumbnailIpfsHash: {
    type: String, // IPFS CID for thumbnail
  },
  // Metadata
  viewCount: {
    type: Number,
    default: 0,
  },
  tags: [
    {
      type: String,
    },
  ],
  isPublic: {
    type: Boolean,
    default: true, // Users control privacy
  },
  // Webhook/automation tracking
  webhookEvents: [
    {
      event: String,
      timestamp: Date,
      payload: mongoose.Schema.Types.Mixed,
    },
  ],
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
streamSessionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
streamSessionSchema.index({ userId: 1, status: 1 });
streamSessionSchema.index({ createdAt: -1 });
streamSessionSchema.index({ ipfsHash: 1 });

module.exports = mongoose.model('StreamSession', streamSessionSchema);
