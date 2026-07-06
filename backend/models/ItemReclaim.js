const mongoose = require('mongoose');

/**
 * ItemReclaim Model
 * Tracks lost proof reclaim requests
 * If NFT/QR is lost, user can reclaim by submitting metadata
 */

const ItemReclaimSchema = new mongoose.Schema(
  {
    // Original artifact
    artifactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artifact',
      required: true,
      index: true,
    },
    originalHash: String, // provenance.combinedHash from original artifact

    // Reclaim request
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: String,

    // Submitted metadata for verification
    submittedMetadata: {
      title: String,
      description: String,
      category: String,
      materials: [String],
      imageHashes: [String], // SHA256 hashes of submitted images
      dateOfAcquisition: Date,
      additionalDetails: String,
    },

    // Verification result
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'reissued'],
      default: 'pending',
    },
    verificationDetails: {
      hashMatch: { type: Boolean, default: false },
      hashMatchScore: Number, // 0-100
      imageMatch: { type: Boolean, default: false },
      imageMatchScore: Number,
      metadataMatch: { type: Boolean, default: false },
      metadataMatchScore: Number,
      overallConfidence: Number, // 0-100
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin
      verifiedAt: Date,
      rejectionReason: String, // if rejected
    },

    // Re-issued certificate
    newCertificateId: String,
    newBlockchainTokenId: String, // if minted on chain
    reissuedAt: Date,

    // Audit trail
    reason: {
      type: String,
      enum: ['lost_qr', 'lost_nft', 'lost_certificate', 'device_stolen', 'other'],
      required: true,
    },
    reasonDetails: String,
    attempts: { type: Number, default: 0 },
    lastAttemptAt: Date,

    // Anti-fraud
    duplicateCheckPerformed: { type: Boolean, default: false },
    potentialDuplicates: [
      {
        artifactId: mongoose.Schema.Types.ObjectId,
        similarityScore: Number,
        reason: String,
      },
    ],
  },
  { timestamps: true },
);

// Indexes
ItemReclaimSchema.index({ artifactId: 1 }, { unique: true }); // one reclaim per artifact
ItemReclaimSchema.index({ userId: 1, createdAt: -1 });
ItemReclaimSchema.index({ status: 1, createdAt: -1 });
ItemReclaimSchema.index({ 'verificationDetails.verifiedAt': 1 });

module.exports = mongoose.model('ItemReclaim', ItemReclaimSchema);
