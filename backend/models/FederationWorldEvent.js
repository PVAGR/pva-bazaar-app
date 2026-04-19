const mongoose = require('mongoose');

const federationWorldEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    commanderName: { type: String, required: true },
    eventType: {
      type: String,
      enum: ['build_outpost', 'train_keeper', 'run_research', 'check_in', 'system_tick'],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    details: { type: String, default: '' },
    delta: {
      energy: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      materials: { type: Number, default: 0 },
      population: { type: Number, default: 0 },
      outposts: { type: Number, default: 0 },
      keepers: { type: Number, default: 0 },
      research: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

federationWorldEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FederationWorldEvent', federationWorldEventSchema);
