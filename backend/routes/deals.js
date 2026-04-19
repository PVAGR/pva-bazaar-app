const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Deal = require('../models/Deal');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const {
  appendDealAuditEvent,
  generatePublicDealId,
  projectPublicDeal,
  projectVerificationSummary,
} = require('../utils/dealVisibility');

let buildDealMessageTypedData;
let buildDealEvidenceTypedData;
let verifyDealSignature;
let normalizeAddress;

try {
  ({
    buildDealMessageTypedData,
    buildDealEvidenceTypedData,
    verifyDealSignature,
    normalizeAddress,
  } = require('../lib/eip712'));
} catch (err) {
  // Keep /api/deals mounted even if optional EIP-712 helpers are unavailable.
  console.warn('⚠️ deals route: eip712 helper unavailable; signature endpoints limited', err?.message || err);
  buildDealMessageTypedData = () => { throw new Error('EIP-712 helpers unavailable'); };
  buildDealEvidenceTypedData = () => { throw new Error('EIP-712 helpers unavailable'); };
  verifyDealSignature = () => { throw new Error('EIP-712 helpers unavailable'); };
  normalizeAddress = (v) => (typeof v === 'string' ? v.toLowerCase() : '');
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  // Strip all HTML tags to prevent injection — simple and ReDoS-safe.
  return str.replace(/<[^>]*>/g, '').trim();
}

function sanitizeDeep(v) {
  if (typeof v === 'string') return sanitize(v);
  if (Array.isArray(v)) return v.map(sanitizeDeep);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = sanitizeDeep(val);
    return out;
  }
  return v;
}

function isObjectIdHex(v) {
  return typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

function sha256Hex(v) {
  return crypto.createHash('sha256').update(String(v)).digest('hex');
}

async function generateUniquePublicId() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = generatePublicDealId();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Deal.exists({ publicId: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Failed to generate public deal id');
}

function buildPublicShareUrl(req, publicId) {
  const origin = req.get('origin') || process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'https://pvabazaar.org';
  return `${String(origin).replace(/\/+$/, '')}/#/deal/${encodeURIComponent(publicId)}`;
}

function nextDealDispatchBackoffMs(attemptCount) {
  const base = Math.max(parseInt(process.env.DEAL_OUTBOUND_RETRY_BASE_MS || '15000', 10), 1000);
  const max = Math.max(parseInt(process.env.DEAL_OUTBOUND_RETRY_MAX_MS || '300000', 10), base);
  const exponential = base * Math.pow(2, Math.max(Number(attemptCount || 1) - 1, 0));
  return Math.min(exponential, max);
}

const DISPUTE_REASON_CODES = {
  release: [
    'BUYER_CONFIRMED_AUTHENTIC',
    'MUTUAL_SETTLEMENT',
    'EVIDENCE_FAVORS_SELLER',
    'ADMIN_OVERRIDE_COMPLIANCE',
  ],
  refund: [
    'COUNTERFEIT_OR_MISREPRESENTED',
    'NON_DELIVERY',
    'MATERIAL_BREACH',
    'EVIDENCE_FAVORS_BUYER',
    'ADMIN_OVERRIDE_COMPLIANCE',
  ],
};

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSplit(input = {}) {
  const creatorPct = clamp(toFiniteNumber(input.creatorPct, 45), 0, 100);
  const shipperPct = clamp(toFiniteNumber(input.shipperPct, 35), 0, 100);
  const platformPct = clamp(toFiniteNumber(input.platformPct, 10), 0, 100);
  const bufferPct = clamp(toFiniteNumber(input.bufferPct, 10), 0, 100);
  const sum = creatorPct + shipperPct + platformPct + bufferPct;
  if (sum <= 0) {
    return { creatorPct: 45, shipperPct: 35, platformPct: 10, bufferPct: 10 };
  }
  const scale = 100 / sum;
  return {
    creatorPct: Number((creatorPct * scale).toFixed(2)),
    shipperPct: Number((shipperPct * scale).toFixed(2)),
    platformPct: Number((platformPct * scale).toFixed(2)),
    bufferPct: Number((bufferPct * scale).toFixed(2)),
  };
}

function buildPvaScoreAndEstimate(input = {}) {
  const productionCost = Math.max(0, toFiniteNumber(input.productionCost, 0));
  const shippingCost = Math.max(0, toFiniteNumber(input.shippingCost, 0));
  const platformFee = Math.max(0, toFiniteNumber(input.platformFee, 0));
  const routeKm = Math.max(0, toFiniteNumber(input.routeKm, 0));
  const estimatedProductionDays = Math.max(0, toFiniteNumber(input.estimatedProductionDays, 7));
  const estimatedTransitDays = Math.max(0, toFiniteNumber(input.estimatedTransitDays, 7));
  const reliability = clamp(toFiniteNumber(input.reliability, 75), 0, 100);
  const consolidation = clamp(toFiniteNumber(input.consolidation, 50), 0, 100);
  const reputation = clamp(toFiniteNumber(input.reputation, 70), 0, 100);

  const totalAmount = Number((productionCost + shippingCost + platformFee).toFixed(2));
  const costScore = clamp(100 - Math.min(100, totalAmount / 20), 0, 100);
  const routeEfficiencyScore = clamp(100 - Math.min(100, routeKm / 150), 0, 100);
  const finalScore = Number((
    costScore * 0.4 +
    reliability * 0.2 +
    routeEfficiencyScore * 0.15 +
    consolidation * 0.15 +
    reputation * 0.1
  ).toFixed(2));

  return {
    totalAmount,
    estimatedDays: Math.round(estimatedProductionDays + estimatedTransitDays),
    routeScore: {
      costScore,
      reliabilityScore: reliability,
      routeEfficiencyScore,
      consolidationScore: consolidation,
      reputationScore: reputation,
      finalScore,
      distanceKm: routeKm,
      estimatedDays: Math.round(estimatedProductionDays + estimatedTransitDays),
    },
  };
}

function normalizePvaCandidate(candidate = {}, fallbackRole = 'creator') {
  return {
    role: fallbackRole,
    userId: sanitize(candidate.userId || ''),
    name: sanitize(candidate.name || ''),
    country: sanitize(candidate.country || ''),
    city: sanitize(candidate.city || ''),
    walletAddress: sanitize(candidate.walletAddress || ''),
    contact: sanitize(candidate.contact || ''),
    productionCost: Math.max(0, toFiniteNumber(candidate.productionCost, 0)),
    shippingCost: Math.max(0, toFiniteNumber(candidate.shippingCost, 0)),
    routeKm: Math.max(0, toFiniteNumber(candidate.routeKm, 0)),
    estimatedProductionDays: Math.max(0, toFiniteNumber(candidate.estimatedProductionDays, 7)),
    estimatedTransitDays: Math.max(0, toFiniteNumber(candidate.estimatedTransitDays, 7)),
    reliability: clamp(toFiniteNumber(candidate.reliability, 75), 0, 100),
    consolidation: clamp(toFiniteNumber(candidate.consolidation, 50), 0, 100),
    reputation: clamp(toFiniteNumber(candidate.reputation, 70), 0, 100),
  };
}

function toPublicDeal(deal) {
  if (!deal) return null;
  const d = deal.toObject ? deal.toObject() : deal;
  // Keep it simple; we can tighten this later when we add counterparty join links.
  if (d?.counterpartyAccess) {
    delete d.counterpartyAccess;
  }
  return d;
}

function toJoinDeal(deal) {
  if (!deal) return null;
  const d = deal.toObject ? deal.toObject() : deal;
  // Never leak invite hashes or internal access state.
  if (d.counterpartyAccess) {
    d.counterpartyAccess = {
      joinedAt: d.counterpartyAccess.joinedAt || null,
    };
  }
  return d;
}

function dealRoleForUser(deal, userId) {
  if (!deal || !userId) return 'none';
  const subjectId = String(userId);
  if (String(deal.ownerId || '') === subjectId) return 'seller';
  if (String(deal.counterparty?.userId || '') === subjectId) return 'buyer';
  if (Array.isArray(deal.pva?.parties)) {
    const pvaParty = deal.pva.parties.find(
      (party) => party?.userId && String(party.userId) === subjectId && ['creator', 'shipper', 'buyer'].includes(String(party.role || ''))
    );
    if (pvaParty?.role === 'creator') return 'creator';
    if (pvaParty?.role === 'shipper') return 'shipper';
    if (pvaParty?.role === 'buyer') return 'buyer';
  }
  if (deal.mediatorId && String(deal.mediatorId) === subjectId) return 'mediator';
  return 'none';
}

function canResolveDispute(req, deal) {
  const role = dealRoleForUser(deal, req.user?.id);
  if (role === 'mediator') return true;
  if (req.user?.role === 'admin') return true;
  return role === 'seller';
}

function isEscrowFinalized(deal) {
  const status = String(deal?.escrow?.status || 'draft');
  return status === 'released' || status === 'refunded';
}

async function resolvePlatformMediatorUser(preferredAdminUserId = '') {
  if (preferredAdminUserId && isObjectIdHex(String(preferredAdminUserId))) {
    const preferred = await User.findOne({ _id: preferredAdminUserId, role: 'admin' }).select('_id role');
    if (preferred) return preferred;
  }
  return User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).select('_id role');
}

async function verifyDealActor(req, deal) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error('No authentication token provided');
    err.status = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const err = new Error('Invalid authentication token');
    err.status = 401;
    throw err;
  }

  // Counterparty invite token (no account required).
  if (decoded?.role === 'deal_counterparty') {
    if (!decoded?.dealId || String(decoded.dealId) !== String(deal._id)) {
      const err = new Error('Invalid deal access token (deal mismatch)');
      err.status = 401;
      throw err;
    }
    const jti = decoded?.jti ? String(decoded.jti) : '';
    const jtiHash = jti ? sha256Hex(jti) : '';
    const stored = deal?.counterpartyAccess?.inviteJtiHash || '';
    const expiresAt = deal?.counterpartyAccess?.inviteExpiresAt ? new Date(deal.counterpartyAccess.inviteExpiresAt) : null;
    const now = Date.now();
    if (!stored || !jtiHash || stored !== jtiHash) {
      const err = new Error('Invalid deal access token');
      err.status = 401;
      throw err;
    }
    if (expiresAt && expiresAt.getTime() < now) {
      const err = new Error('Deal invite has expired');
      err.status = 401;
      throw err;
    }
    // Invite-link callers are the classic counterparty (not yet mapped to PVA "buyer" party).
    return { actor: 'counterparty', decoded };
  }

  // Normal user/admin token (requires id ObjectId).
  const subjectId = decoded?.id ? String(decoded.id) : '';
  if (!subjectId || !isObjectIdHex(subjectId)) {
    const err = new Error('Invalid authentication token (subject)');
    err.status = 401;
    throw err;
  }

  const role = dealRoleForUser(deal, subjectId);
  const isOwner = role === 'seller';
  const isCounterpartyUser = role === 'buyer';
  const isPvaCreator = role === 'creator';
  const isPvaShipper = role === 'shipper';
  const isMediator = deal.mediatorId && String(deal.mediatorId) === subjectId;
  if (!isOwner && !isCounterpartyUser && !isPvaCreator && !isPvaShipper && !isMediator) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  if (isOwner) return { actor: 'seller', decoded };
  if (isCounterpartyUser) return { actor: 'buyer', decoded };
  if (isPvaCreator) return { actor: 'creator', decoded };
  if (isPvaShipper) return { actor: 'shipper', decoded };
  return { actor: 'mediator', decoded };
}

function canSubmitMilestoneEvidence(requiredRole, actor, isAdmin = false) {
  if (isAdmin) return true;
  const required = String(requiredRole || 'any');
  if (required === 'any') return true;
  if (required === 'creator') return actor === 'creator' || actor === 'seller';
  if (required === 'seller') return actor === 'seller';
  if (required === 'shipper') return actor === 'shipper';
  if (required === 'buyer') return actor === 'buyer';
  if (required === 'mediator') return actor === 'mediator';
  return false;
}

