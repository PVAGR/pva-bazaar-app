const mongoose = require('mongoose');

const openClawMemorySchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: String, required: true },
  type: { type: String, enum: ['fact', 'goal', 'reflection', 'preference'], default: 'fact' },
  source: { type: String, default: 'agent' },
  channel: { type: String, default: '' },
  profileId: { type: String, default: '' },
  pinned: { type: Boolean, default: false },
  score: { type: Number, default: 1 },
  tags: { type: [String], default: [] },
  lastAccessedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

openClawMemorySchema.index({ createdAt: -1 });
openClawMemorySchema.index({ type: 1, createdAt: -1 });
openClawMemorySchema.index({ profileId: 1, channel: 1, pinned: -1, score: -1, createdAt: -1 });
openClawMemorySchema.index({ key: 1, profileId: 1, createdAt: -1 });

module.exports = mongoose.model('OpenClawMemory', openClawMemorySchema);
