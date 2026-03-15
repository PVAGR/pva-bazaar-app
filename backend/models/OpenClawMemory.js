const mongoose = require('mongoose');

const openClawMemorySchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: String, required: true },
  type: { type: String, enum: ['fact', 'goal', 'reflection', 'preference'], default: 'fact' },
  source: { type: String, default: 'agent' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

openClawMemorySchema.index({ createdAt: -1 });
openClawMemorySchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('OpenClawMemory', openClawMemorySchema);