function mapUserToPvaCandidate(user, role) {
  const compliance = user?.onboardingProfile?.compliance || {};
  const identity = user?.onboardingProfile?.identity || {};
  const prefs = user?.preferences || {};
  const pathTags = Array.isArray(user?.onboardingProfile?.federationPathTags) ? user.onboardingProfile.federationPathTags : [];
  const journey = String(user?.onboardingProfile?.personalJourney || '').toLowerCase();
  const isShipperTagged = pathTags.some((tag) => /ship|freight|logistic|cargo|courier|transport/i.test(String(tag || '')))
    || /ship|freight|logistic|cargo|courier|transport/.test(journey);
  const reliabilitySeed = user?.onboardingProfile?.compliance?.identityAttested ? 84 : 68;

  return {
    userId: String(user?._id || ''),
    role,
    name: user?.name || '',
    country: compliance.country || prefs.defaultCountry || '',
    city: compliance.city || '',
    walletAddress: identity.generatedWalletAddress || prefs.defaultWalletAddress || '',
    contact: user?.email || '',
    appRole: user?.onboardingProfile?.appRole || 'consumer',
    roleIntent: user?.onboardingProfile?.roleIntent || 'consumer',
    federationPathTags: pathTags,
    reliability: role === 'shipper' && isShipperTagged ? reliabilitySeed + 6 : reliabilitySeed,
    consolidation: role === 'shipper' && isShipperTagged ? 72 : 55,
    reputation: reliabilitySeed,
  };
}

function mapUserToPartySnapshot(user, role) {
  const compliance = user?.onboardingProfile?.compliance || {};
  const identity = user?.onboardingProfile?.identity || {};
  const prefs = user?.preferences || {};
  return {
    role,
    userId: user?._id,
    name: user?.name || '',
    country: compliance.country || prefs.defaultCountry || '',
    city: compliance.city || '',
    walletAddress: identity.generatedWalletAddress || prefs.defaultWalletAddress || '',
  };
}

function getPvaPartyByRole(deal, role) {
  if (!Array.isArray(deal?.pva?.parties)) return null;
  return deal.pva.parties.find((party) => String(party?.role || '') === String(role || '')) || null;
}

function buildPvaPayoutPreview(totalAmount, split = {}, currency = 'USD', escrowStatus = 'draft') {
  const total = Math.max(0, toFiniteNumber(totalAmount, 0));
  const creatorPct = clamp(toFiniteNumber(split.creatorPct, 45), 0, 100);
  const shipperPct = clamp(toFiniteNumber(split.shipperPct, 35), 0, 100);
  const platformPct = clamp(toFiniteNumber(split.platformPct, 10), 0, 100);
  const bufferPct = clamp(toFiniteNumber(split.bufferPct, 10), 0, 100);
  const eligible = ['buyer_confirmed', 'released'].includes(String(escrowStatus || ''));
  const released = String(escrowStatus || '') === 'released';
  const lineStatus = released ? 'released' : eligible ? 'eligible' : 'projected';

  return [
    { role: 'creator', pct: creatorPct, amount: Number(((total * creatorPct) / 100).toFixed(2)), currency, status: lineStatus },
    { role: 'shipper', pct: shipperPct, amount: Number(((total * shipperPct) / 100).toFixed(2)), currency, status: lineStatus },
    { role: 'platform', pct: platformPct, amount: Number(((total * platformPct) / 100).toFixed(2)), currency, status: lineStatus },
    { role: 'buffer', pct: bufferPct, amount: Number(((total * bufferPct) / 100).toFixed(2)), currency, status: lineStatus },
  ];
}

function enqueuePvaNotification(deal, { targetRole = 'system', eventType = 'pva_event', subject = '', message = '', payload = null }) {
  const targetParty = getPvaPartyByRole(deal, targetRole);
  const targetUserId = targetParty?.userId || undefined;
  const entry = {
    targetRole,
    targetUserId,
    channel: 'in_app',
    eventType,
    subject,
    message,
    payload,
    status: 'queued',
    createdAt: new Date(),
  };
  const existing = Array.isArray(deal?.pva?.notificationQueue) ? deal.pva.notificationQueue : [];
  deal.pva = {
    ...(deal.pva || {}),
    notificationQueue: [...existing, entry],
  };
  deal.messages.push({ author: 'system', text: `[PVA Ping] ${targetRole}: ${subject || eventType}` });
}

function applyPvaWorkflowTransition(deal) {
  const creatorAccepted = String(deal?.pva?.roleAcceptance?.creator?.status || 'pending') === 'accepted';
  const shipperAccepted = String(deal?.pva?.roleAcceptance?.shipper?.status || 'pending') === 'accepted';
  const buyerAccepted = String(deal?.pva?.roleAcceptance?.buyer?.status || 'pending') === 'accepted';

  let nextStatus = 'awaiting_creator';
  if (creatorAccepted && !shipperAccepted) nextStatus = 'awaiting_shipper';
  if (creatorAccepted && shipperAccepted && !buyerAccepted) nextStatus = 'awaiting_buyer_confirmation';
  if (creatorAccepted && shipperAccepted && buyerAccepted) nextStatus = 'ready_for_release';

  const previousStatus = String(deal?.pva?.workflow?.status || 'draft');
  deal.pva = {
    ...(deal.pva || {}),
    workflow: {
      ...(deal.pva?.workflow || {}),
      status: nextStatus,
      updatedAt: new Date(),
    },
  };

  if (previousStatus !== nextStatus) {
    if (nextStatus === 'awaiting_shipper') {
      enqueuePvaNotification(deal, {
        targetRole: 'shipper',
        eventType: 'pva_ping_shipper',
        subject: 'Creator accepted. Shipper action required',
        message: 'Creator accepted the deal. Review terms and accept shipping assignment.',
      });
    }
    if (nextStatus === 'awaiting_buyer_confirmation') {
      enqueuePvaNotification(deal, {
        targetRole: 'buyer',
        eventType: 'pva_ping_buyer_confirmation',
        subject: 'Creator and shipper accepted. Buyer confirmation required',
        message: 'Both creator and shipper accepted. Confirm final terms to unlock release lane.',
      });
    }
    if (nextStatus === 'ready_for_release') {
      enqueuePvaNotification(deal, {
        targetRole: 'seller',
        eventType: 'pva_ready_for_release',
        subject: 'PVA workflow ready for release',
        message: 'All parties accepted. Escrow release path is unlocked once buyer confirmation is complete.',
      });
    }
  }
}

// POST /api/deals/verify-signature - verify EIP-712 signature and return recovered address
router.post('/verify-signature', async (req, res) => {
  try {
    const { domain, types, primaryType, message, signature } = req.body || {};
    if (!domain || !types || !primaryType || !message || !signature) {
      return res.status(400).json({ ok: false, error: 'Missing domain, types, primaryType, message, or signature' });
    }
    const typedData = { domain, types: typeof types === 'object' ? types : { [primaryType]: types }, primaryType, message };
    const recovered = verifyDealSignature(typedData, String(signature));
    res.json({ ok: true, recoveredAddress: recovered });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'Invalid signature' });
  }
});

// GET /api/deals - list deals for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, skip = 0, status } = req.query;
    const query = {
      $or: [
        { ownerId: req.user.id },
        { 'counterparty.userId': req.user.id },
        { mediatorId: req.user.id },
      ],
    };
    if (status) query.status = status;

    const items = await Deal.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip(parseInt(skip, 10));

    const total = await Deal.countDocuments(query);

    res.json({ ok: true, items: items.map(toPublicDeal), total });
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch deals' });
  }
});

// GET /api/deals/public/:publicId - public redacted deal view
router.get('/public/:publicId', async (req, res) => {
  try {
    const publicId = sanitize(req.params.publicId || '');
    if (!publicId) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const deal = await Deal.findOne({ publicId, publicVisible: true });
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    appendDealAuditEvent(deal, {
      eventType: 'deal_viewed',
      actorUserId: null,
      payload: { publicId: deal.publicId },
    });
    await deal.save();

    res.json({
      ok: true,
      item: projectPublicDeal(deal),
      verification: projectVerificationSummary(deal),
    });
  } catch (err) {
    console.error('Error fetching public deal:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch public deal' });
  }
});

// GET /api/deals/pva/candidates - discover creator/shipper candidates from user profiles
router.get('/pva/candidates', authenticateToken, async (req, res) => {
  try {
    const role = sanitize(req.query?.role || 'both').toLowerCase();
    const country = sanitize(req.query?.country || '');
    const city = sanitize(req.query?.city || '');
    const search = sanitize(req.query?.search || '').toLowerCase();
    const limit = clamp(parseInt(req.query?.limit || '25', 10), 1, 100);

    const query = {};
    if (country) query['onboardingProfile.compliance.country'] = new RegExp(`^${country}$`, 'i');
    if (city) query['onboardingProfile.compliance.city'] = new RegExp(`^${city}$`, 'i');

    const users = await User.find(query)
      .select('name email onboardingProfile preferences')
      .limit(limit * 4)
      .sort({ updatedAt: -1 });

    const creators = [];
    const shippers = [];

    for (const user of users) {
      const appRole = String(user?.onboardingProfile?.appRole || '');
      const roleIntent = String(user?.onboardingProfile?.roleIntent || '');
      const pathTags = Array.isArray(user?.onboardingProfile?.federationPathTags) ? user.onboardingProfile.federationPathTags : [];
      const journey = String(user?.onboardingProfile?.personalJourney || '').toLowerCase();
      const haystack = [user?.name, user?.email, appRole, roleIntent, ...pathTags, journey].join(' ').toLowerCase();
      if (search && !haystack.includes(search)) continue;

      const canBeCreator = ['creator', 'seller'].includes(appRole) || ['creator_artist', 'seller'].includes(roleIntent);
      const canBeShipper = pathTags.some((tag) => /ship|freight|logistic|cargo|courier|transport/i.test(String(tag || '')))
        || /ship|freight|logistic|cargo|courier|transport/.test(journey);

      if (canBeCreator) creators.push(mapUserToPvaCandidate(user, 'creator'));
      if (canBeShipper) shippers.push(mapUserToPvaCandidate(user, 'shipper'));
    }

    const response = { ok: true };
    if (role === 'creator') response.creators = creators.slice(0, limit);
    else if (role === 'shipper') response.shippers = shippers.slice(0, limit);
    else {
      response.creators = creators.slice(0, limit);
      response.shippers = shippers.slice(0, limit);
    }

    return res.json(response);
  } catch (err) {
    console.error('Error fetching PVA candidates:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch PVA candidates' });
  }
});

