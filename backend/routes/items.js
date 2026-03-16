// backend/routes/items.js
const express = require('express');
const router = express.Router();
const Artifact = require('../models/Artifact');
const SharePurchase = require('../models/SharePurchase');
const ProvenanceReviewLog = require('../models/ProvenanceReviewLog');
const User = require('../models/User');
const stripe = require('../lib/stripeClient');
const { sendConsignmentEmail, sendAdminNotification } = require('../service/emailService');
const { normalizeItemInput, toPublicItem } = require('../lib/itemNormalize');
const { encodeCursor, decodeCursor } = require('../lib/cursor');
const { authMiddleware } = require('../middleware/auth');
const adminSession = require('../middleware/adminSession');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createArtifactEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');
const { verifyOnChain } = require('../utils/blockchain');
const {
  normalizeSyndicationInput,
  dispatchSyndication,
} = require('../service/marketplaceSyndicationService');
const {
  buildProvenanceRecord,
  buildArtifactProvenance,
  findDuplicateCandidates,
} = require('../service/provenanceService');
const {
  lookupReverseImageSignals,
  shouldBlockOnReverseImage,
  buildReverseImageSnapshot,
} = require('../service/reverseImageLookupService');

function hasAdminAccess(req) {
  const adminCode = req.headers['x-admin-code'];
  if (adminCode && adminCode === process.env.ADMIN_SECRET_CODE) {
    return true;
  }

  const cookieToken = req.cookies && req.cookies.admin_token;
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
      if (decoded && decoded.role === 'admin') return true;
    } catch (_) {
    }
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (bearerToken) {
    try {
      const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
      if (decoded && decoded.role === 'admin') return true;
    } catch (_) {
    }
  }

  return false;
}

function hasRegistrarSyncAccess(req) {
  const inbound = String(req.headers['x-registrar-sync-secret'] || '').trim();
  const expected = String(process.env.REGISTRAR_SYNC_SECRET || '').trim();
  return Boolean(expected) && inbound && inbound === expected;
}

function canManageArtifact(req, artifact) {
  if (!artifact) return false;
  if (hasAdminAccess(req)) return true;
  if (!req.user?.id) return false;
  return String(artifact.creator) === String(req.user.id);
}

function signFeedPayload(payload) {
  const key = String(process.env.PROVENANCE_FEED_SIGNING_KEY || process.env.JWT_SECRET || '');
  if (!key) return '';
  return crypto.createHmac('sha256', key).update(JSON.stringify(payload)).digest('hex');
}

function buildProvenanceFeedPayload(doc) {
  return {
    itemId: String(doc._id),
    slug: doc.slug || '',
    title: doc.title || doc.name || '',
    category: doc.category || '',
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    provenance: {
      uniqueCode: doc?.provenance?.uniqueCode || '',
      imageHash: doc?.provenance?.imageHash || '',
      metadataHash: doc?.provenance?.metadataHash || '',
      combinedHash: doc?.provenance?.combinedHash || '',
      verificationStatus: doc?.provenance?.verificationStatus || '',
      classification: doc?.provenance?.classification || '',
      era: doc?.provenance?.era || '',
      authenticityScore: Number(doc?.provenance?.authenticityScore || 0),
      royalty: {
        bps: Number(doc?.provenance?.royalty?.bps || 0),
        percent: Number(doc?.provenance?.royalty?.percent || 0),
        beneficiaryType: doc?.provenance?.royalty?.beneficiaryType || '',
        beneficiaryWallet: doc?.provenance?.royalty?.beneficiaryWallet || '',
      },
      chain: {
        network: doc?.provenance?.chain?.network || doc?.blockchainDetails?.network || '',
        contractAddress: doc?.provenance?.chain?.contractAddress || doc?.blockchainDetails?.contractAddress || '',
        tokenStandard: doc?.provenance?.chain?.tokenStandard || doc?.blockchainDetails?.tokenStandard || '',
        tokenId: doc?.provenance?.chain?.tokenId || doc?.blockchainDetails?.tokenId || '',
      },
      ownershipTimeline: Array.isArray(doc?.provenance?.ownershipTimeline) ? doc.provenance.ownershipTimeline : [],
      documentation: doc?.provenance?.documentation || {},
    },
    issuedAt: new Date().toISOString(),
    version: 1,
  };
}

function safeCompare(a, b) {
  const left = String(a || '').trim().toLowerCase();
  const right = String(b || '').trim().toLowerCase();
  if (!left || !right) return null;
  return left === right;
}

