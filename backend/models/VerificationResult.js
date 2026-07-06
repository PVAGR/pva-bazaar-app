/**
 * AI-Verified Artifact Verification Result.
 * Why (Anti-Druj): One record per verification run; certificate ID is unique and auditable.
 * Links to marketplace item by artifactIdOrSlug (Mongo _id or slug).
 */
const mongoose = require('mongoose');

const verificationResultSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true },
    artifactIdOrSlug: { type: String, required: true, index: true },
    is_authentic: { type: Boolean, required: true },
    confidence_score: { type: Number, required: true, min: 0, max: 1 },
    computed_hash: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['verified', 'integrity_compromised', 'unknown', 'error'],
    },
    message: { type: String },
    source: { type: String, default: 'ci' },
    verified_at: { type: Date, default: Date.now },
    matched_entry: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

verificationResultSchema.index({ artifactIdOrSlug: 1, verified_at: -1 });

module.exports = mongoose.model('VerificationResult', verificationResultSchema);
