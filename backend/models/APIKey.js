// backend/models/APIKey.js - Developer API keys and rate limiting
const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  // Developer info
  developerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  applicationName: String,
  applicationDescription: String,

  // Key management
  keyHash: {
    type: String,
    required: true,
    unique: true,
  },
  keyPrefix: {
    type: String,
    required: true,
    index: true,
  }, // e.g., "pk_live_" or "pk_test_" for display
  maskedKey: String, // e.g., "pk_live_...xyzabc"

  // Permissions & scope
  permissions: {
    type: [String],
    enum: [
      'read:products',
      'write:products',
      'read:orders',
      'write:orders',
      'read:inventory',
      'write:inventory',
      'read:analytics',
      'read:customers',
      'read:refunds',
      'manage:webhooks',
    ],
    default: ['read:products', 'read:orders'],
  },

  // Rate limiting
  rateLimit: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerDay: { type: Number, default: 10000 },
    currentMinuteRequests: { type: Number, default: 0 },
    currentDayRequests: { type: Number, default: 0 },
    resetMinuteAt: Date,
    resetDayAt: Date,
  },

  // Usage tracking
  totalRequests: { type: Number, default: 0 },
  lastUsedAt: Date,
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,

  // Status
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active',
    index: true,
  },
  revokedAt: Date,
  revokeReason: String,

  // Environment
  environment: {
    type: String,
    enum: ['test', 'live'],
    default: 'test',
  },
});

// Hash key before save
apiKeySchema.pre('save', function (next) {
  if (!this.keyHash && this.keyPrefix) {
    // Generate random key
    const randomPart = crypto.randomBytes(32).toString('hex');
    const fullKey = `${this.keyPrefix}${randomPart}`;
    this.keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
    this.maskedKey = `${this.keyPrefix}...${randomPart.slice(-6)}`;
  }
  next();
});

module.exports = mongoose.model('APIKey', apiKeySchema);