// POST /api/deals/pva/plan - build creator+shipper plan for a multi-party deal
router.post('/pva/plan', authenticateToken, async (req, res) => {
  try {
    const body = sanitizeDeep(req.body || {});

    const title = sanitize(body.title || body.requestTitle || 'PVA Supply Chain Deal');
    const description = sanitize(body.description || 'Algorithm-generated creator + shipper deal plan');
    const currency = sanitize(body.currency || 'USD') || 'USD';

    const buyer = body.buyer || {};
    const creators = Array.isArray(body.creators) && body.creators.length
      ? body.creators.map((candidate) => normalizePvaCandidate(candidate, 'creator'))
      : [normalizePvaCandidate(body.creator || {}, 'creator')];
    const shippers = Array.isArray(body.shippers) && body.shippers.length
      ? body.shippers.map((candidate) => normalizePvaCandidate(candidate, 'shipper'))
      : [normalizePvaCandidate(body.shipper || {}, 'shipper')];

    const validCreators = creators.filter((candidate) => candidate.name);
    const validShippers = shippers.filter((candidate) => candidate.name);
    if (!validCreators.length) {
      return res.status(400).json({ ok: false, error: 'At least one creator candidate with a name is required' });
    }
    if (!validShippers.length) {
      return res.status(400).json({ ok: false, error: 'At least one shipper candidate with a name is required' });
    }

    const split = normalizeSplit(body.split || {});
    const collateral = {
      creatorStakePct: clamp(toFiniteNumber(body?.collateral?.creatorStakePct, 50), 0, 100),
      shipperStakePct: clamp(toFiniteNumber(body?.collateral?.shipperStakePct, 50), 0, 100),
      stakeMode: ['escrow', 'signature_commitment'].includes(String(body?.collateral?.stakeMode || ''))
        ? String(body.collateral.stakeMode)
        : 'escrow',
    };

    const basePlatformFee = Math.max(0, toFiniteNumber(body?.estimate?.platformFee, 0));

    const rankedPairs = [];
    for (const creatorCandidate of validCreators) {
      for (const shipperCandidate of validShippers) {
        const estimate = buildPvaScoreAndEstimate({
          productionCost: creatorCandidate.productionCost || body?.estimate?.productionCost,
          shippingCost: shipperCandidate.shippingCost || body?.estimate?.shippingCost,
          platformFee: basePlatformFee,
          routeKm: shipperCandidate.routeKm || body?.estimate?.routeKm,
          estimatedProductionDays: creatorCandidate.estimatedProductionDays || body?.estimate?.estimatedProductionDays,
          estimatedTransitDays: shipperCandidate.estimatedTransitDays || body?.estimate?.estimatedTransitDays,
          reliability: Math.round((creatorCandidate.reliability + shipperCandidate.reliability) / 2),
          consolidation: shipperCandidate.consolidation,
          reputation: Math.round((creatorCandidate.reputation + shipperCandidate.reputation) / 2),
        });

        rankedPairs.push({
          creator: creatorCandidate,
          shipper: shipperCandidate,
          estimate,
        });
      }
    }

    rankedPairs.sort((a, b) => {
      if (b.estimate.routeScore.finalScore !== a.estimate.routeScore.finalScore) {
        return b.estimate.routeScore.finalScore - a.estimate.routeScore.finalScore;
      }
      return a.estimate.totalAmount - b.estimate.totalAmount;
    });

    const bestPair = rankedPairs[0];
    const creator = bestPair.creator;
    const shipper = bestPair.shipper;
    const estimate = bestPair.estimate;
    const totalAmount = estimate.totalAmount;

    const creatorCut = Number(((totalAmount * split.creatorPct) / 100).toFixed(2));
    const shipperCut = Number(((totalAmount * split.shipperPct) / 100).toFixed(2));
    const platformCut = Number(((totalAmount * split.platformPct) / 100).toFixed(2));
    const bufferCut = Number(((totalAmount * split.bufferPct) / 100).toFixed(2));

    const milestones = [
      {
        key: 'creator_proof',
        title: 'Creator proof of production uploaded',
        description: 'Creator uploads timestamped photos and progress notes.',
        evidenceType: 'document',
        assignedRole: 'creator',
        status: 'pending',
      },
      {
        key: 'shipper_pickup',
        title: 'Shipper pickup and packaging proof uploaded',
        description: 'Shipper uploads packaging photos and tracking details.',
        evidenceType: 'tracking_number',
        assignedRole: 'shipper',
        status: 'pending',
      },
      {
        key: 'buyer_confirm',
        title: 'Buyer confirmation of delivery',
        description: 'Buyer confirms receipt with barcode scan or image proof.',
        evidenceType: 'message',
        assignedRole: 'buyer',
        status: 'pending',
      },
    ];

    const payments = [
      { label: 'Creator cut', amount: creatorCut, currency, status: 'pending' },
      { label: 'Shipper cut', amount: shipperCut, currency, status: 'pending' },
      { label: 'PVA platform fee', amount: platformCut, currency, status: 'pending' },
      { label: 'Risk buffer', amount: bufferCut, currency, status: 'pending' },
    ];

    const pvaPlan = {
      mode: 'creator_shipper',
      algorithmVersion: 'pva-v1',
      parties: [
        {
          role: 'buyer',
          userId: isObjectIdHex(String(buyer.userId || '')) ? String(buyer.userId) : undefined,
          name: sanitize(buyer.name || ''),
          country: sanitize(buyer.country || ''),
          city: sanitize(buyer.city || ''),
          walletAddress: sanitize(buyer.walletAddress || ''),
        },
        {
          role: 'creator',
          userId: isObjectIdHex(String(creator.userId || '')) ? String(creator.userId) : undefined,
          name: sanitize(creator.name || ''),
          country: sanitize(creator.country || ''),
          city: sanitize(creator.city || ''),
          walletAddress: sanitize(creator.walletAddress || ''),
        },
        {
          role: 'shipper',
          userId: isObjectIdHex(String(shipper.userId || '')) ? String(shipper.userId) : undefined,
          name: sanitize(shipper.name || ''),
          country: sanitize(shipper.country || ''),
          city: sanitize(shipper.city || ''),
          walletAddress: sanitize(shipper.walletAddress || ''),
        },
      ],
      split,
      collateral,
      roleAcceptance: {
        creator: { userId: isObjectIdHex(String(creator.userId || '')) ? String(creator.userId) : undefined, status: 'pending' },
        shipper: { userId: isObjectIdHex(String(shipper.userId || '')) ? String(shipper.userId) : undefined, status: 'pending' },
        buyer: {
          userId: isObjectIdHex(String(buyer.userId || '')) ? String(buyer.userId) : undefined,
          status: isObjectIdHex(String(buyer.userId || '')) ? 'accepted' : 'pending',
        },
      },
      workflow: { status: 'awaiting_creator', updatedAt: new Date() },
      notificationQueue: [],
      payoutPreview: buildPvaPayoutPreview(totalAmount, split, currency, 'draft'),
      routeScore: estimate.routeScore,
      planNotes: sanitize(body.planNotes || ''),
    };

    if (!body.createDeal) {
      return res.json({
        ok: true,
        plan: {
          title,
          description,
          currency,
          totalAmount,
          estimatedDays: estimate.estimatedDays,
          split,
          cuts: {
            creatorCut,
            shipperCut,
            platformCut,
            bufferCut,
          },
          collateral,
          milestones,
          payments,
          pva: pvaPlan,
          alternatives: rankedPairs.slice(0, 3).map((pair) => ({
            creator: {
              name: pair.creator.name,
              country: pair.creator.country,
              city: pair.creator.city,
            },
            shipper: {
              name: pair.shipper.name,
              country: pair.shipper.country,
              city: pair.shipper.city,
            },
            totalAmount: pair.estimate.totalAmount,
            score: pair.estimate.routeScore.finalScore,
            estimatedDays: pair.estimate.estimatedDays,
          })),
        },
      });
    }

    const deal = new Deal({
      ownerId: req.user.id,
      title,
      description,
      totalAmount,
      currency,
      status: 'draft',
      counterparty: {
        name: sanitize(creator.name || ''),
        country: sanitize(creator.country || ''),
        walletAddress: sanitize(creator.walletAddress || ''),
        contact: sanitize(creator.contact || ''),
      },
      pva: pvaPlan,
      payments,
      milestones,
      messages: [
        { author: 'system', text: 'PVA plan created from creator + shipper matching algorithm' },
      ],
      escrow: {
        fundingMode: 'mock',
        status: 'draft',
        fundedAmount: totalAmount,
        fundedCurrency: currency,
        mockTransferProofs: [],
      },
      dispute: {
        status: 'none',
        evidence: [],
      },
      mediation: {
        mode: 'none',
        status: 'none',
      },
    });

    enqueuePvaNotification(deal, {
      targetRole: 'creator',
      eventType: 'pva_ping_creator',
      subject: 'New PVA deal requires creator acceptance',
      message: 'Review and accept this production assignment to continue workflow.',
    });

    await deal.save();
    return res.status(201).json({ ok: true, item: toPublicDeal(deal), plan: { totalAmount, split, collateral } });
  } catch (err) {
    console.error('Error creating PVA plan:', err);
    return res.status(500).json({ ok: false, error: 'Failed to build PVA deal plan' });
  }
});

// POST /api/deals - create deal (owner-only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const title = sanitize(req.body?.title);
    const description = sanitize(req.body?.description || '');
    if (!title) return res.status(400).json({ ok: false, error: 'Title is required' });

    const counterparty = req.body?.counterparty || {};
    const pva = req.body?.pva && typeof req.body.pva === 'object' ? req.body.pva : null;
    const payments = Array.isArray(req.body?.payments) ? req.body.payments : [];
    const milestones = Array.isArray(req.body?.milestones) ? req.body.milestones : [];
    const publicVisible = req.body?.publicVisible !== false;
    const publicId = await generateUniquePublicId();

    const deal = new Deal({
      ownerId: req.user.id,
      publicId,
      publicVisible,
      title,
      description,
      counterparty: {
        name: sanitize(counterparty.name || ''),
        country: sanitize(counterparty.country || ''),
        walletAddress: sanitize(counterparty.walletAddress || ''),
        contact: sanitize(counterparty.contact || ''),
      },
      totalAmount: Number(req.body?.totalAmount || 0),
      currency: sanitize(req.body?.currency || 'USD') || 'USD',
      mediatorFeePct: Number(req.body?.mediatorFeePct || 0),
      pva: pva
        ? {
            mode: ['classic', 'creator_shipper'].includes(String(pva.mode || '')) ? String(pva.mode) : 'creator_shipper',
            algorithmVersion: sanitize(pva.algorithmVersion || 'pva-v1') || 'pva-v1',
            planNotes: sanitize(pva.planNotes || ''),
            parties: Array.isArray(pva.parties)
              ? pva.parties
                .filter((party) => party && typeof party === 'object')
                .map((party) => ({
                  role: sanitize(party.role || ''),
                  userId: isObjectIdHex(String(party.userId || '')) ? String(party.userId) : undefined,
                  name: sanitize(party.name || ''),
                  country: sanitize(party.country || ''),
                  city: sanitize(party.city || ''),
                  walletAddress: sanitize(party.walletAddress || ''),
                }))
                .filter((party) => ['buyer', 'creator', 'shipper'].includes(party.role))
              : [],
            split: {
              creatorPct: clamp(toFiniteNumber(pva?.split?.creatorPct, 45), 0, 100),
              shipperPct: clamp(toFiniteNumber(pva?.split?.shipperPct, 35), 0, 100),
              platformPct: clamp(toFiniteNumber(pva?.split?.platformPct, 10), 0, 100),
              bufferPct: clamp(toFiniteNumber(pva?.split?.bufferPct, 10), 0, 100),
            },
            collateral: {
              creatorStakePct: clamp(toFiniteNumber(pva?.collateral?.creatorStakePct, 50), 0, 100),
              shipperStakePct: clamp(toFiniteNumber(pva?.collateral?.shipperStakePct, 50), 0, 100),
              stakeMode: ['escrow', 'signature_commitment'].includes(String(pva?.collateral?.stakeMode || ''))
                ? String(pva.collateral.stakeMode)
                : 'escrow',
            },
            routeScore: {
              costScore: clamp(toFiniteNumber(pva?.routeScore?.costScore, 0), 0, 100),
              reliabilityScore: clamp(toFiniteNumber(pva?.routeScore?.reliabilityScore, 0), 0, 100),
              routeEfficiencyScore: clamp(toFiniteNumber(pva?.routeScore?.routeEfficiencyScore, 0), 0, 100),
              consolidationScore: clamp(toFiniteNumber(pva?.routeScore?.consolidationScore, 0), 0, 100),
              reputationScore: clamp(toFiniteNumber(pva?.routeScore?.reputationScore, 0), 0, 100),
              finalScore: clamp(toFiniteNumber(pva?.routeScore?.finalScore, 0), 0, 100),
              distanceKm: Math.max(0, toFiniteNumber(pva?.routeScore?.distanceKm, 0)),
              estimatedDays: Math.max(0, toFiniteNumber(pva?.routeScore?.estimatedDays, 0)),
            },
            roleAcceptance: {
              creator: {
                userId: isObjectIdHex(String(pva?.roleAcceptance?.creator?.userId || ''))
                  ? String(pva.roleAcceptance.creator.userId)
                  : undefined,
                status: ['pending', 'accepted', 'declined'].includes(String(pva?.roleAcceptance?.creator?.status || ''))
                  ? String(pva.roleAcceptance.creator.status)
                  : 'pending',
              },
              shipper: {
                userId: isObjectIdHex(String(pva?.roleAcceptance?.shipper?.userId || ''))
                  ? String(pva.roleAcceptance.shipper.userId)
                  : undefined,
                status: ['pending', 'accepted', 'declined'].includes(String(pva?.roleAcceptance?.shipper?.status || ''))
                  ? String(pva.roleAcceptance.shipper.status)
                  : 'pending',
              },
              buyer: {
                userId: isObjectIdHex(String(pva?.roleAcceptance?.buyer?.userId || ''))
                  ? String(pva.roleAcceptance.buyer.userId)
                  : undefined,
                status: ['pending', 'accepted', 'declined'].includes(String(pva?.roleAcceptance?.buyer?.status || ''))
                  ? String(pva.roleAcceptance.buyer.status)
                  : 'pending',
              },
            },
            workflow: {
              status: ['draft', 'awaiting_creator', 'awaiting_shipper', 'awaiting_buyer_confirmation', 'ready_for_release', 'complete', 'cancelled']
                .includes(String(pva?.workflow?.status || ''))
                ? String(pva.workflow.status)
                : 'awaiting_creator',
              updatedAt: pva?.workflow?.updatedAt ? new Date(pva.workflow.updatedAt) : new Date(),
            },
            notificationQueue: [],
            payoutPreview: Array.isArray(pva?.payoutPreview) && pva.payoutPreview.length
              ? pva.payoutPreview
              : buildPvaPayoutPreview(Number(req.body?.totalAmount || 0), pva?.split || {}, sanitize(req.body?.currency || 'USD') || 'USD', 'draft'),
          }
        : undefined,
      chainId: req.body?.chainId ? Number(req.body.chainId) : undefined,
      tokenAddress: sanitize(req.body?.tokenAddress || ''),
      status: sanitize(req.body?.status || 'draft') || 'draft',
      payments: payments
        .filter((p) => p && typeof p === 'object')
        .map((p) => ({
          label: sanitize(p.label || ''),
          amount: Number(p.amount || 0),
          currency: sanitize(p.currency || 'USD') || 'USD',
          dueOn: p.dueOn ? new Date(p.dueOn) : undefined,
          status: sanitize(p.status || 'pending') || 'pending',
          payerWallet: sanitize(p.payerWallet || ''),
          payeeWallet: sanitize(p.payeeWallet || ''),
          txHash: sanitize(p.txHash || ''),
        }))
        .filter((p) => Number.isFinite(p.amount) && p.amount > 0),
      milestones: milestones
        .filter((m) => m && typeof m === 'object')
        .map((m) => ({
          key: sanitize(m.key || ''),
          title: sanitize(m.title || ''),
          description: sanitize(m.description || ''),
          evidenceType: sanitize(m.evidenceType || 'none') || 'none',
          assignedRole: sanitize(m.assignedRole || 'any') || 'any',
          evidenceValue: sanitize(m.evidenceValue || ''),
          status: sanitize(m.status || 'pending') || 'pending',
        }))
        .filter((m) => m.title),
      messages: [
        {
          author: 'system',
          text: 'Deal created',
        },
      ],
      escrow: {
        fundingMode: 'mock',
        status: 'draft',
        fundedAmount: Number(req.body?.totalAmount || 0),
        fundedCurrency: sanitize(req.body?.currency || 'USD') || 'USD',
        mockTransferProofs: [],
      },
      dispute: {
        status: 'none',
        evidence: [],
      },
      mediation: {
        mode: 'none',
        status: 'none',
      },
    });

    appendDealAuditEvent(deal, {
      eventType: 'deal_created',
      actorUserId: req.user.id,
      payload: {
        publicId: deal.publicId,
        title: deal.title,
        totalAmount: deal.totalAmount,
        currency: deal.currency,
      },
    });

    await deal.save();

    if (deal?.pva?.mode === 'creator_shipper') {
      enqueuePvaNotification(deal, {
        targetRole: 'creator',
        eventType: 'pva_ping_creator',
        subject: 'New PVA deal requires creator acceptance',
        message: 'Review and accept this production assignment to continue workflow.',
      });
      await deal.save();
    }

    res.status(201).json({
      ok: true,
      item: toPublicDeal(deal),
      publicId: deal.publicId,
      shareUrl: buildPublicShareUrl(req, deal.publicId),
    });
  } catch (err) {
    console.error('Error creating deal:', err);
    res.status(500).json({ ok: false, error: 'Failed to create deal' });
  }
});

