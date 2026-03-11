const mongoose = require('mongoose');

const openClawMessageSchema = new mongoose.Schema({
  direction: { type: String, enum: ['outbound', 'inbound'], required: true },
  content: { type: String, required: true },
  event: { type: String, default: 'pvabazaar.message' },
  source: { type: String, default: 'unknown' },
  processed: { type: Boolean, default: false },
  respondingTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OpenClawMessage',
    default: null,
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

openClawMessageSchema.index({ createdAt: -1 });
openClawMessageSchema.index({ processed: 1, direction: 1 });

module.exports = mongoose.model('OpenClawMessage', openClawMessageSchema);
