const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['visitor', 'event', 'api_call', 'blockchain_interaction']
  },
  data: {
    type: Object,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ip: String,
  userAgent: String,
  source: {
    type: String,
    default: 'website'
  }
});

// Index for efficient queries
analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ 'data.event': 1, timestamp: -1 });
analyticsSchema.index({ 'data.page': 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);