// GET /api/deals/drafts - fetch create-deal draft for current user
router.get('/drafts', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    const draft = user?.preferences?.drafts?.deals || null;
    res.json({ ok: true, draft });
  } catch (err) {
    console.error('Error fetching deal draft:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch deal draft' });
  }
});

// PUT /api/deals/drafts - save create-deal draft for current user
router.put('/drafts', authenticateToken, async (req, res) => {
  try {
    const incoming = req.body?.draft !== undefined ? req.body.draft : req.body;
    const draft = sanitizeDeep(incoming || null);
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 'preferences.drafts.deals': draft, updatedAt: Date.now() },
      { new: true }
    ).select('preferences');
    res.json({ ok: true, draft: user?.preferences?.drafts?.deals || null });
  } catch (err) {
    console.error('Error saving deal draft:', err);
    res.status(500).json({ ok: false, error: 'Failed to save deal draft' });
  }
});

// DELETE /api/deals/drafts - clear create-deal draft
router.delete('/drafts', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { 'preferences.drafts.deals': null, updatedAt: Date.now() }, { new: true });
    res.json({ ok: true, draft: null });
  } catch (err) {
    console.error('Error clearing deal draft:', err);
    res.status(500).json({ ok: false, error: 'Failed to clear deal draft' });
  }
});

// POST /api/deals/:id/invite - generate counterparty join link (owner-only)
router.post('/:id/invite', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const inviteJti = crypto.randomBytes(24).toString('hex');
    const expiresMs = 1000 * 60 * 60 * 24 * 30; // 30 days
    const inviteExpiresAt = new Date(Date.now() + expiresMs);
    const token = jwt.sign(
      { role: 'deal_counterparty', dealId: String(deal._id), jti: inviteJti },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    deal.counterpartyAccess = {
      inviteJtiHash: sha256Hex(inviteJti),
      inviteCreatedAt: new Date(),
      inviteExpiresAt,
      joinedAt: deal.counterpartyAccess?.joinedAt,
    };
    deal.messages.push({ author: 'system', text: 'Counterparty invite generated' });
    await deal.save();

    const origin = req.get('origin') || 'https://pvabazaar.org';
    const joinUrl = `${origin.replace(/\/+$/, '')}/#/deals/join?token=${encodeURIComponent(token)}`;
    res.json({ ok: true, joinUrl, expiresAt: inviteExpiresAt.toISOString() });
  } catch (err) {
    console.error('Error generating deal invite:', err);
    res.status(500).json({ ok: false, error: 'Failed to generate invite' });
  }
});

// GET /api/deals/join - view deal as counterparty via invite token
router.get('/join', async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'No authentication token provided' });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: 'Invalid authentication token' });
    }
    if (decoded?.role !== 'deal_counterparty' || !decoded?.dealId) {
      return res.status(401).json({ ok: false, error: 'Invalid deal access token' });
    }

    const deal = await Deal.findById(decoded.dealId);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    await verifyDealActor(req, deal);

    // Mark joined (first use) for audit trail.
    if (!deal.counterpartyAccess?.joinedAt) {
      deal.counterpartyAccess = { ...(deal.counterpartyAccess || {}), joinedAt: new Date() };
      deal.messages.push({ author: 'system', text: 'Counterparty joined via invite link' });
      await deal.save();
    }

    res.json({ ok: true, item: toJoinDeal(deal) });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message || 'Join failed' });
  }
});

// POST /api/deals/join-authenticated - link invite token to logged-in account
router.post('/join-authenticated', authenticateToken, async (req, res) => {
  try {
    const token = sanitize(req.body?.inviteToken || req.query?.inviteToken || '');
    if (!token) return res.status(400).json({ ok: false, error: 'inviteToken is required' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: 'Invalid invite token' });
    }
    if (decoded?.role !== 'deal_counterparty' || !decoded?.dealId) {
      return res.status(401).json({ ok: false, error: 'Invalid deal access token' });
    }

    const deal = await Deal.findById(decoded.dealId);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    if (deal.counterparty?.userId && String(deal.counterparty.userId) !== String(req.user.id)) {
      return res.status(409).json({ ok: false, error: 'This invite is already linked to another account' });
    }

    // Re-validate invite token hash/expiry against the deal before linking user.
    const jti = decoded?.jti ? String(decoded.jti) : '';
    const stored = deal?.counterpartyAccess?.inviteJtiHash || '';
    const expiresAt = deal?.counterpartyAccess?.inviteExpiresAt ? new Date(deal.counterpartyAccess.inviteExpiresAt) : null;
    if (!jti || !stored || sha256Hex(jti) !== stored) {
      return res.status(401).json({ ok: false, error: 'Invite token no longer valid' });
    }
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ ok: false, error: 'Invite token has expired' });
    }

    deal.counterparty = {
      ...(deal.counterparty || {}),
      userId: req.user.id,
    };
    if (!deal.counterpartyAccess?.joinedAt) {
      deal.counterpartyAccess = { ...(deal.counterpartyAccess || {}), joinedAt: new Date() };
    }
    deal.messages.push({ author: 'system', text: 'Counterparty linked to authenticated user account' });
    await deal.save();

    res.json({ ok: true, item: toPublicDeal(deal), role: dealRoleForUser(deal, req.user.id) });
  } catch (err) {
    console.error('Error linking deal to authenticated counterparty:', err);
    res.status(500).json({ ok: false, error: 'Failed to join deal as authenticated user' });
  }
});

// POST /api/deals/:id/prepare-escrow - prepare deployment params for escrow on Base
router.post('/:id/prepare-escrow', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const counterpartyWallet = (deal.counterparty?.walletAddress || '').trim();
    const defaultPayer = counterpartyWallet || (deal.payments?.[0]?.payerWallet || '').trim();
    const defaultPayee = counterpartyWallet || (deal.payments?.[0]?.payeeWallet || '').trim();
    const ownerWallet = (req.body?.ownerWallet || '').trim();

    const milestoneHashes = (deal.milestones || [])
      .filter((m) => m?.title)
      .map((m) => {
        const base = `${deal._id}:${m._id || ''}:${m.title || ''}`;
        return sha256Hex(base);
      });

    const payments = (deal.payments || [])
      .filter((p) => p && Number.isFinite(p.amount) && p.amount > 0)
      .map((p) => ({
        label: p.label || '',
        amount: p.amount,
        currency: p.currency || deal.currency || 'USD',
        payerWallet: (p.payerWallet || defaultPayer).trim(),
        payeeWallet: (p.payeeWallet || defaultPayee).trim(),
      }));

    const chainId = deal.chainId || 8453;

    res.json({
      ok: true,
      prepareEscrow: {
        dealId: String(deal._id),
        chainId,
        ownerWallet,
        counterpartyWallet,
        totalAmount: deal.totalAmount || 0,
        currency: deal.currency || 'USD',
        payments,
        milestoneHashes,
        tokenAddress: (deal.tokenAddress || '').trim(),
      },
    });
  } catch (err) {
    console.error('Error preparing escrow:', err);
    res.status(500).json({ ok: false, error: 'Failed to prepare escrow' });
  }
});

// GET /api/deals/:id - get single deal
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      $or: [
        { ownerId: req.user.id },
        { 'counterparty.userId': req.user.id },
        { mediatorId: req.user.id },
      ],
    });
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error fetching deal:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch deal' });
  }
});

// POST /api/deals/:id/verify - record authenticated participant verification
router.post('/:id/verify', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    if (!deal.publicVisible || !deal.publicId) {
      return res.status(404).json({ ok: false, error: 'Deal not found' });
    }

    const existing = Array.isArray(deal.verifiedParticipants)
      ? deal.verifiedParticipants.find((entry) => String(entry?.userId || '') === String(req.user.id))
      : null;

    if (existing) {
      return res.status(400).json({ ok: false, error: 'Already verified this deal' });
    }

    const verificationEntry = {
      userId: req.user.id,
      verifiedAt: new Date(),
      method: 'jwt',
      note: sanitize(req.body?.note || ''),
    };

    deal.verifiedParticipants = [...(Array.isArray(deal.verifiedParticipants) ? deal.verifiedParticipants : []), verificationEntry];
    deal.verificationCount = deal.verifiedParticipants.length;
    appendDealAuditEvent(deal, {
      eventType: 'deal_verified',
      actorUserId: req.user.id,
      payload: { publicId: deal.publicId, verificationCount: deal.verificationCount },
    });

    await deal.save();

    res.json({
      ok: true,
      item: toPublicDeal(deal),
      verification: projectVerificationSummary(deal),
    });
  } catch (err) {
    console.error('Error verifying deal:', err);
    res.status(err.status || 500).json({ ok: false, error: err.message || 'Failed to verify deal' });
  }
});

// GET /api/deals/:id/verification - public verification summary
router.get('/:id/verification', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal || !deal.publicVisible) {
      return res.status(404).json({ ok: false, error: 'Deal not found' });
    }

    res.json({ ok: true, verification: projectVerificationSummary(deal) });
  } catch (err) {
    console.error('Error fetching deal verification:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch deal verification' });
  }
});

