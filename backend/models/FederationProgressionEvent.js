const mongoose = require('mongoose');

const federationProgressionEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: [
        'knowledge_contribution',
        'verified_transaction',
        'governance_action',
        'consistency_streak',
        'identity_verification',
        'system',
      ],
      required: true,
      index: true,
    },
    sourceRef: { type: String, default: '', index: true },
    contributionPoints: { type: Number, default: 0, min: 0 },
    economicPoints: { type: Number, default: 0, min: 0 },
    totalXpAwarded: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

federationProgressionEventSchema.index({ userId: 1, createdAt: -1 });
federationProgressionEventSchema.index({ userId: 1, sourceType: 1, createdAt: -1 });

module.exports = mongoose.model('FederationProgressionEvent', federationProgressionEventSchema);
