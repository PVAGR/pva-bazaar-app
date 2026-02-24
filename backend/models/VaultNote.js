const mongoose = require('mongoose');

/**
 * VaultNote - Private notes attached to records (Akashic / LifeLog layer).
 * Owner-only access. Content stored as plain text; encryption can be layered later.
 */
const vaultNoteSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recordType: { type: String, enum: ['contact', 'commodity', 'deal', 'general'], default: 'general' },
    recordId: { type: mongoose.Schema.Types.ObjectId, default: null },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

vaultNoteSchema.index({ ownerId: 1, createdAt: -1 });
vaultNoteSchema.index({ ownerId: 1, recordType: 1, recordId: 1 });

module.exports = mongoose.model('VaultNote', vaultNoteSchema);
