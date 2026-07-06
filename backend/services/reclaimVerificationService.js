const Artifact = require('../models/Artifact');
const ItemReclaim = require('../models/ItemReclaim');
const crypto = require('crypto');

/**
 * Reclaim Verification Service
 * Verifies lost proof reclaim requests and issues new certificates
 */

/**
 * Verify reclaim eligibility based on metadata
 * @param {string} artifactId - Original artifact ID
 * @param {object} submittedMetadata - User-submitted metadata for verification
 * @returns {object} { eligible: bool, hashMatch: bool, scores: {...} }
 */
async function verifyReclaimEligibility(artifactId, submittedMetadata) {
  const artifact = await Artifact.findById(artifactId);
  if (!artifact) {
    throw new Error('Artifact not found');
  }

  if (!artifact.provenance) {
    throw new Error('Artifact has no provenance record');
  }

  // Calculate hash of submitted metadata
  const submittedHash = calculateMetadataHash(submittedMetadata);

  // Compare hashes
  const originalHash = artifact.provenance.combinedHash;
  const hashMatch = submittedHash === originalHash;

  // Calculate similarity scores
  const metadataScore = calculateMetadataSimilarity(artifact, submittedMetadata);
  const imageScore = submittedMetadata.imageHashes
    ? calculateImageSimilarity(artifact.imageUrls || [], submittedMetadata.imageHashes)
    : 0;

  // Overall confidence: 0-100
  const overallConfidence = Math.round((hashMatch ? 100 : metadataScore + imageScore) / 2);

  return {
    eligible: hashMatch || overallConfidence >= 75, // Allow some margin for genuine losses
    hashMatch,
    metadataScore, // 0-100
    imageScore, // 0-100
    overallConfidence, // 0-100
    originalHash,
    submittedHash,
  };
}

/**
 * Calculate SHA256 hash of metadata for comparison
 */
function calculateMetadataHash(metadata) {
  const canonical = JSON.stringify({
    title: (metadata.title || '').trim().toLowerCase(),
    category: (metadata.category || '').trim().toLowerCase(),
    materials: (metadata.materials || []).map((m) => m.toLowerCase()).sort(),
    dateOfAcquisition: metadata.dateOfAcquisition,
  });

  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Score metadata similarity (0-100)
 */
function calculateMetadataSimilarity(artifact, submitted) {
  let score = 0;

  // Title match (40 points)
  if (artifact.title && submitted.title) {
    const titleSimilarity = stringSimilarity(
      artifact.title.toLowerCase(),
      submitted.title.toLowerCase(),
    );
    score += titleSimilarity * 40;
  }

  // Category match (30 points)
  if (artifact.category && submitted.category) {
    score += artifact.category === submitted.category ? 30 : 0;
  }

  // Materials match (20 points)
  if (artifact.materials && submitted.materials) {
    const artifactMaterials = new Set((artifact.materials || []).map((m) => m.toLowerCase()));
    const submittedMaterials = new Set((submitted.materials || []).map((m) => m.toLowerCase()));
    const intersection = new Set([...artifactMaterials].filter((x) => submittedMaterials.has(x)));
    const union = new Set([...artifactMaterials, ...submittedMaterials]);
    const jaccardScore = (intersection.size / union.size) * 100;
    score += jaccardScore * 0.2; // 20 points max
  }

  // Date match (10 points)
  if (artifact.createdAt && submitted.dateOfAcquisition) {
    const daysDiff = Math.abs(
      (artifact.createdAt - new Date(submitted.dateOfAcquisition)) / (1000 * 60 * 60 * 24),
    );
    if (daysDiff < 365) {
      score += (100 - Math.min(daysDiff, 100)) * 0.1; // decay over time
    }
  }

  return Math.round(Math.min(score, 100));
}

/**
 * Score image similarity (0-100)
 * Simple hash comparison in this version
 * Could integrate TinEye or perceptual hashing in production
 */
function calculateImageSimilarity(artifactImages, submittedHashes) {
  // In production: compare actual image hashes, reverse image search, etc.
  // For MVP: just check if hashes exist
  if (!submittedHashes || submittedHashes.length === 0) {
    return 0;
  }

  // Random score for MVP - replace with real image comparison
  return Math.random() * 100;
}

/**
 * Simple string similarity using Levenshtein distance
 */
function stringSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

/**
 * Check for potential duplicate attempts
 * Prevents users from farming reclaims
 */
async function validateAgainstDuplicate(artifactId, userId) {
  // Check if user already has a reclaim for this artifact
  const existingReclaim = await ItemReclaim.findOne({
    artifactId,
    userId,
    status: { $ne: 'rejected' },
  });

  if (existingReclaim) {
    throw new Error('You already have an active reclaim for this item');
  }

  // Check for suspicious patterns (multiple reclaims by same user)
  const recentReclaims = await ItemReclaim.find({
    userId,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    status: 'reissued',
  });

  if (recentReclaims.length > 3) {
    console.warn(
      `User ${userId} has ${recentReclaims.length} reclaims in last 7 days - potential abuse`,
    );
  }

  return { safe: recentReclaims.length <= 3, recentClaimCount: recentReclaims.length };
}

/**
 * Issue new certificate for reclaimed item
 * @param {string} reclaimId - Reclaim request ID
 * @param {object} adminApproval - Admin approval details
 * @returns {object} { certificateId, blockchainTokenId }
 */
async function issueNewCertificate(reclaimId, adminApproval = {}) {
  const reclaim = await ItemReclaim.findById(reclaimId);
  if (!reclaim) {
    throw new Error('Reclaim request not found');
  }

  if (reclaim.status !== 'verified') {
    throw new Error(`Cannot issue certificate for reclaim with status: ${reclaim.status}`);
  }

  const artifact = await Artifact.findById(reclaim.artifactId);
  if (!artifact) {
    throw new Error('Original artifact not found');
  }

  // Generate new certificate ID
  const certificateId = `PVA-RECERT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // TODO: Mint new NFT on blockchain if applicable
  // const tokenId = await mintNewBlockchainCertificate(artifact);

  // Update artifact with reclaim history
  artifact.reclaimHistory = artifact.reclaimHistory || [];
  artifact.reclaimHistory.push({
    reclaimId,
    issuedAt: new Date(),
    reason: reclaim.reason,
  });
  artifact.provenanceSource = 'reclaimed';
  await artifact.save();

  // Update reclaim
  reclaim.newCertificateId = certificateId;
  reclaim.reissuedAt = new Date();
  reclaim.status = 'reissued';
  await reclaim.save();

  return {
    certificateId,
    artifactId: artifact._id,
    issued: new Date(),
  };
}

/**
 * Get reclaim status for user
 */
async function getReclaimStatus(reclaimId) {
  const reclaim = await ItemReclaim.findById(reclaimId);
  if (!reclaim) {
    throw new Error('Reclaim request not found');
  }

  return {
    id: reclaim._id,
    status: reclaim.status,
    artifact: reclaim.artifactId,
    submittedAt: reclaim.createdAt,
    verifiedAt: reclaim.verificationDetails?.verifiedAt,
    reissuedAt: reclaim.reissuedAt,
    newCertificateId: reclaim.newCertificateId,
    confidence: reclaim.verificationDetails?.overallConfidence,
  };
}

module.exports = {
  verifyReclaimEligibility,
  validateAgainstDuplicate,
  issueNewCertificate,
  getReclaimStatus,
};