// PUT /api/deals/:id/pva/assign - assign creator/shipper/buyer accounts and milestone role ownership
router.put('/:id/pva/assign', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (!['seller', 'mediator'].includes(role) && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Only seller/mediator/admin can assign PVA roles' });
    }

    const creatorUserId = sanitize(req.body?.creatorUserId || '');
    const shipperUserId = sanitize(req.body?.shipperUserId || '');
    const buyerUserId = sanitize(req.body?.buyerUserId || '');
    const milestoneRoles = req.body?.milestoneRoles && typeof req.body.milestoneRoles === 'object'
      ? req.body.milestoneRoles
      : {};

    const ids = [creatorUserId, shipperUserId, buyerUserId].filter((id) => isObjectIdHex(String(id || '')));
    const users = ids.length
      ? await User.find({ _id: { $in: ids } }).select('_id name onboardingProfile preferences')
      : [];
    const byId = new Map(users.map((u) => [String(u._id), u]));

    const parties = Array.isArray(deal.pva?.parties) ? [...deal.pva.parties] : [];
    const upsertParty = (party) => {
      const idx = parties.findIndex((p) => String(p.role || '') === String(party.role || ''));
      if (idx >= 0) parties[idx] = { ...parties[idx].toObject?.() || parties[idx], ...party };
      else parties.push(party);
    };

    if (isObjectIdHex(creatorUserId) && byId.get(String(creatorUserId))) {
      upsertParty(mapUserToPartySnapshot(byId.get(String(creatorUserId)), 'creator'));
    }
    if (isObjectIdHex(shipperUserId) && byId.get(String(shipperUserId))) {
      upsertParty(mapUserToPartySnapshot(byId.get(String(shipperUserId)), 'shipper'));
    }
    if (isObjectIdHex(buyerUserId) && byId.get(String(buyerUserId))) {
      upsertParty(mapUserToPartySnapshot(byId.get(String(buyerUserId)), 'buyer'));
    }

    const allowedAssignedRoles = ['any', 'buyer', 'seller', 'creator', 'shipper', 'mediator'];
    const milestones = Array.isArray(deal.milestones) ? deal.milestones : [];
    for (const milestone of milestones) {
      const nextRole = sanitize(milestoneRoles[String(milestone._id)] || '');
      if (!nextRole) continue;
      if (!allowedAssignedRoles.includes(nextRole)) {
        return res.status(400).json({ ok: false, error: `Invalid assigned role: ${nextRole}` });
      }
      milestone.assignedRole = nextRole;
    }

    deal.pva = {
      ...(deal.pva || {}),
      mode: deal.pva?.mode || 'creator_shipper',
      algorithmVersion: deal.pva?.algorithmVersion || 'pva-v1',
      parties,
      roleAcceptance: {
        ...(deal.pva?.roleAcceptance || {}),
        creator: {
          ...(deal.pva?.roleAcceptance?.creator || {}),
          userId: isObjectIdHex(creatorUserId) ? creatorUserId : deal.pva?.roleAcceptance?.creator?.userId,
        },
        shipper: {
          ...(deal.pva?.roleAcceptance?.shipper || {}),
          userId: isObjectIdHex(shipperUserId) ? shipperUserId : deal.pva?.roleAcceptance?.shipper?.userId,
        },
        buyer: {
          ...(deal.pva?.roleAcceptance?.buyer || {}),
          userId: isObjectIdHex(buyerUserId) ? buyerUserId : deal.pva?.roleAcceptance?.buyer?.userId,
        },
      },
      payoutPreview: buildPvaPayoutPreview(
        Number(deal.totalAmount || 0),
        deal.pva?.split || {},
        deal.currency || 'USD',
        deal.escrow?.status || 'draft'
      ),
    };

    applyPvaWorkflowTransition(deal);

    deal.messages.push({ author: 'system', text: 'PVA role assignments updated' });
    await deal.save();
    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error assigning PVA roles:', err);
    res.status(500).json({ ok: false, error: 'Failed to assign PVA roles' });
  }
});

// POST /api/deals/:id/pva/accept-role - accept/decline creator/shipper/buyer assignment and trigger next pings
router.post('/:id/pva/accept-role', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const actorRole = dealRoleForUser(deal, req.user.id);
    const role = sanitize(req.body?.role || actorRole || '').toLowerCase();
    const action = sanitize(req.body?.action || 'accept').toLowerCase();
    const note = sanitize(req.body?.note || '');

    if (!['creator', 'shipper', 'buyer'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'role must be creator, shipper, or buyer' });
    }
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'action must be accept or decline' });
    }

    const targetParty = getPvaPartyByRole(deal, role);
    const isAllowedActor = req.user?.role === 'admin'
      || actorRole === role
      || (targetParty?.userId && String(targetParty.userId) === String(req.user.id));
    if (!isAllowedActor) {
      return res.status(403).json({ ok: false, error: `Only assigned ${role} can perform this action` });
    }

    const now = new Date();
    const nextStatus = action === 'accept' ? 'accepted' : 'declined';
    deal.pva = {
      ...(deal.pva || {}),
      mode: deal.pva?.mode || 'creator_shipper',
      roleAcceptance: {
        ...(deal.pva?.roleAcceptance || {}),
        [role]: {
          ...(deal.pva?.roleAcceptance?.[role] || {}),
          userId: targetParty?.userId || req.user.id,
          status: nextStatus,
          acceptedAt: action === 'accept' ? now : deal.pva?.roleAcceptance?.[role]?.acceptedAt,
          declinedAt: action === 'decline' ? now : deal.pva?.roleAcceptance?.[role]?.declinedAt,
          note,
        },
      },
      payoutPreview: buildPvaPayoutPreview(
        Number(deal.totalAmount || 0),
        deal.pva?.split || {},
        deal.currency || 'USD',
        deal.escrow?.status || 'draft'
      ),
    };

    if (action === 'decline') {
      deal.pva.workflow = {
        ...(deal.pva.workflow || {}),
        status: 'cancelled',
        updatedAt: now,
      };
      enqueuePvaNotification(deal, {
        targetRole: 'seller',
        eventType: 'pva_role_declined',
        subject: `${role} declined assignment`,
        message: `${role} declined the assignment. Reassign or renegotiate terms.`,
      });
    } else {
      applyPvaWorkflowTransition(deal);
    }

    deal.messages.push({ author: 'system', text: `PVA role ${role} ${nextStatus}` });
    await deal.save();
    return res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error accepting PVA role:', err);
    return res.status(500).json({ ok: false, error: 'Failed to update PVA role status' });
  }
});

// GET /api/deals/:id/pva/notification-queue - view generated role ping payloads
router.get('/:id/pva/notification-queue', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    const role = dealRoleForUser(deal, req.user.id);
    if (role === 'none' && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    const queue = Array.isArray(deal?.pva?.notificationQueue) ? deal.pva.notificationQueue : [];
    return res.json({ ok: true, queue });
  } catch (err) {
    console.error('Error fetching PVA notification queue:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch PVA notification queue' });
  }
});

// PUT /api/deals/:id/pva/notification-queue/:notificationId/status - update queue delivery status
router.put('/:id/pva/notification-queue/:notificationId/status', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (!['seller', 'mediator'].includes(role) && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Only seller/mediator/admin can update PVA queue status' });
    }

    const nextStatus = sanitize(req.body?.status || '').toLowerCase();
    const allowedStatus = ['queued', 'sent', 'failed'];
    if (!allowedStatus.includes(nextStatus)) {
      return res.status(400).json({ ok: false, error: 'status must be queued, sent, or failed' });
    }
    const hasHiddenFlag = typeof req.body?.hiddenFromView === 'boolean';

    const queue = Array.isArray(deal?.pva?.notificationQueue) ? deal.pva.notificationQueue : [];
    const idx = queue.findIndex((entry) => String(entry?._id || '') === String(req.params.notificationId || ''));
    if (idx < 0) {
      return res.status(404).json({ ok: false, error: 'Notification queue item not found' });
    }

    const now = new Date();
    queue[idx].status = nextStatus;
    queue[idx].sentAt = nextStatus === 'sent' ? now : queue[idx].sentAt;
    if (hasHiddenFlag) {
      queue[idx].hiddenFromView = req.body.hiddenFromView;
    }

    deal.pva = {
      ...(deal.pva || {}),
      notificationQueue: queue,
    };
    deal.messages.push({
      author: 'system',
      text: `PVA queue status updated: ${queue[idx].eventType || 'event'} -> ${nextStatus}`,
    });

    await deal.save();
    return res.json({ ok: true, queue: deal.pva.notificationQueue, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error updating PVA notification queue status:', err);
    return res.status(500).json({ ok: false, error: 'Failed to update PVA queue status' });
  }
});

// GET /api/deals/:id/pva/payout-preview - compute payout ledger and release simulation
router.get('/:id/pva/payout-preview', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    const role = dealRoleForUser(deal, req.user.id);
    if (role === 'none' && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const preview = buildPvaPayoutPreview(
      Number(deal.totalAmount || 0),
      deal.pva?.split || {},
      deal.currency || 'USD',
      deal.escrow?.status || 'draft'
    );

    deal.pva = {
      ...(deal.pva || {}),
      payoutPreview: preview,
    };
    await deal.save();

    return res.json({
      ok: true,
      workflow: deal?.pva?.workflow || { status: 'draft' },
      roleAcceptance: deal?.pva?.roleAcceptance || {},
      payoutPreview: preview,
      collateralOutcome: deal?.pva?.collateralOutcome || {},
    });
  } catch (err) {
    console.error('Error fetching PVA payout preview:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch PVA payout preview' });
  }
});

// PUT /api/deals/:id - update deal
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const allowed = ['title', 'description', 'counterparty', 'totalAmount', 'currency', 'mediatorFeePct', 'chainId', 'tokenAddress', 'contractAddress', 'status'];
    for (const key of allowed) {
      if (req.body?.[key] === undefined) continue;
      if (key === 'title' || key === 'description' || key === 'currency' || key === 'tokenAddress' || key === 'contractAddress' || key === 'status') {
        deal[key] = sanitize(req.body[key]);
      } else if (key === 'counterparty') {
        const cp = req.body.counterparty || {};
        deal.counterparty = {
          name: sanitize(cp.name || ''),
          country: sanitize(cp.country || ''),
          walletAddress: sanitize(cp.walletAddress || ''),
          contact: sanitize(cp.contact || ''),
        };
      } else if (key === 'chainId' || key === 'totalAmount' || key === 'mediatorFeePct') {
        deal[key] = Number(req.body[key]);
      } else {
        deal[key] = req.body[key];
      }
    }

    // Optionally allow replacing payments/milestones arrays
    if (Array.isArray(req.body?.payments)) {
      deal.payments = req.body.payments
        .filter((p) => p && typeof p === 'object')
        .map((p) => ({
          label: sanitize(p.label || ''),
          amount: Number(p.amount || 0),
          currency: sanitize(p.currency || deal.currency || 'USD') || 'USD',
          dueOn: p.dueOn ? new Date(p.dueOn) : undefined,
          status: sanitize(p.status || 'pending') || 'pending',
          payerWallet: sanitize(p.payerWallet || ''),
          payeeWallet: sanitize(p.payeeWallet || ''),
          txHash: sanitize(p.txHash || ''),
        }))
        .filter((p) => Number.isFinite(p.amount) && p.amount > 0);
    }
    if (Array.isArray(req.body?.milestones)) {
      deal.milestones = req.body.milestones
        .filter((m) => m && typeof m === 'object')
        .map((m) => ({
          key: sanitize(m.key || ''),
          title: sanitize(m.title || ''),
          description: sanitize(m.description || ''),
          evidenceType: sanitize(m.evidenceType || 'none') || 'none',
          assignedRole: sanitize(m.assignedRole || 'any') || 'any',
          evidenceValue: sanitize(m.evidenceValue || ''),
          status: sanitize(m.status || 'pending') || 'pending',
          completedAt: m.completedAt ? new Date(m.completedAt) : undefined,
        }))
        .filter((m) => m.title);
    }

    deal.messages.push({ author: 'system', text: 'Deal updated' });
    await deal.save();
    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error updating deal:', err);
    res.status(500).json({ ok: false, error: 'Failed to update deal' });
  }
});

// POST /api/deals/:id/messages - append message (owner-only for now)
router.post('/:id/messages', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    const { actor } = await verifyDealActor(req, deal);
    const text = sanitize(req.body?.text);
    if (!text) return res.status(400).json({ ok: false, error: 'Message text is required' });
    const authorWallet = sanitize(req.body?.authorWallet || '');
    const signature = sanitize(req.body?.signature || '');

    if (signature && authorWallet && req.body?.typedData) {
      try {
        const td = req.body.typedData;
        const recovered = verifyDealSignature(td, signature);
        if (normalizeAddress(recovered) !== normalizeAddress(authorWallet)) {
          return res.status(400).json({ ok: false, error: 'Signature does not match author wallet' });
        }
      } catch (e) {
        return res.status(400).json({ ok: false, error: e.message || 'Invalid EIP-712 signature' });
      }
    }

    deal.messages.push({ author: actor, authorWallet, text, signature });
    await deal.save();
    res.status(201).json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error adding deal message:', err);
    res.status(err.status || 500).json({ ok: false, error: err.message || 'Failed to add message' });
  }
});

