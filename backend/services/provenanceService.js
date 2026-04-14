// backend/services/provenanceService.js - Submit, validate, mint, publish
const ProvenanceSubmission = require('../models/ProvenanceSubmission');
const ProductType = require('../models/ProductType');
const Shop = require('../models/Shop');
const { Web3 } = require('web3');

const web3 = new Web3(process.env.ETHEREUM_RPC_URL);

/**
 * Create new provenance submission (draft)
 */
async function createSubmission(userId, objectType) {
  const submission = new ProvenanceSubmission({
    userId,
    objectType,
    status: 'draft',
  });
  await submission.save();
  return submission;
}

/**
 * Update draft with material truth data
 */
async function updateMaterialTruth(submissionId, userId, data) {
  const submission = await ProvenanceSubmission.findOne({
    _id: submissionId,
    userId,
    status: 'draft',
  });

  if (!submission) throw new Error('Submission not found or not in draft');

  submission.materialTruth = {
    ...submission.materialTruth,
    ...data.common,
    [submission.objectType]: data[submission.objectType] || {},
  };

  submission.submissions.push({
    timestamp: new Date(),
    step: 1,
    changes: data,
  });

  await submission.save();
  return submission;
}

/**
 * Update narrative (human story)
 */
async function updateNarrative(submissionId, userId, data) {
  const submission = await ProvenanceSubmission.findOne({
    _id: submissionId,
    userId,
    status: 'draft',
  });

  if (!submission) throw new Error('Submission not found');

  submission.humanNarrative = { ...submission.humanNarrative, ...data };
  submission.submissions.push({
    timestamp: new Date(),
    step: 2,
    changes: data,
  });

  await submission.save();
  return submission;
}

/**
 * Update proofs (photos, docs, blockchain, GPS, etc.)
 */
async function updateProofs(submissionId, userId, data) {
  const submission = await ProvenanceSubmission.findOne({
    _id: submissionId,
    userId,
  });

  if (!submission) throw new Error('Submission not found');

  // Handle photo uploads
  if (data.photos) {
    submission.provenanceProof.photos = [
      ...(submission.provenanceProof.photos || []),
      ...data.photos,
    ];
  }

  // Handle documents
  if (data.documents) {
    submission.provenanceProof.documents = [
      ...(submission.provenanceProof.documents || []),
      ...data.documents,
    ];
  }

  // Handle blockchain proof
  if (data.blockchain) {
    submission.provenanceProof.blockchainProof = data.blockchain;
  }

  // Handle GPS location
  if (data.gpsLocation) {
    submission.provenanceProof.gpsLocation = data.gpsLocation;
    submission.provenanceProof.gpsLocation.verified = true; // Assume verified if provided
  }

  // Handle QR code (previous item)
  if (data.qrCode) {
    submission.provenanceProof.qrCode = data.qrCode;
  }

  submission.submissions.push({
    timestamp: new Date(),
    step: 3,
    changes: { proofType: data.proofType },
  });

  await submission.save();
  return submission;
}

/**
 * Update creator/owner info
 */
async function updateCreatorInfo(submissionId, userId, data) {
  const submission = await ProvenanceSubmission.findOne({
    _id: submissionId,
    userId,
  });

  if (!submission) throw new Error('Submission not found');

  submission.creatorInfo = { ...submission.creatorInfo, ...data };
  submission.submissions.push({
    timestamp: new Date(),
    step: 4,
    changes: data,
  });

  await submission.save();
  return submission;
}

/**
 * Validate and submit for review
 */
async function submitForReview(submissionId, userId) {
  const submission = await ProvenanceSubmission.findOne({
    _id: submissionId,
    userId,
    status: 'draft',
  });

  if (!submission) throw new Error('Submission not found in draft');

  // Calculate completeness scores
  submission.calculateCompleteness();
  submission.generateKeywords();

  // Basic validation
  if (submission.completeness.overallScore < 40) {
    throw new Error(
      `Submission incomplete (${submission.completeness.overallScore.toFixed(0)}% complete). Minimum 40% required.`
    );
  }

  submission.status = 'submitted';
  submission.submissions.push({
    timestamp: new Date(),
    step: 5,
    changes: { action: 'submitted_for_review' },
  });

  await submission.save();

  // Trigger fraud detection check (async)
  detectFraud(submission).catch((err) => console.error('Fraud detection error:', err));

  return submission;
}

/**
 * Mint NFT for approved submission
 */
