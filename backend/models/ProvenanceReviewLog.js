const mongoose = require('mongoose');

const provenanceReviewLogSchema = new mongoose.Schema(
  {
    artifactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artifact',
      required: true,
      index: true,
    },
    previousStatus: {
      type: String,
      enum: ['hash_verified', 'pending', 'flagged'],
      default: 'pending',
    },
    nextStatus: {
      type: String,
      enum: ['hash_verified', 'pending', 'flagged'],
      required: true,
    },
    reviewNotes: { type: String, default: '' },
    actor: {
      id: { type: String, default: '' },
      role: { type: String, default: 'admin' },
      label: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  },
);

provenanceReviewLogSchema.index({ createdAt: -1, artifactId: 1 });

module.exports = mongoose.model('ProvenanceReviewLog', provenanceReviewLogSchema);