// POST /api/deals/:id/milestones/:milestoneId/evidence - submit evidence (owner or counterparty)
router.post('/:id/milestones/:milestoneId/evidence', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    const { actor } = await verifyDealActor(req, deal);

    const evidenceValue = sanitize(req.body?.evidenceValue || '');
    if (!evidenceValue) return res.status(400).json({ ok: false, error: 'evidenceValue is required' });

    const milestone = (deal.milestones || []).find((m) => String(m._id) === String(req.params.milestoneId));
    if (!milestone) return res.status(404).json({ ok: false, error: 'Milestone not found' });
    if (!canSubmitMilestoneEvidence(milestone.assignedRole, actor, req.user?.role === 'admin')) {
      return res.status(403).json({
        ok: false,
        error: `Only ${milestone.assignedRole || 'assigned role'} can submit evidence for this milestone`,
      });
    }

    const evidenceAuthorWallet = sanitize(req.body?.authorWallet || '');
    const evidenceSignature = sanitize(req.body?.signature || '');

    if (evidenceSignature && evidenceAuthorWallet && req.body?.typedData) {
      try {
        const td = req.body.typedData;
        const recovered = verifyDealSignature(td, evidenceSignature);
        if (normalizeAddress(recovered) !== normalizeAddress(evidenceAuthorWallet)) {
          return res.status(400).json({ ok: false, error: 'Signature does not match author wallet' });
        }
      } catch (e) {
        return res.status(400).json({ ok: false, error: e.message || 'Invalid EIP-712 signature' });
      }
    }

    milestone.evidenceValue = evidenceValue;
    milestone.evidenceAuthorWallet = evidenceAuthorWallet;
    milestone.evidenceSignature = evidenceSignature;
    deal.messages.push({
      author: 'system',
      text: `${actor} submitted evidence for milestone: ${milestone.title}`,
    });
    await deal.save();
    res.status(201).json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error submitting milestone evidence:', err);
    res.status(err.status || 500).json({ ok: false, error: err.message || 'Failed to submit evidence' });
  }
});

// GET /api/deals/:id/messages - fetch audit-friendly message log
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    const role = dealRoleForUser(deal, req.user.id);
    if (role === 'none' && req.user?.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' });
    res.json({ ok: true, messages: Array.isArray(deal.messages) ? deal.messages : [] });
  } catch (err) {
    console.error('Error fetching deal messages:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch messages' });
  }
});

// POST /api/deals/:id/escrow/mock-fund - create mock funded state with party confirmation proof
router.post('/:id/escrow/mock-fund', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (!['seller', 'buyer', 'mediator'].includes(role) && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    if (isEscrowFinalized(deal)) {
      return res.status(409).json({ ok: false, error: 'Escrow already finalized' });
    }

    const current = String(deal.escrow?.status || 'draft');
    if (!['draft', 'funded_mock', 'funded_live', 'awaiting_receipt', 'disputed'].includes(current)) {
      return res.status(400).json({ ok: false, error: `Mock funding not allowed from ${current}` });
    }

    const amount = Number(req.body?.amount ?? deal.totalAmount ?? 0);
    const currency = sanitize(req.body?.currency || deal.currency || 'USD') || 'USD';
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, error: 'A valid amount is required' });
    }

    const proofNote = sanitize(req.body?.proofNote || 'Mock transfer confirmed by party');
    const screenshotUrl = sanitize(req.body?.screenshotUrl || '');

    deal.escrow = {
      ...(deal.escrow || {}),
      fundingMode: 'mock',
      status: 'funded_mock',
      fundedAmount: amount,
      fundedCurrency: currency,
      fundedAt: new Date(),
      mockTransferProofs: [
        ...((deal.escrow && Array.isArray(deal.escrow.mockTransferProofs)) ? deal.escrow.mockTransferProofs : []),
        {
          actor: role === 'none' ? 'system' : role,
          userId: req.user.id,
          note: proofNote,
          screenshotUrl,
          confirmedAt: new Date(),
        },
      ],
    };
    if (deal.status === 'draft') deal.status = 'active';

    deal.messages.push({ author: 'system', text: `Escrow mock-funded: ${currency} ${amount}` });
    await deal.save();
    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error mock-funding escrow:', err);
    res.status(500).json({ ok: false, error: 'Failed to mock-fund escrow' });
  }
});

// POST /api/deals/:id/escrow/confirm-receipt - buyer confirms receipt/authenticity
router.post('/:id/escrow/confirm-receipt', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (role !== 'buyer' && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Only buyer can confirm receipt' });
    }

    const current = String(deal.escrow?.status || 'draft');
    if (!['funded_mock', 'funded_live', 'awaiting_receipt'].includes(current)) {
      return res.status(400).json({ ok: false, error: `Receipt confirmation not allowed from ${current}` });
    }

    if (String(deal.dispute?.status || 'none') === 'open') {
      return res.status(409).json({ ok: false, error: 'Cannot confirm receipt while dispute is open' });
    }

    deal.escrow = {
      ...(deal.escrow || {}),
      status: 'buyer_confirmed',
    };
    deal.messages.push({ author: 'system', text: 'Buyer confirmed receipt and authenticity' });
    await deal.save();
    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error confirming receipt:', err);
    res.status(500).json({ ok: false, error: 'Failed to confirm receipt' });
  }
});

// POST /api/deals/:id/escrow/release - release escrow (seller/mediator/admin after buyer confirmation)
router.post('/:id/escrow/release', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (!['seller', 'creator', 'shipper', 'mediator'].includes(role) && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    if (isEscrowFinalized(deal)) {
      return res.status(409).json({ ok: false, error: 'Escrow already finalized' });
    }

    const current = String(deal.escrow?.status || 'draft');
    if (!['buyer_confirmed', 'disputed', 'funded_mock', 'funded_live', 'awaiting_receipt'].includes(current)) {
      return res.status(400).json({ ok: false, error: `Release not allowed from ${current}` });
    }

    if (String(deal.dispute?.status || 'none') === 'open' && req.user?.role !== 'admin' && role !== 'mediator') {
      return res.status(409).json({ ok: false, error: 'Cannot release while dispute is open' });
    }

    if (String(deal.escrow?.status || 'draft') !== 'buyer_confirmed' && req.user?.role !== 'admin' && role !== 'mediator') {
      return res.status(400).json({ ok: false, error: 'Buyer confirmation required before release' });
    }

    deal.escrow = {
      ...(deal.escrow || {}),
      status: 'released',
      releasedAt: new Date(),
      releasedBy: req.user.id,
    };
    if (deal.status !== 'completed') deal.status = 'completed';
    deal.messages.push({ author: 'system', text: 'Escrow released to seller' });
    await deal.save();

    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error releasing escrow:', err);
    res.status(500).json({ ok: false, error: 'Failed to release escrow' });
  }
});

// POST /api/deals/:id/escrow/refund - refund escrow (seller/mediator/admin)
router.post('/:id/escrow/refund', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (!['seller', 'mediator'].includes(role) && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    if (isEscrowFinalized(deal)) {
      return res.status(409).json({ ok: false, error: 'Escrow already finalized' });
    }

    const current = String(deal.escrow?.status || 'draft');
    if (!['funded_mock', 'funded_live', 'awaiting_receipt', 'buyer_confirmed', 'disputed'].includes(current)) {
      return res.status(400).json({ ok: false, error: `Refund not allowed from ${current}` });
    }

    deal.escrow = {
      ...(deal.escrow || {}),
      status: 'refunded',
      refundedAt: new Date(),
      refundedBy: req.user.id,
    };
    deal.status = 'cancelled';
    deal.messages.push({ author: 'system', text: 'Escrow refunded to buyer' });
    await deal.save();

    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error refunding escrow:', err);
    res.status(500).json({ ok: false, error: 'Failed to refund escrow' });
  }
});

// POST /api/deals/:id/dispute - open dispute and attach initial evidence
router.post('/:id/dispute', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (!['buyer', 'seller', 'creator', 'shipper', 'mediator'].includes(role) && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    if (String(deal.dispute?.status || 'none') === 'open') {
      return res.status(409).json({ ok: false, error: 'A dispute is already open for this deal' });
    }

    const escrowStatus = String(deal.escrow?.status || 'draft');
    if (escrowStatus === 'draft') {
      return res.status(400).json({ ok: false, error: 'Escrow must be funded before opening a dispute' });
    }

    const reason = sanitize(req.body?.reason || 'Unspecified dispute');
    const details = sanitize(req.body?.details || '');
    const attachmentUrl = sanitize(req.body?.attachmentUrl || '');

    if (!deal.mediatorId) {
      const mediatorUser = await resolvePlatformMediatorUser(req.user?.role === 'admin' ? req.user.id : '');
      if (mediatorUser?._id) {
        deal.mediatorId = mediatorUser._id;
        deal.mediation = {
          ...(deal.mediation || {}),
          mode: 'platform',
          status: 'assigned',
          assignedBy: req.user.id,
          assignedAt: new Date(),
        };
      }
    }

    deal.dispute = {
      ...(deal.dispute || {}),
      status: 'open',
      openedBy: req.user.id,
      openedAt: new Date(),
      reason,
      details,
      evidence: [
        ...((deal.dispute && Array.isArray(deal.dispute.evidence)) ? deal.dispute.evidence : []),
        {
          authorId: req.user.id,
          role: role === 'none' ? 'system' : role,
          note: details || reason,
          attachmentUrl,
          createdAt: new Date(),
        },
      ],
    };
    deal.escrow = { ...(deal.escrow || {}), status: 'disputed' };
    deal.messages.push({ author: 'system', text: `Dispute opened: ${reason}` });
    if (deal.mediatorId) {
      deal.messages.push({ author: 'system', text: `Mediator assigned: ${String(deal.mediatorId)}` });
    }
    await deal.save();

    res.status(201).json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error opening dispute:', err);
    res.status(500).json({ ok: false, error: 'Failed to open dispute' });
  }
});

// POST /api/deals/:id/mediator/auto-assign - assign platform mediator (admin preferred)
router.post('/:id/mediator/auto-assign', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (!['seller', 'mediator'].includes(role) && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const requestedAdminId = sanitize(req.body?.adminUserId || '');
    const mediatorUser = await resolvePlatformMediatorUser(req.user?.role === 'admin' ? (requestedAdminId || req.user.id) : '');
    if (!mediatorUser?._id) {
      return res.status(404).json({ ok: false, error: 'No admin mediator account is currently available' });
    }

    deal.mediatorId = mediatorUser._id;
    deal.mediation = {
      ...(deal.mediation || {}),
      mode: 'platform',
      status: 'assigned',
      assignedBy: req.user.id,
      assignedAt: new Date(),
      approvalNote: sanitize(req.body?.note || 'Platform mediator assigned'),
    };
    deal.messages.push({ author: 'system', text: `Platform mediator assigned: ${String(mediatorUser._id)}` });
    await deal.save();

    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error auto-assigning mediator:', err);
    res.status(500).json({ ok: false, error: 'Failed to auto-assign mediator' });
  }
});

// POST /api/deals/:id/mediator/request-custom - parties can request a trusted third-party mediator
router.post('/:id/mediator/request-custom', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (!['buyer', 'seller', 'creator', 'shipper', 'mediator'].includes(role) && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const name = sanitize(req.body?.name || '');
    const email = sanitize(req.body?.email || '');
    const contact = sanitize(req.body?.contact || '');
    const notes = sanitize(req.body?.notes || '');
    const userId = sanitize(req.body?.userId || '');

    if (!name && !email && !contact && !userId) {
      return res.status(400).json({ ok: false, error: 'Provide at least one mediator identifier (name, email, contact, or userId)' });
    }

    deal.mediation = {
      ...(deal.mediation || {}),
      mode: 'custom',
      status: 'requested',
      requestedBy: req.user.id,
      requestedAt: new Date(),
      customRequest: {
        name,
        email,
        contact,
        userId: isObjectIdHex(userId) ? userId : undefined,
        notes,
      },
      approvalNote: '',
    };
    deal.messages.push({ author: 'system', text: `Custom mediator requested by ${role}` });
    await deal.save();

    res.status(201).json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error requesting custom mediator:', err);
    res.status(500).json({ ok: false, error: 'Failed to request custom mediator' });
  }
});