function verifyFeedSignature(payload, signature) {
  const expected = signFeedPayload(payload);
  if (!signature || !expected) {
    return {
      expected,
      valid: false,
    };
  }
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(String(signature), 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) {
    return {
      expected,
      valid: false,
    };
  }
  return {
    expected,
    valid: crypto.timingSafeEqual(expectedBuffer, providedBuffer),
  };
}

async function getLiveOnChainState({ contractAddress, tokenId }) {
  const normalizedContract = String(contractAddress || '').trim();
  const normalizedTokenId = String(tokenId || '').trim();
  if (!normalizedContract || !normalizedTokenId) {
    return {
      available: false,
      verified: false,
      reason: 'Missing contract address or token id',
    };
  }

  try {
    const chainState = await verifyOnChain(normalizedContract, normalizedTokenId);
    return {
      available: true,
      verified: Boolean(chainState?.verified),
      currentOwner: chainState?.currentOwner || '',
      tokenURI: chainState?.tokenURI || '',
      checkedAt: chainState?.timestamp || new Date().toISOString(),
    };
  } catch (err) {
    return {
      available: false,
      verified: false,
      reason: err?.message || 'On-chain verification failed',
    };
  }
}

// GET /api/items
router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 12, 50));
    const { cursor, category, tag, q, sort = 'new', includeDrafts } = req.query;
    const isAdmin = hasAdminAccess(req);
    const filter = {};
    if (!isAdmin || includeDrafts !== 'true') {
      filter.status = 'published';
    }
    if (category) filter.category = String(category);
    if (tag) filter.tags = tag;
    // Search
    if (q) {
      filter.$text = { $search: q };
    }
    // Cursor-based pagination
    let cursorQuery = {};
    if (cursor) {
      const c = decodeCursor(cursor);
      if (c && c.createdAt && c.id) {
        if (sort === 'new') {
          cursorQuery = {
            $or: [
              { createdAt: { $lt: new Date(c.createdAt) } },
              { createdAt: new Date(c.createdAt), _id: { $lt: mongoose.Types.ObjectId(c.id) } },
            ],
          };
        } else {
          cursorQuery = {
            $or: [
              { createdAt: { $gt: new Date(c.createdAt) } },
              { createdAt: new Date(c.createdAt), _id: { $gt: mongoose.Types.ObjectId(c.id) } },
            ],
          };
        }
      }
    }
    const sortOrder = sort === 'old' ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };
    const query = Artifact.find({ ...filter, ...cursorQuery })
      .sort(sortOrder)
      .limit(limit + 1);
    const docs = await query.exec();
    const items = docs.slice(0, limit).map(toPublicItem);
    let nextCursor = null;
    if (docs.length > limit) {
      const last = docs[limit - 1];
      nextCursor = encodeCursor({ createdAt: last.createdAt, id: last._id });
    }
    res.json({ ok: true, items, nextCursor });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/items/:slugOrId
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const docs = await Artifact.find({ creator: req.user.id })
      .sort({ createdAt: -1, _id: -1 })
      .limit(200)
      .exec();

    res.json({
      ok: true,
      items: docs.map(toPublicItem),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/items/provenance/check - preflight duplicate check before mint/listing
router.post('/provenance/check', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      name,
      description,
      price,
      category,
      materials,
      images,
      imageUrls,
      artisan,
      network,
      royaltyBps,
      royaltyWallet,
    } = req.body || {};

    const imageList = Array.isArray(imageUrls) ? imageUrls : Array.isArray(images) ? images : [];
    const payload = {
      title: title || name,
      name: name || title,
      description,
      price: Number(price || 0),
      category,
      materials: Array.isArray(materials) ? materials : [],
      imageUrls: imageList,
      artisan,
      creator: req.user.id,
      network,
      royaltyBps,
      royaltyWallet,
    };

    const candidate = buildArtifactProvenance(payload);
    const duplicates = await findDuplicateCandidates(Artifact, {
      combinedHash: candidate.combinedHash,
      imageHash: candidate.imageHash,
      metadataHash: candidate.metadataHash,
    });
    const reverseImage = await lookupReverseImageSignals({
      imageUrls: imageList,
      title: payload.title,
      category: payload.category,
    });

    return res.json({
      ok: true,
      candidate,
      duplicates,
      reverseImage,
      isDuplicateLikely: duplicates.some((row) => row.matchType === 'exact') || Boolean(reverseImage?.likelyDuplicate),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/items/syndication/retry-bulk - admin bulk retry for failed/manual jobs
router.post('/syndication/retry-bulk', async (req, res) => {
  if (!hasAdminAccess(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const requestedChannels = Array.isArray(req.body?.channels)
      ? req.body.channels.filter((channel) => typeof channel === 'string')
      : [];
    const limit = Math.max(1, Math.min(Number(req.body?.limit) || 50, 200));

    const candidates = await Artifact.find({
      'syndication.jobs.status': { $in: ['failed', 'manual_required'] },
    })
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .limit(limit)
      .exec();

    const results = [];
    for (const artifact of candidates) {
      const fallbackChannels = (artifact?.syndication?.jobs || [])
        .filter((job) => ['failed', 'manual_required'].includes(job.status))
        .map((job) => job.channel);
      const channels = requestedChannels.length > 0 ? requestedChannels : fallbackChannels;
      if (!channels.length) continue;

      const syndicationResult = await dispatchSyndication({
        artifact,
        user: null,
        requestedChannels: channels,
      });
      artifact.syndication = {
        requestedChannels: syndicationResult.requestedChannels,
        jobs: syndicationResult.jobs,
        lastDispatchAt: new Date(),
      };
      await artifact.save();

      results.push({
        itemId: String(artifact._id),
        itemSlug: artifact.slug || '',
        itemTitle: artifact.title || artifact.name || 'Untitled',
        summary: syndicationResult.summary,
      });
    }

    const aggregate = results.reduce(
      (acc, row) => {
        acc.items += 1;
        acc.success += Number(row.summary?.success || 0);
        acc.failed += Number(row.summary?.failed || 0);
        acc.skipped += Number(row.summary?.skipped || 0);
        acc.manualRequired += Number(row.summary?.manualRequired || 0);
        return acc;
      },
      { items: 0, success: 0, failed: 0, skipped: 0, manualRequired: 0 },
    );

    return res.json({
      ok: true,
      aggregate,
      results,
      message: `Processed ${aggregate.items} listings for syndication retry`,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to run bulk syndication retry',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// POST /api/items/provenance/sync-mint - registrar service webhook
router.post('/provenance/sync-mint', async (req, res) => {
  try {
    if (!hasRegistrarSyncAccess(req) && !hasAdminAccess(req)) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const {
      itemIdOrSlug,
      contractAddress,
      tokenId,
      network,
      tokenStandard,
      txHash,
      metadataUri,
      ownerWallet,
    } = req.body || {};

    if (!itemIdOrSlug) {
      return res.status(400).json({ ok: false, error: 'itemIdOrSlug is required' });
    }
    if (!contractAddress || tokenId == null) {
      return res.status(400).json({ ok: false, error: 'contractAddress and tokenId are required' });
    }

    let artifact = null;
    if (mongoose.Types.ObjectId.isValid(String(itemIdOrSlug))) {
      artifact = await Artifact.findById(String(itemIdOrSlug));
    }
    if (!artifact) {
      artifact = await Artifact.findOne({ slug: String(itemIdOrSlug) });
    }
    if (!artifact) {
      return res.status(404).json({ ok: false, error: 'Item not found' });
    }

    artifact.blockchainDetails = artifact.blockchainDetails || {};
    artifact.provenance = artifact.provenance || {};
    artifact.provenance.chain = artifact.provenance.chain || {};

    artifact.blockchainDetails.network = String(network || artifact.blockchainDetails.network || 'base');
    artifact.blockchainDetails.contractAddress = String(contractAddress || artifact.blockchainDetails.contractAddress || '');
    artifact.blockchainDetails.tokenStandard = String(tokenStandard || artifact.blockchainDetails.tokenStandard || 'ERC-721');
    artifact.blockchainDetails.tokenId = String(tokenId);

    artifact.provenance.chain.network = String(network || artifact.provenance.chain.network || artifact.blockchainDetails.network || 'base');
    artifact.provenance.chain.contractAddress = String(contractAddress || artifact.provenance.chain.contractAddress || artifact.blockchainDetails.contractAddress || '');
    artifact.provenance.chain.tokenStandard = String(tokenStandard || artifact.provenance.chain.tokenStandard || artifact.blockchainDetails.tokenStandard || 'ERC-721');
    artifact.provenance.chain.tokenId = String(tokenId);

    if (metadataUri) {
      artifact.provenance.documentation = {
        ...(artifact.provenance.documentation || {}),
        metadataUri: String(metadataUri),
      };
    }

    if (txHash) {
      const timeline = Array.isArray(artifact.provenance.ownershipTimeline)
        ? artifact.provenance.ownershipTimeline
        : [];
      const hasTx = timeline.some((entry) => String(entry?.txHash || '').toLowerCase() === String(txHash).toLowerCase());
      if (!hasTx) {
        timeline.push({
          ownerType: 'owner',
          ownerRef: String(ownerWallet || ''),
          ownerWallet: String(ownerWallet || ''),
          acquiredAt: new Date(),
          transferType: 'minted-onchain',
          txHash: String(txHash),
          platform: 'pva-registrar',
        });
      }
      artifact.provenance.ownershipTimeline = timeline;
    }

    await artifact.save();

    return res.json({
      ok: true,
      itemId: String(artifact._id),
      slug: artifact.slug || '',
      chain: {
        network: artifact.provenance?.chain?.network || '',
        contractAddress: artifact.provenance?.chain?.contractAddress || '',
        tokenStandard: artifact.provenance?.chain?.tokenStandard || '',
        tokenId: artifact.provenance?.chain?.tokenId || '',
      },
      message: 'On-chain provenance synced',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/items/:slugOrId
router.get('/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const isAdmin = hasAdminAccess(req);
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      doc = await Artifact.findById(slugOrId);
    }
    if (!doc) {
      doc = await Artifact.findOne({ slug: slugOrId });
    }
    if (!doc || (!isAdmin && doc.status !== 'published')) {
      return res.status(404).json({ ok: false, error: 'Item not found' });
    }
    res.json({ ok: true, item: toPublicItem(doc) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/items/:slugOrId/provenance-feed - public signed provenance payload
router.get('/:slugOrId/provenance-feed', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const isAdmin = hasAdminAccess(req);
    let doc = null;

    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      doc = await Artifact.findById(slugOrId).lean();
    }
    if (!doc) {
      doc = await Artifact.findOne({ slug: slugOrId }).lean();
    }

    if (!doc || (!isAdmin && doc.status !== 'published')) {
      return res.status(404).json({ ok: false, error: 'Item not found' });
    }

    const payload = buildProvenanceFeedPayload(doc);

    const signature = signFeedPayload(payload);
    return res.json({
      ok: true,
      payload,
      signature,
      algorithm: signature ? 'HMAC-SHA256' : 'none',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/items/:slugOrId/provenance/verify - validates signed payload and chain binding fields
router.get('/:slugOrId/provenance/verify', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const liveParam = String(req.query.live || 'true').toLowerCase();
    const includeLiveOnChain = liveParam !== 'false' && liveParam !== '0' && liveParam !== 'no';
    const isAdmin = hasAdminAccess(req);
    let doc = null;

    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      doc = await Artifact.findById(slugOrId).lean();
    }
    if (!doc) {
      doc = await Artifact.findOne({ slug: slugOrId }).lean();
    }

    if (!doc || (!isAdmin && doc.status !== 'published')) {
      return res.status(404).json({ ok: false, error: 'Item not found' });
    }

    const payload = buildProvenanceFeedPayload(doc);
    const signature = signFeedPayload(payload);
    const signatureCheck = verifyFeedSignature(payload, signature);
    const chain = payload?.provenance?.chain || {};
    const docChain = doc?.provenance?.chain || {};
    const blockchainDetails = doc?.blockchainDetails || {};
    const hasOnChainBinding = Boolean(chain.network && chain.contractAddress && chain.tokenId);

    const compareNetwork = safeCompare(docChain.network || chain.network, blockchainDetails.network);
    const compareAddress = safeCompare(docChain.contractAddress || chain.contractAddress, blockchainDetails.contractAddress);
    const compareTokenId = safeCompare(docChain.tokenId || chain.tokenId, blockchainDetails.tokenId);
    const liveOnChain = includeLiveOnChain
      ? await getLiveOnChainState({
          contractAddress: chain.contractAddress,
          tokenId: chain.tokenId,
        })
      : {
          available: false,
          verified: false,
          reason: 'Live on-chain check skipped by request',
        };

    const consistencyChecks = [compareNetwork, compareAddress, compareTokenId].filter((v) => v !== null);
    const blockchainConsistent = consistencyChecks.length > 0
      ? consistencyChecks.every(Boolean)
      : true;

    const timeline = Array.isArray(payload?.provenance?.ownershipTimeline)
      ? payload.provenance.ownershipTimeline
      : [];
    const latestTimelineOwner = timeline.length > 0
      ? String(timeline[timeline.length - 1]?.ownerWallet || '').toLowerCase()
      : '';
    const liveOwner = String(liveOnChain?.currentOwner || '').toLowerCase();
    const ownerMatchesTimeline = Boolean(latestTimelineOwner && liveOwner)
      ? latestTimelineOwner === liveOwner
      : null;

    const isFullyVerified = Boolean(
      signatureCheck.valid
      && hasOnChainBinding
      && blockchainConsistent
      && (!includeLiveOnChain || (liveOnChain.available && liveOnChain.verified)),
    );

    const verification = {
      verdict: isFullyVerified ? 'verified' : 'partial',
      feedSigned: Boolean(signature),
      signatureValid: Boolean(signatureCheck.valid),
      algorithm: signature ? 'HMAC-SHA256' : 'none',
      provenanceStatus: payload?.provenance?.verificationStatus || 'unknown',
      chain: {
        network: chain.network || '',
        contractAddress: chain.contractAddress || '',
        tokenStandard: chain.tokenStandard || '',
        tokenId: chain.tokenId || '',
        hasOnChainBinding,
        blockchainConsistent,
      },
      ownershipEvents: timeline.length,
      ownerMatchesTimeline,
      onChain: {
        mode: includeLiveOnChain ? 'live' : 'skipped',
        available: Boolean(liveOnChain.available),
        verified: Boolean(liveOnChain.verified),
        currentOwner: liveOnChain.currentOwner || '',
        tokenURI: liveOnChain.tokenURI || '',
        checkedAt: liveOnChain.checkedAt || null,
        reason: liveOnChain.reason || '',
      },
      verifiedAt: new Date().toISOString(),
    };

    return res.json({
      ok: true,
      itemId: String(doc._id),
      slug: doc.slug || '',
      verification,
      payload,
      signature,
      expectedSignature: signatureCheck.expected,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/items/register - User-facing item registration
// Requires authentication via JWT token
router.post('/register', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      name,
      description,
      price,
      category,
      condition,
      materials,
      images,
      imageUrls,
      brand,
      measurements,
      syndication,
    } = req.body;

    // Validation
    if (!title && !name) {
      return res.status(400).json({ ok: false, error: 'Title or name is required' });
    }
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'Description is required' });
    }
    if (!price || isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ ok: false, error: 'Valid price greater than 0 is required' });
    }
    if (!category || category.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'Category is required' });
    }

    // Sanitize inputs (basic XSS prevention)
    const sanitize = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    };

    // Guard rails for payload size/shape to avoid hitting body limits with inline images.
    const submittedImages = Array.isArray(imageUrls) ? imageUrls : (Array.isArray(images) ? images : []);
    if (submittedImages.length > 6) {
      return res.status(400).json({ ok: false, error: 'Maximum 6 images allowed' });
    }
    if (submittedImages.some(img => typeof img === 'string' && img.length > 350000)) {
      return res.status(400).json({ ok: false, error: 'One or more images are too large. Please upload smaller files.' });
    }

    const user = await User.findById(req.user.id).select('name email');
    const requestedSyndication = normalizeSyndicationInput(syndication);

    // Prepare artifact data
    const artifactData = {
      name: sanitize(name || title),
      title: sanitize(title || name),
      description: sanitize(description),
      price: Number(price),
      category: sanitize(category),
      imageUrls: submittedImages,
      materials: Array.isArray(materials) ? materials : [],
      artisan: sanitize(brand || user?.name || 'User'),
      creator: req.user.id, // Set creator from authenticated user
      status: 'draft', // Start as draft, admin approves before publishing
      tags: condition ? [condition] : [],
    };

    artifactData.provenance = buildProvenanceRecord({
      title: artifactData.title,
      name: artifactData.name,
      description: artifactData.description,
      price: artifactData.price,
      category: artifactData.category,
      materials: artifactData.materials,
      imageUrls: artifactData.imageUrls,
      artisan: artifactData.artisan,
      creator: req.user.id,
      network: 'base',
      royaltyBps: Number(req.body?.royaltyBps || 1000),
      royaltyWallet: req.body?.royaltyWallet || '',
      artisanWallet: req.body?.artisanWallet || '',
    });

    const duplicates = await findDuplicateCandidates(Artifact, artifactData.provenance, 1);
    if (duplicates.some((row) => row.matchType === 'exact')) {
      return res.status(409).json({
        ok: false,
        error: 'Duplicate artifact fingerprint detected',
        duplicates,
      });
    }

    const reverseImage = await lookupReverseImageSignals({
      imageUrls: artifactData.imageUrls,
      title: artifactData.title,
      category: artifactData.category,
    });
    if (shouldBlockOnReverseImage(reverseImage)) {
      return res.status(409).json({
        ok: false,
        error: 'Reverse image lookup detected a likely duplicate',
        reverseImage,
      });
    }

    artifactData.provenance = {
      ...(artifactData.provenance || {}),
      reverseImage: buildReverseImageSnapshot(reverseImage),
    };

    // Add optional fields if provided
    if (measurements) {
      artifactData.description += `\n\nMeasurements: ${sanitize(measurements)}`;
    }

    // Initialize consignment status
    artifactData.consignment = {
      artisanShare: 50,
      pvaFee: 35,
      promoterShare: 15,
      agreed: false,
    };

    artifactData.syndication = {
      requestedChannels: requestedSyndication.requestedChannels,
      jobs: requestedSyndication.requestedChannels.map((channel) => ({
        channel,
        status: 'queued',
        message: 'Queued for dispatch',
        attemptedAt: new Date(),
      })),
      lastDispatchAt: requestedSyndication.hasAny ? new Date() : undefined,
    };

    // Create artifact
    const artifact = new Artifact(artifactData);
    await artifact.save();

    artifact.provenance = {
      ...(artifact.provenance || {}),
      feedPath: `/marketplace/${encodeURIComponent(artifact.slug || String(artifact._id))}`,
    };
    await artifact.save();

    let syndicationResult = null;
    if (requestedSyndication.hasAny) {
      syndicationResult = await dispatchSyndication({
        artifact,
        user,
        requestedChannels: requestedSyndication.requestedChannels,
      });
      artifact.syndication = {
        requestedChannels: syndicationResult.requestedChannels,
        jobs: syndicationResult.jobs,
        lastDispatchAt: new Date(),
      };
      await artifact.save();
    }

    // Send confirmation email to user (non-blocking)
    try {
      if (user && user.email) {
        // Send confirmation to user
        await sendConsignmentEmail({
          to: user.email,
          subject: 'Item Registration Confirmation',
          itemData: artifact,
          status: 'pending_review',
        });

        // Send admin notification (optional, won't fail if it errors)
        try {
          await sendAdminNotification({
            itemData: artifact,
            userEmail: user.email,
          });
        } catch (adminEmailErr) {
          console.warn('Admin notification email failed (non-critical):', adminEmailErr.message);
        }
      }
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
      // Don't fail the request if email fails - email is a nice-to-have, not critical
    }

    res.status(201).json({
      ok: true,
      item: toPublicItem(artifact),
      provenance: artifact.provenance,
      reverseImage,
      syndication: syndicationResult,
      message: 'Item registered successfully. It will be reviewed before publishing.',
    });
  } catch (err) {
    console.error('Item registration error:', err);
    
    // Handle duplicate key errors (e.g., duplicate slug)
    if (err.code === 11000) {
      return res.status(400).json({
        ok: false,
        error: 'An item with this name already exists. Please use a different title.',
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ ok: false, error: `Validation error: ${errors}` });
    }

    res.status(500).json({
      ok: false,
      error: 'Failed to register item',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// POST /api/items/:id/syndication/retry - retry selected channel dispatches for owner/admin
router.post('/:id/syndication/retry', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid item id' });
    }

    const artifact = await Artifact.findById(id);
    if (!artifact) {
      return res.status(404).json({ ok: false, error: 'Item not found' });
    }
    if (!canManageArtifact(req, artifact)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const requestedByBody = Array.isArray(req.body?.channels)
      ? req.body.channels.filter((channel) => typeof channel === 'string')
      : [];
    const channels = requestedByBody.length > 0
      ? requestedByBody
      : Array.isArray(artifact?.syndication?.requestedChannels)
        ? artifact.syndication.requestedChannels
        : [];

    if (!channels.length) {
      return res.status(400).json({ ok: false, error: 'No syndication channels selected for retry' });
    }

    const user = await User.findById(req.user.id).select('name email');
    const syndicationResult = await dispatchSyndication({
      artifact,
      user,
      requestedChannels: channels,
    });

    artifact.syndication = {
      requestedChannels: syndicationResult.requestedChannels,
      jobs: syndicationResult.jobs,
      lastDispatchAt: new Date(),
    };
    await artifact.save();

    res.json({
      ok: true,
      item: toPublicItem(artifact),
      syndication: syndicationResult,
      message: 'Syndication retry completed',
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to retry syndication',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// POST /api/items (admin only)
router.post('/', async (req, res) => {
  const isAdmin = hasAdminAccess(req);
  if (!isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const input = normalizeItemInput(req.body);
    input.provenance = buildProvenanceRecord({
      title: input.title,
      name: input.name,
      description: input.description,
      price: input.price,
      category: input.category,
      materials: input.materials,
      imageUrls: input.imageUrls,
      artisan: input.artisan,
      creator: input.creator,
      network: input?.blockchainDetails?.network || 'base',
      royaltyBps: Number(req.body?.royaltyBps || 1000),
      royaltyWallet: req.body?.royaltyWallet || '',
      artisanWallet: req.body?.artisanWallet || '',
    });

    const duplicates = await findDuplicateCandidates(Artifact, input.provenance, 1);
    if (duplicates.some((row) => row.matchType === 'exact')) {
      return res.status(409).json({
        ok: false,
        error: 'Duplicate artifact fingerprint detected',
        duplicates,
      });
    }

    const reverseImage = await lookupReverseImageSignals({
      imageUrls: input.imageUrls,
      title: input.title,
      category: input.category,
    });
    if (shouldBlockOnReverseImage(reverseImage)) {
      return res.status(409).json({
        ok: false,
        error: 'Reverse image lookup detected a likely duplicate',
        reverseImage,
      });
    }

    input.provenance = {
      ...(input.provenance || {}),
      reverseImage: buildReverseImageSnapshot(reverseImage),
    };

    const artifact = new Artifact(input);
    await artifact.save();

    artifact.provenance = {
      ...(artifact.provenance || {}),
      feedPath: `/marketplace/${encodeURIComponent(artifact.slug || String(artifact._id))}`,
    };
    await artifact.save();

    dispatchToOpenClaw(createArtifactEvent('created', artifact, null, {
      route: 'items',
      actor: 'admin',
    }));

    res.status(201).json({ ok: true, item: toPublicItem(artifact), reverseImage });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/items/:id/provenance/review (admin only)
router.post('/:id/provenance/review', adminSession, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid item id' });
    }

    const nextStatus = String(req.body?.verificationStatus || '').trim().toLowerCase();
    const allowedStatus = ['hash_verified', 'pending', 'flagged'];
    if (!allowedStatus.includes(nextStatus)) {
      return res.status(400).json({ ok: false, error: 'Invalid verificationStatus' });
    }

    const artifact = await Artifact.findById(id);
    if (!artifact) return res.status(404).json({ ok: false, error: 'Item not found' });

    artifact.provenance = artifact.provenance || {};
    const previousStatus = String(artifact.provenance.verificationStatus || 'pending').toLowerCase();
    artifact.provenance.verificationStatus = nextStatus;
    artifact.provenance.review = {
      ...(artifact.provenance.review || {}),
      reviewNotes: String(req.body?.reviewNotes || '').trim(),
      reviewedAt: new Date(),
      reviewedBy: String(req.admin?.email || req.admin?.id || 'admin').trim(),
    };

    await artifact.save();

    await ProvenanceReviewLog.create({
      artifactId: artifact._id,
      previousStatus: ['hash_verified', 'pending', 'flagged'].includes(previousStatus)
        ? previousStatus
        : 'pending',
      nextStatus,
      reviewNotes: artifact.provenance.review.reviewNotes || '',
      actor: {
        id: String(req.admin?.id || ''),
        role: String(req.admin?.role || 'admin'),
        label: String(req.admin?.email || req.admin?.id || 'admin'),
      },
    });

    return res.json({
      ok: true,
      item: toPublicItem(artifact),
      message: 'Provenance review updated',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/items/:id (admin only)
router.put('/:id', async (req, res) => {
  const isAdmin = hasAdminAccess(req);
  if (!isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const { id } = req.params;
    const input = normalizeItemInput(req.body);
    const artifact = await Artifact.findByIdAndUpdate(id, input, { new: true });
    if (!artifact) return res.status(404).json({ ok: false, error: 'Item not found' });

    dispatchToOpenClaw(createArtifactEvent('updated', artifact, null, {
      route: 'items',
      actor: 'admin',
    }));

    res.json({ ok: true, item: toPublicItem(artifact) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// DELETE /api/items/:id (admin only)
router.delete('/:id', async (req, res) => {
  const isAdmin = hasAdminAccess(req);
  if (!isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const { id } = req.params;
    const artifact = await Artifact.findByIdAndDelete(id);
    if (!artifact) return res.status(404).json({ ok: false, error: 'Item not found' });

    dispatchToOpenClaw(createArtifactEvent('deleted', artifact, null, {
      route: 'items',
      actor: 'admin',
    }));

    res.json({ ok: true, item: toPublicItem(artifact) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/items/:id/shares/buy  — create Stripe checkout session for fractional share purchase
router.post('/:id/shares/buy', async (req, res) => {
  try {
    const { id } = req.params;
    const qty = Math.max(1, parseInt(req.body.qty || 1, 10));
    const buyerEmail = String(req.body.buyerEmail || '').trim();

    const artifact = await Artifact.findOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { slug: id }] });
    if (!artifact) return res.status(404).json({ ok: false, error: 'Item not found' });
    if (artifact.status !== 'published') return res.status(403).json({ ok: false, error: 'Item not available' });

    const frac = artifact.fractionalization || {};
    if (!frac.enabled) return res.status(400).json({ ok: false, error: 'Fractional ownership not enabled for this item' });

    const total = Number(frac.totalShares || 0);
    const sold = Number(frac.soldShares || 0);
    const available = total - sold;
    if (available <= 0) return res.status(409).json({ ok: false, error: 'No shares available' });
    if (qty > available) return res.status(409).json({ ok: false, error: `Only ${available} share(s) available` });

    const sharePriceCents = Math.round(Number(frac.sharePrice || 0) * 100);
    if (!sharePriceCents) return res.status(400).json({ ok: false, error: 'Share price not configured' });
    const totalCents = sharePriceCents * qty;
    const currency = String(artifact.currency || 'USD').toLowerCase();

    // Optimistically reserve shares via atomic update (prevents double-selling)
    const updated = await Artifact.findOneAndUpdate(
      {
        _id: artifact._id,
        $expr: { $lte: [{ $add: ['$fractionalization.soldShares', qty] }, '$fractionalization.totalShares'] },
      },
      { $inc: { 'fractionalization.soldShares': qty } },
      { new: true }
    );
    if (!updated) return res.status(409).json({ ok: false, error: 'Shares no longer available — please refresh' });

    const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://pvabazaar.org';

    // Create pending SharePurchase record
    const purchase = await SharePurchase.create({
      artifactId: artifact._id,
      artifactSlug: artifact.slug || '',
      quantity: qty,
      pricePerShareCents: sharePriceCents,
      totalAmountCents: totalCents,
      currency: currency.toUpperCase(),
      buyerEmail,
      paymentStatus: 'pending',
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: buyerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: sharePriceCents,
            product_data: {
              name: `${artifact.title || artifact.name} — ${qty} share(s)`,
              description: `Fractional ownership: ${qty} of ${total} total shares`,
              images: artifact.imageUrls && artifact.imageUrls.length ? [artifact.imageUrls[0]] : undefined,
            },
          },
          quantity: qty,
        },
      ],
      success_url: `${PUBLIC_SITE_URL}/#/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_SITE_URL}/#/marketplace/${artifact.slug || artifact._id}`,
      client_reference_id: purchase._id.toString(),
      metadata: {
        order_type: 'share_purchase',
        share_purchase_id: purchase._id.toString(),
        artifact_id: artifact._id.toString(),
        artifact_slug: artifact.slug || '',
        quantity: String(qty),
      },
    });

    // Attach session ID to purchase record
    purchase.stripeSessionId = session.id;
    purchase.idempotencyKey = `stripe_session:${session.id}`;
    await purchase.save();

    return res.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
      sharePurchaseId: purchase._id.toString(),
      quantity: qty,
      totalAmountCents: totalCents,
      currency: currency.toUpperCase(),
    });
  } catch (err) {
    console.error('[items] share buy error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/items/:id/shares  — public summary of fractional share state
router.get('/:id/shares', async (req, res) => {
  try {
    const { id } = req.params;
    const artifact = await Artifact.findOne(
      { $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { slug: id }] },
      'fractionalization ownershipHistory title name slug status'
    );
    if (!artifact) return res.status(404).json({ ok: false, error: 'Item not found' });
    const frac = artifact.fractionalization || {};
    const total = Number(frac.totalShares || 0);
    const sold = Number(frac.soldShares || 0);
    return res.json({
      ok: true,
      fractionalEnabled: Boolean(frac.enabled),
      totalShares: total,
      soldShares: sold,
      availableShares: Math.max(0, total - sold),
      sharePrice: Number(frac.sharePrice || 0),
      majorityThreshold: Number(frac.majorityThreshold || 0),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
