const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const DigitalProductPassport = require('../models/DigitalProductPassport');
const Artifact = require('../models/Artifact');
const { authMiddleware } = require('../middleware/auth');

function isObjectId(value) {
  return mongoose.isValidObjectId(value);
}

function clampBasisPoints(raw, fallback = 1000) {
  const v = Number(raw);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(10000, Math.round(v)));
}

function parsePositiveInt(raw, fallback, max) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function normalizeDateOrNull(raw) {
  if (!raw) return null;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function projectFilteredEvents(events, { type, from, to }) {
  const typeFilter = String(type || '').trim().toLowerCase();
  const fromDate = normalizeDateOrNull(from);
  const toDate = normalizeDateOrNull(to);

  return (Array.isArray(events) ? events : []).filter((event) => {
    if (typeFilter && String(event?.type || '').toLowerCase() !== typeFilter) return false;

    const occurredAt = normalizeDateOrNull(event?.occurredAt);
    if (fromDate && (!occurredAt || occurredAt < fromDate)) return false;
    if (toDate && (!occurredAt || occurredAt > toDate)) return false;

    return true;
  });
}

function buildEventStats(events) {
  const byType = {};
  let latest = null;
  for (const event of Array.isArray(events) ? events : []) {
    const type = String(event?.type || 'custom');
    byType[type] = (byType[type] || 0) + 1;
    const dt = normalizeDateOrNull(event?.occurredAt);
    if (dt && (!latest || dt > latest)) latest = dt;
  }

  return {
    total: Array.isArray(events) ? events.length : 0,
    byType,
    latestEventAt: latest ? latest.toISOString() : null,
  };
}

async function findPassportByArtifactKey(key) {
  const clean = String(key || '').trim();
  const filter = {
    $or: [
      { artifactSlug: clean },
      ...(isObjectId(clean) ? [{ artifactId: clean }] : []),
    ],
  };
  return DigitalProductPassport.findOne(filter).lean();
}

function toSafePassport(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    passportDid: doc.passportDid,
    passportVersion: doc.passportVersion,
    passportHash: doc.passportHash,
    assetType: doc.assetType,
    artifactId: doc.artifactId ? String(doc.artifactId) : '',
    artifactSlug: doc.artifactSlug || '',
    productName: doc.productName,
    productCategory: doc.productCategory || '',
    originCountry: doc.originCountry || '',
    originRegion: doc.originRegion || '',
    issuerDid: doc.issuerDid || '',
    ownerDid: doc.ownerDid || '',
    royaltyPolicy: doc.royaltyPolicy || {},
    verifiableCredentials: Array.isArray(doc.verifiableCredentials) ? doc.verifiableCredentials : [],
    lifecycleEvents: Array.isArray(doc.lifecycleEvents) ? doc.lifecycleEvents : [],
    ipfsCid: doc.ipfsCid || '',
    metadataUri: doc.metadataUri || '',
    status: doc.status,
    latestEventAt: doc.latestEventAt || null,
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

// GET /api/dpp/by-artifact/:artifactIdOrSlug
router.get('/by-artifact/:artifactIdOrSlug', async (req, res) => {
  try {
    const doc = await findPassportByArtifactKey(req.params.artifactIdOrSlug);
    if (!doc) return res.status(404).json({ ok: false, error: 'Passport not found for artifact' });
    return res.json({ ok: true, passport: toSafePassport(doc) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/dpp/:passportDid/events
// Returns filtered + paginated lifecycle events without full passport payload.
router.get('/:passportDid/events', async (req, res) => {
  try {
    const passportDid = String(req.params.passportDid || '').trim();
    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 25, 200);
    const type = String(req.query.type || '');
    const from = req.query.from;
    const to = req.query.to;

    const doc = await DigitalProductPassport.findOne({ passportDid }).lean();
    if (!doc) return res.status(404).json({ ok: false, error: 'Passport not found' });

    const filtered = projectFilteredEvents(doc.lifecycleEvents, { type, from, to });
    const sorted = filtered
      .slice()
      .sort((a, b) => new Date(b?.occurredAt || 0).getTime() - new Date(a?.occurredAt || 0).getTime());

    const total = sorted.length;
    const start = (page - 1) * limit;
    const events = sorted.slice(start, start + limit);

    return res.json({
      ok: true,
      passportDid,
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        type: type || '',
        from: from || null,
        to: to || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/dpp/:passportDid/stats
// Returns lightweight event statistics for dashboards.
router.get('/:passportDid/stats', async (req, res) => {
  try {
    const passportDid = String(req.params.passportDid || '').trim();
    const doc = await DigitalProductPassport.findOne({ passportDid }).lean();
    if (!doc) return res.status(404).json({ ok: false, error: 'Passport not found' });

    const stats = buildEventStats(doc.lifecycleEvents);
    return res.json({
      ok: true,
      passportDid,
      stats,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/dpp/by-artifact/:artifactIdOrSlug/events
router.get('/by-artifact/:artifactIdOrSlug/events', async (req, res) => {
  try {
    const doc = await findPassportByArtifactKey(req.params.artifactIdOrSlug);
    if (!doc) return res.status(404).json({ ok: false, error: 'Passport not found for artifact' });

    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 25, 200);
    const type = String(req.query.type || '');
    const from = req.query.from;
    const to = req.query.to;

    const filtered = projectFilteredEvents(doc.lifecycleEvents, { type, from, to });
    const sorted = filtered
      .slice()
      .sort((a, b) => new Date(b?.occurredAt || 0).getTime() - new Date(a?.occurredAt || 0).getTime());

    const total = sorted.length;
    const start = (page - 1) * limit;
    const events = sorted.slice(start, start + limit);

    return res.json({
      ok: true,
      passportDid: doc.passportDid,
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        type: type || '',
        from: from || null,
        to: to || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/dpp/by-artifact/:artifactIdOrSlug/stats
router.get('/by-artifact/:artifactIdOrSlug/stats', async (req, res) => {
  try {
    const doc = await findPassportByArtifactKey(req.params.artifactIdOrSlug);
    if (!doc) return res.status(404).json({ ok: false, error: 'Passport not found for artifact' });

    const stats = buildEventStats(doc.lifecycleEvents);
    return res.json({
      ok: true,
      passportDid: doc.passportDid,
      stats,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/dpp/:passportDid
router.get('/:passportDid', async (req, res) => {
  try {
    const passportDid = String(req.params.passportDid || '').trim();
    const doc = await DigitalProductPassport.findOne({ passportDid }).lean();
    if (!doc) return res.status(404).json({ ok: false, error: 'Passport not found' });
    return res.json({ ok: true, passport: toSafePassport(doc) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/dpp
// Create a DPP record (authenticated creator/admin path)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      artifactId,
      artifactSlug,
      assetType = 'hybrid',
      productName,
      productCategory = '',
      originCountry = '',
      originRegion = '',
      issuerDid = '',
      ownerDid = '',
      ipfsCid = '',
      metadataUri = '',
      royaltyPolicy = {},
      verifiableCredentials = [],
      initialEvent = null,
    } = req.body || {};

    if (!productName || String(productName).trim().length < 2) {
      return res.status(400).json({ ok: false, error: 'productName is required' });
    }

    let artifact = null;
    if (artifactId || artifactSlug) {
      const query = {
        $or: [
          ...(artifactSlug ? [{ slug: String(artifactSlug).trim() }] : []),
          ...(artifactId && isObjectId(artifactId) ? [{ _id: artifactId }] : []),
        ],
      };
      artifact = await Artifact.findOne(query);
      if (!artifact) {
        return res.status(404).json({ ok: false, error: 'Artifact not found' });
      }

      const existing = await DigitalProductPassport.findOne({ artifactId: artifact._id }).lean();
      if (existing) {
        return res.status(409).json({ ok: false, error: 'Passport already exists for this artifact', passportDid: existing.passportDid });
      }
    }

    const policy = {
      basisPoints: clampBasisPoints(royaltyPolicy.basisPoints, 1000),
      payoutCurrency: String(royaltyPolicy.payoutCurrency || 'USD').toUpperCase(),
      payoutRail: ['crypto', 'fiat', 'ussd', 'mixed'].includes(String(royaltyPolicy.payoutRail || '').toLowerCase())
        ? String(royaltyPolicy.payoutRail).toLowerCase()
        : 'mixed',
      split: Array.isArray(royaltyPolicy.split)
        ? royaltyPolicy.split.map((entry) => ({
          recipientDid: String(entry.recipientDid || ''),
          role: String(entry.role || ''),
          basisPoints: clampBasisPoints(entry.basisPoints, 0),
        }))
        : [],
    };

    const lifecycleEvents = [];
    if (initialEvent && typeof initialEvent === 'object') {
      lifecycleEvents.push({
        type: String(initialEvent.type || 'created'),
        actorDid: String(initialEvent.actorDid || issuerDid || ''),
        location: String(initialEvent.location || ''),
        notes: String(initialEvent.notes || ''),
        txHash: String(initialEvent.txHash || ''),
        externalRef: String(initialEvent.externalRef || ''),
        metadata: initialEvent.metadata || {},
        occurredAt: initialEvent.occurredAt ? new Date(initialEvent.occurredAt) : new Date(),
      });
    } else {
      lifecycleEvents.push({
        type: 'created',
        actorDid: String(issuerDid || ''),
        notes: 'Digital Product Passport initialized',
        occurredAt: new Date(),
      });
    }

    const doc = await DigitalProductPassport.create({
      assetType: ['physical', 'digital', 'hybrid'].includes(String(assetType)) ? String(assetType) : 'hybrid',
      artifactId: artifact?._id,
      artifactSlug: artifact?.slug || String(artifactSlug || ''),
      productName: String(productName).trim(),
      productCategory: String(productCategory || ''),
      originCountry: String(originCountry || ''),
      originRegion: String(originRegion || ''),
      issuerDid: String(issuerDid || ''),
      ownerDid: String(ownerDid || ''),
      ipfsCid: String(ipfsCid || ''),
      metadataUri: String(metadataUri || ''),
      royaltyPolicy: policy,
      verifiableCredentials: Array.isArray(verifiableCredentials) ? verifiableCredentials : [],
      lifecycleEvents,
      status: 'active',
    });

    return res.status(201).json({ ok: true, passport: toSafePassport(doc) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/dpp/:passportDid/events
// Append lifecycle events (shipments, transforms, retail sales, etc.)
router.post('/:passportDid/events', authMiddleware, async (req, res) => {
  try {
    const passportDid = String(req.params.passportDid || '').trim();
    const {
      type = 'custom',
      actorDid = '',
      location = '',
      notes = '',
      txHash = '',
      externalRef = '',
      metadata = {},
      occurredAt,
    } = req.body || {};

    const doc = await DigitalProductPassport.findOne({ passportDid });
    if (!doc) return res.status(404).json({ ok: false, error: 'Passport not found' });
    if (doc.status !== 'active') {
      return res.status(409).json({ ok: false, error: `Passport is ${doc.status}` });
    }

    doc.lifecycleEvents.push({
      type: String(type || 'custom'),
      actorDid: String(actorDid || ''),
      location: String(location || ''),
      notes: String(notes || ''),
      txHash: String(txHash || ''),
      externalRef: String(externalRef || ''),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    });
    doc.passportVersion = Number(doc.passportVersion || 1) + 1;
    await doc.save();

    return res.json({ ok: true, passport: toSafePassport(doc) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// PUT /api/dpp/:passportDid/royalty-policy
router.put('/:passportDid/royalty-policy', authMiddleware, async (req, res) => {
  try {
    const passportDid = String(req.params.passportDid || '').trim();
    const doc = await DigitalProductPassport.findOne({ passportDid });
    if (!doc) return res.status(404).json({ ok: false, error: 'Passport not found' });

    const body = req.body || {};
    const nextPolicy = {
      basisPoints: clampBasisPoints(body.basisPoints, doc.royaltyPolicy?.basisPoints || 1000),
      payoutCurrency: String(body.payoutCurrency || doc.royaltyPolicy?.payoutCurrency || 'USD').toUpperCase(),
      payoutRail: ['crypto', 'fiat', 'ussd', 'mixed'].includes(String(body.payoutRail || '').toLowerCase())
        ? String(body.payoutRail).toLowerCase()
        : (doc.royaltyPolicy?.payoutRail || 'mixed'),
      split: Array.isArray(body.split)
        ? body.split.map((entry) => ({
          recipientDid: String(entry.recipientDid || ''),
          role: String(entry.role || ''),
          basisPoints: clampBasisPoints(entry.basisPoints, 0),
        }))
        : (Array.isArray(doc.royaltyPolicy?.split) ? doc.royaltyPolicy.split : []),
    };

    doc.royaltyPolicy = nextPolicy;
    doc.passportVersion = Number(doc.passportVersion || 1) + 1;
    await doc.save();

    return res.json({ ok: true, passport: toSafePassport(doc) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
