const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Deal = require('../models/Deal');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const {
  buildDealMessageTypedData,
  buildDealEvidenceTypedData,
  verifyDealSignature,
  normalizeAddress,
} = require('../lib/eip712');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
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

function toPublicDeal(deal) {
  if (!deal) return null;
  const d = deal.toObject ? deal.toObject() : deal;
  // Keep it simple; we can tighten this later when we add counterparty join links.
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
    return { actor: 'counterparty', decoded };
  }

  // Normal user/admin token (requires id ObjectId).
  const subjectId = decoded?.id ? String(decoded.id) : '';
  if (!subjectId || !isObjectIdHex(subjectId)) {
    const err = new Error('Invalid authentication token (subject)');
    err.status = 401;
    throw err;
  }

  const isOwner = String(deal.ownerId) === subjectId;
  const isMediator = deal.mediatorId && String(deal.mediatorId) === subjectId;
  if (!isOwner && !isMediator) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return { actor: isOwner ? 'owner' : 'mediator', decoded };
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
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0, status } = req.query;
    const query = { ownerId: req.user.id };
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

// POST /api/deals - create deal (owner-only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const title = sanitize(req.body?.title);
    const description = sanitize(req.body?.description || '');
    if (!title) return res.status(400).json({ ok: false, error: 'Title is required' });

    const counterparty = req.body?.counterparty || {};
    const payments = Array.isArray(req.body?.payments) ? req.body.payments : [];
    const milestones = Array.isArray(req.body?.milestones) ? req.body.milestones : [];

    const deal = new Deal({
      ownerId: req.user.id,
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
    });

    await deal.save();
    res.status(201).json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error creating deal:', err);
    res.status(500).json({ ok: false, error: 'Failed to create deal' });
  }
});

// GET /api/deals/drafts - fetch create-deal draft for current user
router.get('/drafts', authMiddleware, async (req, res) => {
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
router.put('/drafts', authMiddleware, async (req, res) => {
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
router.delete('/drafts', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { 'preferences.drafts.deals': null, updatedAt: Date.now() }, { new: true });
    res.json({ ok: true, draft: null });
  } catch (err) {
    console.error('Error clearing deal draft:', err);
    res.status(500).json({ ok: false, error: 'Failed to clear deal draft' });
  }
});

// POST /api/deals/:id/invite - generate counterparty join link (owner-only)
router.post('/:id/invite', authMiddleware, async (req, res) => {
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

// POST /api/deals/:id/prepare-escrow - prepare deployment params for escrow on Base
router.post('/:id/prepare-escrow', authMiddleware, async (req, res) => {
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
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    res.json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error fetching deal:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch deal' });
  }
});

// PUT /api/deals/:id - update deal
router.put('/:id', authMiddleware, async (req, res) => {
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
    let authorWallet = sanitize(req.body?.authorWallet || '');
    let signature = sanitize(req.body?.signature || '');

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

    let evidenceAuthorWallet = sanitize(req.body?.authorWallet || '');
    let evidenceSignature = sanitize(req.body?.signature || '');

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

module.exports = router;

