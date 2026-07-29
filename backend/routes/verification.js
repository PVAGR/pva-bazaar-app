/**
 * AI-Verified Artifact API: store and retrieve verification results.
 * Why (Anti-Druj): Open endpoints to store (e.g. from CI) and read verification status for badges.
 */
const express = require('express');
const router = express.Router();
const VerificationResult = require('../models/VerificationResult');
const crypto = require('crypto');
const { createProvenanceEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

function generateCertificateId() {
  const hex = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `PVA-CERT-${hex}`;
}

// Optional: require X-Verify-Secret when VERIFY_API_SECRET is set (for CI).
function verifySecret(req, res, next) {
  const secret = process.env.VERIFY_API_SECRET;
  if (!secret) return next();
  const header = req.headers['x-verify-secret'];
  if (header !== secret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

// POST /api/verification — store a verification result (e.g. from GitHub Actions or admin).
// Body: { artifactIdOrSlug, is_authentic, confidence_score, computed_hash?, status, message?, source?, matched_entry? }
router.post('/', verifySecret, async (req, res) => {
  try {
    const {
      artifactIdOrSlug,
      is_authentic,
      confidence_score,
      computed_hash,
      status,
      message,
      source = 'ci',
      matched_entry,
    } = req.body;

    if (!artifactIdOrSlug || typeof is_authentic !== 'boolean' || typeof confidence_score !== 'number') {
      return res.status(400).json({
        ok: false,
        error: 'artifactIdOrSlug, is_authentic, and confidence_score are required.',
      });
    }
    if (!['verified', 'integrity_compromised', 'unknown', 'error'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status.' });
    }

    const certificateId = generateCertificateId();
    const doc = await VerificationResult.create({
      certificateId,
      artifactIdOrSlug: String(artifactIdOrSlug),
      is_authentic,
      confidence_score,
      computed_hash: computed_hash || null,
      status,
      message: message || null,
      source,
      matched_entry: matched_entry || null,
    });

    res.status(201).json({
      ok: true,
      certificateId: doc.certificateId,
      id: doc._id,
      verified_at: doc.verified_at,
    });

    // Dispatch provenance event (non-blocking, after response sent)
    dispatchToOpenClaw(createProvenanceEvent(
      is_authentic ? 'verified' : 'attestation_added',
      { _id: artifactIdOrSlug, title: artifactIdOrSlug },
      {
        chainOfCustody: [],
        attestations: matched_entry ? [matched_entry] : [],
        verificationStatus: status,
      },
      { certificateId: doc.certificateId, confidence_score, source }
    )).catch(err => console.warn('[verification] dispatchProvenanceEvent failed:', err?.message || err));
  } catch (err) {
    console.error('Verification store error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/verification/certificate/:certificateId
router.get('/certificate/:certificateId', async (req, res) => {
  try {
    const doc = await VerificationResult.findOne({ certificateId: req.params.certificateId });
    if (!doc) {
      return res.status(404).json({ ok: false, error: 'Certificate not found.' });
    }
    res.json({
      ok: true,
      verification: {
        certificateId: doc.certificateId,
        artifactIdOrSlug: doc.artifactIdOrSlug,
        is_authentic: doc.is_authentic,
        confidence_score: doc.confidence_score,
        status: doc.status,
        message: doc.message,
        verified_at: doc.verified_at,
      },
    });
  } catch (err) {
    console.error('Verification get error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/verification/artifact/:idOrSlug — latest verification for this item (for badge).
router.get('/artifact/:idOrSlug', async (req, res) => {
  try {
    const idOrSlug = req.params.idOrSlug;
    const doc = await VerificationResult.findOne({ artifactIdOrSlug: idOrSlug })
      .sort({ verified_at: -1 })
      .lean();

    if (!doc) {
      return res.json({
        ok: true,
        verification: null,
        message: 'No verification record for this artifact.',
      });
    }

    res.json({
      ok: true,
      verification: {
        certificateId: doc.certificateId,
        is_authentic: doc.is_authentic,
        confidence_score: doc.confidence_score,
        status: doc.status,
        message: doc.message,
        verified_at: doc.verified_at,
        computed_hash: doc.computed_hash || null,
      },
    });
  } catch (err) {
    console.error('Verification artifact get error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