async function mintNFT(submissionId, userId) {
  const submission = await ProvenanceSubmission.findOne({
    _id: submissionId,
    userId,
  });

  if (!submission) throw new Error('Submission not found');
  if (submission.nftData.minted) throw new Error('NFT already minted');

  try {
    // Generate NFT metadata
    const metadata = {
      name: submission.materialTruth.objectName,
      description: submission.materialTruth.shortDescription,
      image: submission.provenanceProof.photos?.[0]?.url,
      attributes: [
        { trait_type: 'Type', value: submission.objectType },
        { trait_type: 'Creator', value: submission.creatorInfo.name },
        { trait_type: 'Country', value: submission.creatorInfo.country },
        { trait_type: 'Authenticity Score', value: submission.completeness.overallScore.toFixed(0) },
      ],
      provenance: {
        materialTruth: submission.materialTruth,
        narrative: submission.humanNarrative,
        createdAt: submission.createdAt,
        submissionId: submission._id.toString(),
      },
    };

    // TODO: Upload metadata to IPFS, get tokenURI
    // For now, use placeholder
    const tokenURI = `ipfs://QmPlaceholder/${submission._id}`;

    // TODO: Call smart contract to mint NFT
    // This would use web3.js to send transaction
    const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
    const tokenId = `${Date.now()}-${submission._id}`;

    submission.nftData.minted = true;
    submission.nftData.contractAddress = contractAddress;
    submission.nftData.tokenId = tokenId;
    submission.nftData.tokenURI = tokenURI;
    submission.nftData.chainId = parseInt(process.env.CHAIN_ID || '8453'); // Base mainnet
    submission.nftData.mintedAt = new Date();

    submission.status = 'minted';
    await submission.save();

    return submission;
  } catch (err) {
    throw new Error(`NFT minting failed: ${err.message}`);
  }
}

/**
 * Auto-create marketplace listing from submission
 */
async function createListing(submissionId, userId) {
  const submission = await ProvenanceSubmission.findOne({
    _id: submissionId,
    userId,
  });

  if (!submission) throw new Error('Submission not found');
  if (!submission.nftData.minted) throw new Error('NFT not minted yet');

  // Get or create seller shop
  let shop = await Shop.findOne({ userId });
  if (!shop) {
    shop = new Shop({
      userId,
      shopName: `${submission.creatorInfo.name}'s Collection`,
      slug: `${submission.creatorInfo.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      status: 'live',
    });
    await shop.save();
  }

  // Create product listing
  const pricing = await require('./pricingService').calculateFairPrice({
    category: submission.objectType,
    condition: 'certified',
    hasProvenance: true,
  });

  const product = new ProductType({
    sellerId: userId,
    shopId: shop._id,
    title: submission.materialTruth.objectName,
    description: submission.materialTruth.shortDescription,
    type: 'nft',
    price: submission.marketplaceData.suggestedPrice || pricing,
    images: submission.provenanceProof.photos?.map((p) => p.url) || [],
    materials: submission.materialTruth.materials,
    status: 'active',
    nftData: {
      contractAddress: submission.nftData.contractAddress,
      tokenId: submission.nftData.tokenId,
      tokenURI: submission.nftData.tokenURI,
      chainId: submission.nftData.chainId,
    },
    provenance: {
      provenanceSubmissionId: submission._id,
      submittedBy: submission.creatorInfo.name,
      country: submission.creatorInfo.country,
      certificationScore: submission.completeness.overallScore,
    },
    tags: submission.tags || [],
  });

  await product.save();

  submission.marketplaceData.listingId = product._id;
  submission.status = 'published';
  submission.submissions.push({
    timestamp: new Date(),
    step: 6,
    changes: { listingId: product._id.toString() },
  });

  await submission.save();

  return {
    submission,
    product,
    shop,
    listingUrl: `/marketplace/product/${product._id}`,
  };
}

/**
 * Fraud/authenticity detection
 */
async function detectFraud(submission) {
  const proofScore = submission.completeness.proofScore;
  const inconsistencies = [];

  // Check for proof inconsistencies
  if (submission.provenanceProof.photos?.length === 0 && submission.completeness.proofScore > 50) {
    inconsistencies.push('High proof score but no photos');
  }

  // Check for narrative quality
  if (submission.humanNarrative.story?.length < 50) {
    inconsistencies.push('Very short narrative');
  }

  // Check blockchain proof
  if (submission.provenanceProof.blockchainProof) {
    try {
      // Optionally verify on-chain
      // const receipt = await web3.eth.getTransactionReceipt(submission.provenanceProof.blockchainProof.transactionHash);
      // if (!receipt) inconsistencies.push('Blockchain proof not found');
    } catch (err) {
      inconsistencies.push('Blockchain verification failed');
    }
  }

  if (inconsistencies.length > 0) {
    submission.fraud.flagged = true;
    submission.fraud.flagReason = inconsistencies.join('; ');
    submission.fraud.confidenceScore = Math.min(inconsistencies.length * 20, 100);
    await submission.save();
  }
}

/**
 * Get submission with all details
 */
async function getSubmission(submissionId, userId) {
  const submission = await ProvenanceSubmission.findOne({
    _id: submissionId,
    userId,
  });

  if (!submission) throw new Error('Submission not found');

  return {
    ...submission.toObject(),
    completeness: submission.completeness,
    completenessPercent: submission.completeness.overallScore.toFixed(0),
  };
}

/**
 * List user submissions
 */
async function listUserSubmissions(userId, filter = {}) {
  const query = { userId, ...filter };
  return ProvenanceSubmission.find(query)
    .sort({ createdAt: -1 })
    .select('materialTruth status completeness createdAt nftData marketplaceData');
}

module.exports = {
  createSubmission,
  updateMaterialTruth,
  updateNarrative,
  updateProofs,
  updateCreatorInfo,
  submitForReview,
  mintNFT,
  createListing,
  detectFraud,
  getSubmission,
  listUserSubmissions,
};
