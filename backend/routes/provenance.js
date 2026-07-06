// backend/routes/provenance.js - Provenance tokenization API endpoints
const express = require('express');
const router = express.Router();
const provenanceService = require('../services/provenanceService');
const ProvenanceSubmission = require('../models/ProvenanceSubmission');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/provenance/start - Create new submission (draft)
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { objectType } = req.body;

    if (!objectType) {
      return res.status(400).json({ error: 'objectType required' });
    }

    const submission = await provenanceService.createSubmission(req.user.id, objectType);

    res.status(201).json({
      ok: true,
      submissionId: submission._id,
      step: 0,
      objectType: submission.objectType,
      status: submission.status,
      message: 'Submission started. Ready for material truth data.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/provenance/:id/material-truth - Submit material truth data
 */
router.post('/:id/material-truth', authenticateToken, async (req, res) => {
  try {
    const { common, [req.body.objectType]: typeSpecific } = req.body;

    if (!common) {
      return res.status(400).json({ error: 'Common material truth data required' });
    }

    const submission = await provenanceService.updateMaterialTruth(
      req.params.id,
      req.user.id,
      req.body,
    );

    res.json({
      ok: true,
      step: 1,
      completeness: submission.completeness,
      message: 'Material truth updated',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/provenance/:id/narrative - Submit human narrative
 */
router.post('/:id/narrative', authenticateToken, async (req, res) => {
  try {
    const submission = await provenanceService.updateNarrative(
      req.params.id,
      req.user.id,
      req.body,
    );

    res.json({
      ok: true,
      step: 2,
      completeness: submission.completeness,
      message: 'Narrative recorded',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/provenance/:id/proofs - Submit verifiable proofs
 */
router.post('/:id/proofs', authenticateToken, async (req, res) => {
  try {
    const submission = await provenanceService.updateProofs(req.params.id, req.user.id, req.body);

    res.json({
      ok: true,
      step: 3,
      proofTypes: submission.provenanceProof.proofType,
      photosCount: submission.provenanceProof.photos?.length || 0,
      documentsCount: submission.provenanceProof.documents?.length || 0,
      message: 'Proofs submitted',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/provenance/:id/creator-info - Submit creator/owner information
 */
router.post('/:id/creator-info', authenticateToken, async (req, res) => {
  try {
    const submission = await provenanceService.updateCreatorInfo(
      req.params.id,
      req.user.id,
      req.body,
    );

    res.json({
      ok: true,
      step: 4,
      creatorName: submission.creatorInfo.name,
      isArtisan: submission.creatorInfo.isArtisan,
      message: 'Creator information saved',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/provenance/:id/submit - Submit for admin review
 */
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const submission = await provenanceService.submitForReview(req.params.id, req.user.id);

    res.json({
      ok: true,
      status: submission.status,
      completenessScore: submission.completeness.overallScore.toFixed(0),
      message: 'Submission sent for review. Check back for approval status.',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/provenance/:id/mint - Mint NFT (after approval)
 */
router.post('/:id/mint', authenticateToken, async (req, res) => {
  try {
    const submission = await provenanceService.mintNFT(req.params.id, req.user.id);

    res.json({
      ok: true,
      minted: true,
      tokenId: submission.nftData.tokenId,
      contractAddress: submission.nftData.contractAddress,
      tokenURI: submission.nftData.tokenURI,
      chainId: submission.nftData.chainId,
      message: 'NFT minted successfully!',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/provenance/:id/list - Create marketplace listing
 */
router.post('/:id/list', authenticateToken, async (req, res) => {
  try {
    const result = await provenanceService.createListing(req.params.id, req.user.id);

    res.json({
      ok: true,
      listing: {
        productId: result.product._id,
        title: result.product.title,
        price: result.product.price,
        shopId: result.shop._id,
        url: result.listingUrl,
      },
      nft: {
        tokenId: result.submission.nftData.tokenId,
        contractAddress: result.submission.nftData.contractAddress,
      },
      message: 'Item listed on marketplace!',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/provenance/:id - Get submission details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const submission = await provenanceService.getSubmission(req.params.id, req.user.id);

    res.json({
      ok: true,
      submission,
      nextStep: {
        draft: 'Submit material truth data',
        materialTruth: 'Add narrative and story',
        narrative: 'Upload proofs and verification',
        proofs: 'Provide creator information',
        creatorInfo: 'Submit for review',
        submitted: 'Wait for admin approval',
        approved: 'Mint NFT',
        minted: 'Create marketplace listing',
      }[submission.status],
    });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * GET /api/provenance - List user submissions
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const submissions = await provenanceService.listUserSubmissions(req.user.id, filter);

    res.json({
      ok: true,
      count: submissions.length,
      submissions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/provenance/:id/scan-qr - Scan QR code for previous item
 */
router.post('/:id/scan-qr', authenticateToken, async (req, res) => {
  try {
    const { qrCode } = req.body;

    // Look up previous submission by QR code
    const previousSubmission = await ProvenanceSubmission.findOne({
      'provenanceProof.qrCode.code': qrCode,
      'nftData.minted': true,
    }).select('materialTruth creatorInfo nftData');

    if (!previousSubmission) {
      return res.status(404).json({ error: 'QR code not found in system. Verify code.' });
    }

    res.json({
      ok: true,
      previousItem: {
        name: previousSubmission.materialTruth.objectName,
        creator: previousSubmission.creatorInfo.name,
        tokenId: previousSubmission.nftData.tokenId,
        lastTradedAt: previousSubmission.updatedAt,
      },
      message: 'Previous provenance verified. Chain of custody established.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/provenance/search - Search published items
 */
router.get('/search/all', async (req, res) => {
  try {
    const { q, type, country, sort } = req.query;

    const query = { status: 'published', 'nftData.minted': true };
    if (type) query.objectType = type;
    if (country) query['creatorInfo.country'] = country;
    if (q) query.searchKeywords = { $in: q.toLowerCase().split(' ') };

    const sortBy = sort === 'newest' ? { createdAt: -1 } : { 'completeness.overallScore': -1 };

    const results = await ProvenanceSubmission.find(query)
      .sort(sortBy)
      .limit(50)
      .select('materialTruth creatorInfo nftData completeness');

    res.json({
      ok: true,
      count: results.length,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