// PUT /api/deals/:id/mediator/approve - admin approves or declines mediator request
router.put('/:id/mediator/approve', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Admin approval required' });
    }

    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const action = sanitize(req.body?.action || 'approve').toLowerCase();
    const note = sanitize(req.body?.note || '');
    if (!['approve', 'decline'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'action must be approve or decline' });
    }

    if (String(deal.mediation?.status || 'none') !== 'requested') {
      return res.status(409).json({ ok: false, error: 'No pending mediator request to process' });
    }

    if (action === 'decline') {
      if (!deal.mediation) deal.mediation = {};
      deal.mediation.status = 'declined';
      deal.mediation.assignedBy = req.user.id;
      deal.mediation.assignedAt = new Date();
      deal.mediation.approvalNote = note || 'Mediator request declined by admin';
      deal.messages.push({ author: 'system', text: 'Mediator request declined by admin' });
      await deal.save();
      return res.json({ ok: true, item: toPublicDeal(deal) });
    }

    const mediatorUserId = sanitize(req.body?.mediatorUserId || '');
    let mediatorUser = null;
    if (mediatorUserId && isObjectIdHex(mediatorUserId)) {
      mediatorUser = await User.findById(mediatorUserId).select('_id');
      if (!mediatorUser) return res.status(404).json({ ok: false, error: 'Requested mediator user not found' });
    }

    if (!mediatorUser && isObjectIdHex(String(deal.mediation?.customRequest?.userId || ''))) {
      mediatorUser = await User.findById(String(deal.mediation.customRequest.userId)).select('_id');
    }

    if (!mediatorUser) {
      mediatorUser = await resolvePlatformMediatorUser(req.user.id);
    }

    if (!mediatorUser?._id) {
      return res.status(404).json({ ok: false, error: 'No eligible mediator user found for approval' });
    }

    deal.mediatorId = mediatorUser._id;
    if (!deal.mediation) deal.mediation = {};
    deal.mediation.status = 'approved';
    deal.mediation.assignedBy = req.user.id;
    deal.mediation.assignedAt = new Date();
    deal.mediation.approvalNote = note || 'Mediator request approved by admin';
    deal.messages.push({ author: 'system', text: `Mediator approved by admin: ${String(mediatorUser._id)}` });
    await deal.save();

    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error approving mediator request:', err);
    res.status(500).json({ ok: false, error: 'Failed to approve mediator request' });
  }
});

// PUT /api/deals/:id/dispute/resolve - mediator/admin resolution
router.put('/:id/dispute/resolve', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    if (String(deal.dispute?.status || 'none') !== 'open') {
      return res.status(400).json({ ok: false, error: 'No open dispute to resolve' });
    }
    if (!canResolveDispute(req, deal)) {
      return res.status(403).json({ ok: false, error: 'Mediator/admin privileges required' });
    }

    const decision = sanitize(req.body?.decision || 'refund').toLowerCase();
    const note = sanitize(req.body?.note || '');
    if (!['release', 'refund'].includes(decision)) {
      return res.status(400).json({ ok: false, error: 'decision must be release or refund' });
    }
    const resolutionCode = sanitize(req.body?.resolutionCode || '').toUpperCase();
    const allowedResolutionCodes = DISPUTE_REASON_CODES[decision] || [];
    if (!resolutionCode || !allowedResolutionCodes.includes(resolutionCode)) {
      return res.status(400).json({
        ok: false,
        error: `resolutionCode is required and must be one of: ${allowedResolutionCodes.join(', ')}`,
      });
    }

    const resolvedAt = new Date();
    const resolutionHash = sha256Hex(
      JSON.stringify({
        dealId: String(deal._id),
        decision,
        resolutionCode,
        note,
        resolvedBy: String(req.user.id || ''),
        resolvedAt: resolvedAt.toISOString(),
      })
    );

    deal.dispute = {
      ...(deal.dispute || {}),
      status: decision === 'release' ? 'resolved_release' : 'resolved_refund',
      resolvedBy: req.user.id,
      resolvedAt,
      resolutionCode,
      resolutionNote: note,
      resolutionHash,
    };

    const forfeitedParties = Array.isArray(req.body?.forfeitedParties)
      ? req.body.forfeitedParties.filter((p) => ['creator', 'shipper'].includes(String(p)))
      : decision === 'refund'
        ? ['creator', 'shipper']
        : [];
    const creatorForfeitPct = forfeitedParties.includes('creator')
      ? clamp(toFiniteNumber(deal?.pva?.collateral?.creatorStakePct, 0), 0, 100)
      : 0;
    const shipperForfeitPct = forfeitedParties.includes('shipper')
      ? clamp(toFiniteNumber(deal?.pva?.collateral?.shipperStakePct, 0), 0, 100)
      : 0;

    // Mutate pva in place so Mongoose keeps nested subdocs (e.g. roleAcceptance) for classic deals.
    if (!deal.pva) deal.pva = {};
    deal.pva.collateralOutcome = {
      decision,
      executedAt: resolvedAt,
      forfeitedParties,
      creatorForfeitPct,
      shipperForfeitPct,
      notes: sanitize(req.body?.collateralNote || ''),
    };
    deal.pva.payoutPreview = buildPvaPayoutPreview(
      Number(deal.totalAmount || 0),
      deal.pva?.split || {},
      deal.currency || 'USD',
      decision === 'release' ? 'released' : 'refunded'
    ).map((line) => {
      if (decision === 'refund' && forfeitedParties.includes(String(line.role || ''))) {
        return { ...line, status: 'forfeited' };
      }
      return line;
    });
    deal.escrow = {
      ...(deal.escrow || {}),
      status: decision === 'release' ? 'released' : 'refunded',
      releasedAt: decision === 'release' ? new Date() : deal.escrow?.releasedAt,
      refundedAt: decision === 'refund' ? new Date() : deal.escrow?.refundedAt,
      releasedBy: decision === 'release' ? req.user.id : deal.escrow?.releasedBy,
      refundedBy: decision === 'refund' ? req.user.id : deal.escrow?.refundedBy,
    };
    if (decision === 'release') deal.status = 'completed';
    if (decision === 'refund') deal.status = 'cancelled';
    deal.messages.push({ author: 'system', text: `Dispute resolved: ${decision} (${resolutionCode})` });
    if (forfeitedParties.length) {
      deal.messages.push({
        author: 'system',
        text: `Collateral executed: ${forfeitedParties.join(', ')} forfeiture applied`,
      });
    }
    await deal.save();

    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error resolving dispute:', err);
    res.status(500).json({ ok: false, error: 'Failed to resolve dispute' });
  }
});

// GET /api/deals/:id/reports/resolution-certificate - export compact signed-ish certificate for a resolved dispute
router.get('/:id/reports/resolution-certificate', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (role === 'none' && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    if (String(deal.dispute?.status || 'none') !== 'resolved_release' && String(deal.dispute?.status || 'none') !== 'resolved_refund') {
      return res.status(409).json({ ok: false, error: 'Resolution certificate is only available after a dispute is resolved' });
    }

    const certificate = {
      certificateType: 'deal-resolution-certificate-v1',
      certificateId: `cert_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.id,
      dealId: String(deal._id),
      decision: deal.dispute?.status === 'resolved_release' ? 'release' : 'refund',
      resolutionCode: deal.dispute?.resolutionCode || '',
      resolutionHash: deal.dispute?.resolutionHash || '',
      resolutionNote: deal.dispute?.resolutionNote || '',
      resolvedAt: deal.dispute?.resolvedAt || null,
      resolvedBy: String(deal.dispute?.resolvedBy || ''),
      mediatorId: String(deal.mediatorId || ''),
      escrowStatus: deal.escrow?.status || 'draft',
      disputeStatus: deal.dispute?.status || 'none',
    };
    certificate.certificateHash = sha256Hex(JSON.stringify(certificate));

    deal.messages.push({ author: 'system', text: `Resolution certificate generated: ${certificate.certificateId}` });
    await deal.save();

    res.json({ ok: true, certificate });
  } catch (err) {
    console.error('Error generating resolution certificate:', err);
    res.status(500).json({ ok: false, error: 'Failed to generate resolution certificate' });
  }
});

// GET /api/deals/:id/reports/export-bundle - combined dispute/certificate/export artifact
router.get('/:id/reports/export-bundle', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (role === 'none' && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const statusFilter = sanitize(req.query?.queueStatus || '').toLowerCase();
    const queue = Array.isArray(deal.outboundDispatchQueue) ? deal.outboundDispatchQueue : [];
    const filteredQueue = statusFilter && ['queued', 'sent', 'failed'].includes(statusFilter)
      ? queue.filter((item) => String(item.status || '').toLowerCase() === statusFilter)
      : queue;

    const certificate = ['resolved_release', 'resolved_refund'].includes(String(deal.dispute?.status || 'none'))
      ? {
          certificateType: 'deal-resolution-certificate-v1',
          decision: deal.dispute?.status === 'resolved_release' ? 'release' : 'refund',
          resolutionCode: deal.dispute?.resolutionCode || '',
          resolutionHash: deal.dispute?.resolutionHash || '',
          resolutionNote: deal.dispute?.resolutionNote || '',
          resolvedAt: deal.dispute?.resolvedAt || null,
          resolvedBy: String(deal.dispute?.resolvedBy || ''),
          mediatorId: String(deal.mediatorId || ''),
          escrowStatus: deal.escrow?.status || 'draft',
          disputeStatus: deal.dispute?.status || 'none',
        }
      : null;

    const bundle = {
      bundleType: 'deal-dispute-export-bundle-v1',
      bundleId: `bundle_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.id,
      deal: {
        id: String(deal._id),
        title: deal.title || '',
        status: deal.status || 'draft',
        escrowStatus: deal.escrow?.status || 'draft',
        disputeStatus: deal.dispute?.status || 'none',
        mediatorId: String(deal.mediatorId || ''),
      },
      certificate,
      packet: ['resolved_release', 'resolved_refund'].includes(String(deal.dispute?.status || 'none'))
        ? {
            packetType: 'fraud-response-v1',
            packetId: `packet_export_${String(deal._id)}`,
            dealId: String(deal._id),
            dispute: deal.dispute || { status: 'none' },
            timeline: (deal.messages || []).slice(-100).map((m) => ({
              at: m.createdAt || null,
              author: m.author || 'system',
              text: m.text || '',
            })),
            outboundTargets: filteredQueue.flatMap((q) => Array.isArray(q.targets) ? q.targets : []),
          }
        : null,
      queue: filteredQueue.map((item) => ({
        packetId: item.packetId,
        packetHash: item.packetHash || '',
        status: item.status || 'queued',
        attempts: Number(item.attempts || 0),
        nextAttemptAt: item.nextAttemptAt || null,
        sentAt: item.sentAt || null,
        lastStatusCode: item.lastStatusCode || null,
        lastError: item.lastError || '',
        targets: Array.isArray(item.targets) ? item.targets : [],
      })),
      summary: {
        messages: Array.isArray(deal.messages) ? deal.messages.length : 0,
        evidence: Array.isArray(deal.dispute?.evidence) ? deal.dispute.evidence.length : 0,
        queueItems: filteredQueue.length,
        failedQueueItems: queue.filter((item) => String(item.status || '').toLowerCase() === 'failed').length,
      },
    };
    bundle.bundleHash = sha256Hex(JSON.stringify(bundle));

    deal.messages.push({ author: 'system', text: `Export bundle generated: ${bundle.bundleId}` });
    await deal.save();

    res.json({ ok: true, bundle });
  } catch (err) {
    console.error('Error generating export bundle:', err);
    res.status(500).json({ ok: false, error: 'Failed to generate export bundle' });
  }
});

// GET /api/deals/:id/dispute - fetch dispute details for deal participants
router.get('/:id/dispute', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    const role = dealRoleForUser(deal, req.user.id);
    if (role === 'none' && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    res.json({ ok: true, dispute: deal.dispute || { status: 'none' } });
  } catch (err) {
    console.error('Error fetching dispute:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch dispute' });
  }
});

// POST /api/deals/:id/dispute/evidence - append dispute evidence from a participant
router.post('/:id/dispute/evidence', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (!['buyer', 'seller', 'creator', 'shipper', 'mediator'].includes(role) && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    if (String(deal.dispute?.status || 'none') !== 'open') {
      return res.status(400).json({ ok: false, error: 'Dispute is not open' });
    }

    const note = sanitize(req.body?.note || '');
    const attachmentUrl = sanitize(req.body?.attachmentUrl || '');
    if (!note && !attachmentUrl) {
      return res.status(400).json({ ok: false, error: 'note or attachmentUrl is required' });
    }

    const currentEvidence = Array.isArray(deal.dispute?.evidence) ? deal.dispute.evidence : [];
    deal.dispute = {
      ...(deal.dispute || {}),
      evidence: [
        ...currentEvidence,
        {
          authorId: req.user.id,
          role: role === 'none' ? 'system' : role,
          note,
          attachmentUrl,
          createdAt: new Date(),
        },
      ],
    };
    deal.messages.push({ author: 'system', text: `Dispute evidence added by ${role}` });
    await deal.save();

    res.status(201).json({ ok: true, item: toPublicDeal(deal), dispute: deal.dispute });
  } catch (err) {
    console.error('Error adding dispute evidence:', err);
    res.status(500).json({ ok: false, error: 'Failed to add dispute evidence' });
  }
});

