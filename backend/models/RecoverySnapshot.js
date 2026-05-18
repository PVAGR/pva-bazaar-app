const mongoose = require('mongoose');

const recoverySnapshotSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    device: {
      type: {
        type: String,
        default: 'unknown',
        maxlength: 40,
      },
      platform: {
        type: String,
        default: '',
        maxlength: 120,
      },
      userAgent: {
        type: String,
        default: '',
        maxlength: 600,
      },
      timezone: {
        type: String,
        default: '',
        maxlength: 80,
      },
    },
    manifest: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    encryption: {
      version: { type: String, default: 'hk-recovery-v1', maxlength: 40 },
      algorithm: { type: String, default: 'AES-GCM', maxlength: 40 },
      kdf: { type: String, default: 'PBKDF2-SHA256', maxlength: 60 },
      iterations: { type: Number, default: 250000, min: 100000, max: 1000000 },
      saltB64: { type: String, required: true, maxlength: 400 },
      ivB64: { type: String, required: true, maxlength: 400 },
      ciphertextB64: { type: String, required: true },
      plaintextSha256: { type: String, default: '', maxlength: 128 },
      ciphertextSha256: { type: String, default: '', maxlength: 128 },
    },
    payloadSizeBytes: {
      type: Number,
      required: true,
      min: 1,
      max: 8 * 1024 * 1024,
    },
    ipfs: {
      cid: { type: String, default: '', maxlength: 180 },
      gatewayUrl: { type: String, default: '', maxlength: 600 },
      pinnedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  },
);

recoverySnapshotSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('RecoverySnapshot', recoverySnapshotSchema);
