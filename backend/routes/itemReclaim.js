const express = require('express');
const Artifact = require('../models/Artifact');
const ItemReclaim = require('../models/ItemReclaim');
const reclaimVerificationService = require('../services/reclaimVerificationService');

const router = express.Router();

/**
 * Middleware: Require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * POST /api/item-reclaim/request
 * Submit a lost proof reclaim request
 * Expects: { artifactId, reason, submittedMetadata: { title, category, materials, ... } }
 */
router.post('/request', requireAuth, async (req, res) => {
  try {
    const { artifactId, reason, submittedMetadata } = req.body;

    if (!artifactId || !reason) {
      return res.status(400).json({ error: 'Artifact ID and reason required' });
    }

    // Check if artifact exists
    const artifact = await Artifact.findById(artifactId);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Verify ownership or allow admin to reclaim for others
    if (artifact.createdBy?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this artifact' });
    }

    // Check for duplicate attempts
    const dupeCheck = await reclaimVerificationService.validateAgainstDuplicate(
      artifactId,
      req.user._id,
    );
    if (!dupeCheck.safe) {
      return res.status(429).json({
        error: `Too many reclaim attempts (${dupeCheck.recentClaimCount} in 7 days)`,
      });
    }

    // Run verification
    const verification = await reclaimVerificationService.verifyReclaimEligibility(
      artifactId,
      submittedMetadata,
    );

    // Create reclaim record
    const reclaim = new ItemReclaim({
      artifactId,
      userId: req.user._id,
      userEmail: req.user.email,
      reason,
      submittedMetadata,
      status: verification.eligible ? 'verified' : 'pending',
      verificationDetails: {
        hashMatch: verification.hashMatch,
        hashMatchScore: 100,
        metadataScore: verification.metadataScore,
        imageScore: verification.imageScore,
        overallConfidence: verification.overallConfidence,
        verifiedAt: new Date(),
      },
      duplicateCheckPerformed: true,
    });

    await reclaim.save();

    // If automatically verified, issue new certificate
    if (verification.eligible && verification.hashMatch) {
      await reclaimVerificationService.issueNewCertificate(reclaim._id, {
        verifiedBy: req.user._id,
      });
    }

    res.status(201).json({
      message: verification.eligible
        ? 'Reclaim approved and certificate issued'
        : 'Reclaim pending verification',
      reclaimId: reclaim._id,
      status: reclaim.status,
      confidence: verification.overallConfidence,
      newCertificateId: reclaim.newCertificateId,
    });
  } catch (error) {
    console.error('Reclaim request error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/item-reclaim/:id/status
 * Check status of reclaim request
 */
router.get('/:id/status', requireAuth, async (req, res) => {
  try {
    const reclaim = await ItemReclaim.findById(req.params.id);

    if (!reclaim) {
      return res.status(404).json({ error: 'Reclaim request not found' });
    }

    // Users can only check their own reclaims
    if (reclaim.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const status = await reclaimVerificationService.getReclaimStatus(req.params.id);

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/item-reclaim
 * List user's reclaim requests
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const reclaims = await ItemReclaim.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ItemReclaim.countDocuments({
      userId: req.user._id,
    });

    res.json({
      reclaims: reclaims.map((r) => ({
        id: r._id,
        artifactId: r.artifactId,
        status: r.status,
        reason: r.reason,
        confidence: r.verificationDetails?.overallConfidence,
        newCertificateId: r.newCertificateId,
        createdAt: r.createdAt,
        reissuedAt: r.reissuedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/item-reclaim/:id/review (Admin)
 * Manually review and approve/reject reclaim
 */
router.put('/:id/review', requireAdmin, async (req, res) => {
  try {
    const { approved, rejectionReason } = req.body;

    const reclaim = await ItemReclaim.findById(req.params.id);
    if (!reclaim) {
      return res.status(404).json({ error: 'Reclaim not found' });
    }

    if (approved) {
      reclaim.status = 'verified';
      reclaim.verificationDetails.verifiedBy = req.user._id;
      reclaim.verificationDetails.verifiedAt = new Date();

      // Issue certificate
      await reclaimVerificationService.issueNewCertificate(reclaim._id, {
        verifiedBy: req.user._id,
      });

      await reclaim.save();

      res.json({
        message: 'Reclaim approved and certificate issued',
        newCertificateId: reclaim.newCertificateId,
      });
    } else {
      reclaim.status = 'rejected';
      reclaim.verificationDetails.rejectionReason = rejectionReason;
      await reclaim.save();

      res.json({
        message: 'Reclaim rejected',
        reason: rejectionReason,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