// POST /api/deals/:id/reports/fraud-packet - generate packet and optionally record outbound dispatch targets
router.post('/:id/reports/fraud-packet', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (role === 'none' && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const outbound = req.body?.outbound && typeof req.body.outbound === 'object' ? req.body.outbound : {};
    const nowIso = new Date().toISOString();
    const packet = {
      packetType: 'fraud-response-v1',
      packetId: `packet_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
      generatedAt: nowIso,
      generatedBy: req.user.id,
      deal: {
        id: String(deal._id),
        title: deal.title || '',
        status: deal.status || 'draft',
        escrowStatus: deal.escrow?.status || 'draft',
        currency: deal.currency || 'USD',
        totalAmount: deal.totalAmount || 0,
      },
      parties: {
        sellerUserId: String(deal.ownerId || ''),
        buyerUserId: String(deal.counterparty?.userId || ''),
        mediatorUserId: String(deal.mediatorId || ''),
      },
      dispute: deal.dispute || { status: 'none' },
      timeline: (deal.messages || []).slice(-100).map((m) => ({
        at: m.createdAt || null,
        author: m.author || 'system',
        text: m.text || '',
      })),
      outbound: {
        sendRequested: Boolean(outbound.sendRequested),
        approvedByAdmin: Boolean(outbound.approvedByAdmin),
        targets: Array.isArray(outbound.targets) ? outbound.targets : [],
      },
    };

    if (packet.outbound.sendRequested && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Only admin can enqueue outbound fraud packet dispatch' });
    }

    if (packet.outbound.sendRequested) {
      const packetHash = sha256Hex(JSON.stringify(packet));
      const queueItem = {
        packetId: packet.packetId,
        packetHash,
        requestedBy: req.user.id,
        approvedBy: req.user.id,
        targets: packet.outbound.targets,
        status: 'queued',
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      deal.outboundDispatchQueue = [...(Array.isArray(deal.outboundDispatchQueue) ? deal.outboundDispatchQueue : []), queueItem];
      packet.outbound.queue = {
        packetId: queueItem.packetId,
        status: queueItem.status,
        targets: queueItem.targets,
        packetHash: queueItem.packetHash,
      };
    }

    deal.messages.push({
      author: 'system',
      text: outbound?.sendRequested
        ? 'Fraud response packet generated with outbound delivery request'
        : 'Fraud response packet generated (download mode)',
    });
    await deal.save();

    res.json({ ok: true, packet });
  } catch (err) {
    console.error('Error generating fraud packet:', err);
    res.status(500).json({ ok: false, error: 'Failed to generate fraud packet' });
  }
});

// GET /api/deals/:id/reports/outbound-queue - fetch outbound dispatch queue
router.get('/:id/reports/outbound-queue', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const role = dealRoleForUser(deal, req.user.id);
    if (role === 'none' && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const statusFilter = sanitize(req.query?.status || '').toLowerCase();
    const queue = Array.isArray(deal.outboundDispatchQueue) ? deal.outboundDispatchQueue : [];
    const filtered = statusFilter && ['queued', 'sent', 'failed'].includes(statusFilter)
      ? queue.filter((item) => String(item.status || '').toLowerCase() === statusFilter)
      : queue;
    res.json({ ok: true, queue: filtered, total: queue.length });
  } catch (err) {
    console.error('Error fetching outbound queue:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch outbound queue' });
  }
});

// PUT /api/deals/:id/reports/outbound/:packetId/status - admin marks dispatch status
router.put('/:id/reports/outbound/:packetId/status', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Admin privileges required' });
    }

    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const packetId = sanitize(req.params.packetId || '');
    const status = sanitize(req.body?.status || '').toLowerCase();
    const lastError = sanitize(req.body?.lastError || '');
    if (!packetId) return res.status(400).json({ ok: false, error: 'packetId is required' });
    if (!['queued', 'sent', 'failed'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'status must be queued, sent, or failed' });
    }

    const queue = Array.isArray(deal.outboundDispatchQueue) ? deal.outboundDispatchQueue : [];
    const item = queue.find((q) => String(q.packetId) === String(packetId));
    if (!item) return res.status(404).json({ ok: false, error: 'Dispatch queue item not found' });

    item.status = status;
    item.updatedAt = new Date();
    item.lastAttemptAt = new Date();
    item.attempts = Number(item.attempts || 0) + 1;
    item.lastError = status === 'failed' ? (lastError || 'Dispatch failed') : '';
    if (status === 'sent') {
      item.sentAt = new Date();
      item.nextAttemptAt = null;
    }
    if (status === 'failed') {
      item.nextAttemptAt = new Date(Date.now() + nextDealDispatchBackoffMs(item.attempts));
    }

    deal.messages.push({ author: 'system', text: `Outbound packet ${packetId} marked as ${status}` });
    await deal.save();

    res.json({ ok: true, item: toPublicDeal(deal), queue });
  } catch (err) {
    console.error('Error updating outbound queue status:', err);
    res.status(500).json({ ok: false, error: 'Failed to update outbound queue status' });
  }
});

// ============ QUICK ORDER WORKFLOW ENDPOINTS ============

// POST /api/deals/quick/initiate - create deal and send initial contact email
// Simple workflow: reach out to counterparty with amount, description, and contact method
router.post('/quick/initiate', authenticateToken, async (req, res) => {
  try {
    const { counterpartyEmail, counterpartyName, amount, currency = 'USD', description, contactMethod = 'email' } = req.body || {};
    
    if (!counterpartyEmail || !counterpartyName || !amount) {
      return res.status(400).json({ ok: false, error: 'counterpartyEmail, counterpartyName, and amount are required' });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ ok: false, error: 'Amount must be greater than 0' });
    }

    // Get current user for sender info
    const seller = await User.findById(req.user.id).select('email name');
    if (!seller) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Create the deal
    const deal = new Deal({
      ownerId: req.user.id,
      title: `Order from ${seller.name || 'PVABazaar'}: ${sanitize(description || 'Custom Order')}`,
      description: sanitize(description || ''),
      counterparty: {
        name: sanitize(counterpartyName),
        contact: sanitize(counterpartyEmail),
        walletAddress: '', // Will be provided on acceptance
      },
      totalAmount: Number(amount),
      currency: sanitize(currency) || 'USD',
      status: 'active',
      escrow: {
        fundingMode: 'mock',
        status: 'draft',
        fundedAmount: Number(amount),
        fundedCurrency: sanitize(currency) || 'USD',
        mockTransferProofs: [],
      },
      dispute: { status: 'none', evidence: [] },
      mediation: { mode: 'none', status: 'none' },
      messages: [
        { author: 'system', text: 'Quick order initiated' },
        { author: 'system', text: `Order amount: ${currency} ${amount}` },
      ],
    });

    await deal.save();

    // Send initiation email to counterparty
    try {
      const { sendDealInitiationEmail } = require('../service/emailService');
      await sendDealInitiationEmail({
        to: counterpartyEmail,
        sellerName: seller.name || 'A seller',
        sellerEmail: seller.email,
        dealId: String(deal._id),
        amount,
        currency,
        description: description || 'Custom order',
        joinUrl: `${req.get('origin') || 'https://pvabazaar.org'}/#/deals/quick/${String(deal._id)}`,
      });
    } catch (emailErr) {
      console.warn('⚠️ Failed to send deal initiation email (non-blocking):', emailErr.message);
      // Don't fail the request, deal was created
    }

    res.status(201).json({ ok: true, dealId: String(deal._id), item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error initiating quick order:', err);
    res.status(500).json({ ok: false, error: 'Failed to initiate order' });
  }
});

// POST /api/deals/:id/quick/accept - counterparty accepts and provides payment/crypto info
router.post('/:id/quick/accept', authenticateToken, async (req, res) => {
  try {
    const { walletAddress, paymentMethod = 'crypto', additionalInfo = '' } = req.body || {};
    
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    // Verify counterparty
    if (deal.counterparty?.contact !== req.user.email) {
      return res.status(403).json({ ok: false, error: 'Unauthorized: you are not the counterparty for this deal' });
    }

    const counterpartyUser = await User.findById(req.user.id).select('email name');

    // Update deal with counterparty acceptance
    deal.counterparty = {
      ...(deal.counterparty || {}),
      userId: req.user.id,
      walletAddress: sanitize(walletAddress || ''),
    };
    deal.messages.push({
      author: 'system',
      text: `Counterparty accepted: ${paymentMethod} | Wallet: ${sanitize(walletAddress || 'N/A')}`,
    });
    deal.status = 'active';

    await deal.save();

    // Get seller to send acceptance email
    const seller = await User.findById(deal.ownerId).select('email name');

    // Send acceptance email to seller
    try {
      const { sendDealAcceptanceEmail } = require('../service/emailService');
      await sendDealAcceptanceEmail({
        to: seller.email,
        sellerName: seller.name || 'Seller',
        buyerName: counterpartyUser.name || 'Buyer',
        buyerEmail: counterpartyUser.email,
        dealId: String(deal._id),
        amount: deal.totalAmount,
        currency: deal.currency,
        walletAddress: sanitize(walletAddress || 'Provided by buyer'),
        paymentMethod,
        additionalInfo: sanitize(additionalInfo || ''),
      });
    } catch (emailErr) {
      console.warn('⚠️ Failed to send acceptance email (non-blocking):', emailErr.message);
    }

    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error accepting quick order:', err);
    res.status(500).json({ ok: false, error: 'Failed to accept order' });
  }
});

// POST /api/deals/:id/quick/mock-confirm - both parties confirm mock payment (sends confirmation emails)
router.post('/:id/quick/mock-confirm', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });

    const isSeller = String(deal.ownerId) === String(req.user.id);
    const isCounterparty = deal.counterparty?.userId && String(deal.counterparty.userId) === String(req.user.id);

    if (!isSeller && !isCounterparty) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const actor = isSeller ? 'seller' : 'buyer';
    const currentUser = await User.findById(req.user.id).select('email name');

    // Update escrow status if both parties have confirmed
    if (deal.escrow?.status === 'draft') {
      deal.escrow.status = 'funded_mock';
      deal.escrow.fundedAt = new Date();
    }

    deal.messages.push({ author: 'system', text: `${actor} confirmed mock payment` });

    // Check if both parties have confirmed
    const mockProofs = deal.escrow?.mockTransferProofs || [];
    const hasBothConfirmations = mockProofs.length >= 2 || 
      (mockProofs.some(p => p.actor === 'seller') && mockProofs.some(p => p.actor === 'buyer'));

    if (!hasBothConfirmations) {
      deal.escrow = {
        ...(deal.escrow || {}),
        mockTransferProofs: [
          ...mockProofs,
          { actor, userId: req.user.id, confirmedAt: new Date(), note: 'Mock payment confirmed' },
        ],
      };
    }

    await deal.save();

    // Send confirmation email to both parties
    try {
      const { sendMockConfirmationEmail } = require('../service/emailService');
      const otherParty = isSeller ? 
        await User.findById(deal.counterparty?.userId).select('email name') :
        await User.findById(deal.ownerId).select('email name');

      if (otherParty?.email) {
        await sendMockConfirmationEmail({
          to: otherParty.email,
          recipientName: otherParty.name || 'Recipient',
          dealId: String(deal._id),
          amount: deal.totalAmount,
          currency: deal.currency,
          description: deal.description || deal.title,
          isComplete: hasBothConfirmations || mockProofs.length >= 1,
        });
      }

      // Also send to current user
      await sendMockConfirmationEmail({
        to: currentUser.email,
        recipientName: currentUser.name || 'You',
        dealId: String(deal._id),
        amount: deal.totalAmount,
        currency: deal.currency,
        description: deal.description || deal.title,
        isComplete: hasBothConfirmations || mockProofs.length >= 1,
      });
    } catch (emailErr) {
      console.warn('⚠️ Failed to send confirmation emails (non-blocking):', emailErr.message);
    }

    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error confirming mock order:', err);
    res.status(500).json({ ok: false, error: 'Failed to confirm order' });
  }
});

module.exports = router;

