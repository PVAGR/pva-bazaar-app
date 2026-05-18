const crypto = require('crypto');
const express = require('express');
const RecoverySnapshot = require('../models/RecoverySnapshot');
const { authMiddleware } = require('../middleware/auth');
const ipfsService = require('../service/ipfs');

const router = express.Router();

const MAX_PAYLOAD_BYTES = 850 * 1024; // stays below API JSON body limit with metadata overhead
const MAX_SNAPSHOTS_PER_USER = 40;

function clampString(value, maxLen) {
  return String(value || '').trim().slice(0, maxLen);
}

function isBase64Like(value) {
  return typeof value === 'string' && /^[A-Za-z0-9+/=_-]+$/.test(value) && value.length > 0;
}

function estimateB64DecodedBytes(value) {
  if (!value) return 0;
  const sanitized = String(value).replace(/=+$/, '');
  return Math.floor((sanitized.length * 3) / 4);
}

function buildSummary(doc) {
  return {
    id: doc._id,
    label: doc.label,
    payloadSizeBytes: doc.payloadSizeBytes,
    encryption: {
      version: doc.encryption?.version || 'hk-recovery-v1',
      algorithm: doc.encryption?.algorithm || 'AES-GCM',
      kdf: doc.encryption?.kdf || 'PBKDF2-SHA256',
      iterations: doc.encryption?.iterations || 250000,
      plaintextSha256: doc.encryption?.plaintextSha256 || '',
      ciphertextSha256: doc.encryption?.ciphertextSha256 || '',
    },
    manifest: doc.manifest || {},
    device: doc.device || {},
    ipfs: doc.ipfs || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

router.get('/snapshots', authMiddleware, async (req, res) => {
  try {
    const items = await RecoverySnapshot.find({ ownerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(MAX_SNAPSHOTS_PER_USER);

    return res.json({
      ok: true,
      count: items.length,
      items: items.map(buildSummary),
    });
  } catch (error) {
    console.error('Recovery list error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to load recovery snapshots' });
  }
});

router.post('/snapshots', authMiddleware, async (req, res) => {
  try {
    const label = clampString(req.body?.label || 'Untitled snapshot', 140);
    const payload = req.body?.payload || {};
    const manifest = req.body?.manifest && typeof req.body.manifest === 'object' ? req.body.manifest : {};
    const device = req.body?.device && typeof req.body.device === 'object' ? req.body.device : {};
    const pinToIpfs = Boolean(req.body?.pinToIpfs);

    const version = clampString(payload.version || 'hk-recovery-v1', 40);
    const algorithm = clampString(payload.algorithm || 'AES-GCM', 40);
    const kdf = clampString(payload.kdf || 'PBKDF2-SHA256', 60);
    const iterations = Number(payload.iterations || 250000);
    const saltB64 = clampString(payload.saltB64, 400);
    const ivB64 = clampString(payload.ivB64, 400);
    const ciphertextB64 = String(payload.ciphertextB64 || '').trim();
    const plaintextSha256 = clampString(payload.plaintextSha256, 128);
    const ciphertextSha256 = clampString(payload.ciphertextSha256, 128);

    if (!saltB64 || !ivB64 || !ciphertextB64) {
      return res.status(400).json({ ok: false, error: 'Encrypted payload fields are required' });
    }
    if (!isBase64Like(saltB64) || !isBase64Like(ivB64) || !isBase64Like(ciphertextB64)) {
      return res.status(400).json({ ok: false, error: 'Encrypted payload must be base64 strings' });
    }
    if (!Number.isFinite(iterations) || iterations < 100000 || iterations > 1000000) {
      return res.status(400).json({ ok: false, error: 'PBKDF2 iterations must be between 100000 and 1000000' });
    }

    const payloadSizeBytes = estimateB64DecodedBytes(ciphertextB64);
    if (payloadSizeBytes <= 0 || payloadSizeBytes > MAX_PAYLOAD_BYTES) {
      return res.status(413).json({
        ok: false,
        error: `Encrypted snapshot too large. Max size is ${MAX_PAYLOAD_BYTES} bytes`,
      });
    }

    const existingCount = await RecoverySnapshot.countDocuments({ ownerId: req.user.id });
    if (existingCount >= MAX_SNAPSHOTS_PER_USER) {
      return res.status(409).json({
        ok: false,
        error: `Snapshot limit reached (${MAX_SNAPSHOTS_PER_USER}). Delete older snapshots first.`,
      });
    }

    const computedCipherHash = crypto.createHash('sha256').update(ciphertextB64).digest('hex');

    const doc = new RecoverySnapshot({
      ownerId: req.user.id,
      label,
      manifest,
      device: {
        type: clampString(device.type || 'unknown', 40),
        platform: clampString(device.platform, 120),
        userAgent: clampString(device.userAgent, 600),
        timezone: clampString(device.timezone, 80),
      },
      encryption: {
        version,
        algorithm,
        kdf,
        iterations,
        saltB64,
        ivB64,
        ciphertextB64,
        plaintextSha256,
        ciphertextSha256: ciphertextSha256 || computedCipherHash,
      },
      payloadSizeBytes,
    });

    if (pinToIpfs) {
      try {
        const pinned = await ipfsService.uploadJSON(
          {
            type: 'pva-recovery-snapshot',
            version,
            createdAt: new Date().toISOString(),
            payload: {
              algorithm,
              kdf,
              iterations,
              saltB64,
              ivB64,
              ciphertextB64,
              plaintextSha256,
              ciphertextSha256: ciphertextSha256 || computedCipherHash,
            },
            manifest,
            device: doc.device,
          },
          `recovery-snapshot-${String(req.user.id)}-${Date.now()}`,
        );

        doc.ipfs = {
          cid: pinned.hash,
          gatewayUrl: pinned.url,
          pinnedAt: new Date(),
        };
      } catch (pinError) {
        console.warn('Recovery snapshot IPFS pin skipped:', pinError?.message || pinError);
      }
    }

    await doc.save();

    return res.status(201).json({
      ok: true,
      item: buildSummary(doc),
    });
  } catch (error) {
    console.error('Recovery create error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to save recovery snapshot' });
  }
});

router.get('/snapshots/:id', authMiddleware, async (req, res) => {
  try {
    const item = await RecoverySnapshot.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
    });

    if (!item) {
      return res.status(404).json({ ok: false, error: 'Recovery snapshot not found' });
    }

    return res.json({
      ok: true,
      item: {
        ...buildSummary(item),
        payload: {
          version: item.encryption.version,
          algorithm: item.encryption.algorithm,
          kdf: item.encryption.kdf,
          iterations: item.encryption.iterations,
          saltB64: item.encryption.saltB64,
          ivB64: item.encryption.ivB64,
          ciphertextB64: item.encryption.ciphertextB64,
          plaintextSha256: item.encryption.plaintextSha256 || '',
          ciphertextSha256: item.encryption.ciphertextSha256 || '',
        },
      },
    });
  } catch (error) {
    console.error('Recovery get error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch recovery snapshot' });
  }
});

router.delete('/snapshots/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await RecoverySnapshot.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user.id,
    });
    if (!deleted) {
      return res.status(404).json({ ok: false, error: 'Recovery snapshot not found' });
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error('Recovery delete error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to delete recovery snapshot' });
  }
});

module.exports = router;
