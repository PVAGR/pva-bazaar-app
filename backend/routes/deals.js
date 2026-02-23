const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const { authMiddleware } = require('../middleware/auth');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

function toPublicDeal(deal) {
  if (!deal) return null;
  const d = deal.toObject ? deal.toObject() : deal;
  // Keep it simple; we can tighten this later when we add counterparty join links.
  return d;
}

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

    const allowed = ['title', 'description', 'counterparty', 'totalAmount', 'currency', 'mediatorFeePct', 'chainId', 'tokenAddress', 'status'];
    for (const key of allowed) {
      if (req.body?.[key] === undefined) continue;
      if (key === 'title' || key === 'description' || key === 'currency' || key === 'tokenAddress' || key === 'status') {
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
router.post('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!deal) return res.status(404).json({ ok: false, error: 'Deal not found' });
    const text = sanitize(req.body?.text);
    if (!text) return res.status(400).json({ ok: false, error: 'Message text is required' });
    deal.messages.push({
      author: 'owner',
      authorWallet: sanitize(req.body?.authorWallet || ''),
      text,
      signature: sanitize(req.body?.signature || ''),
    });
    await deal.save();
    res.status(201).json({ ok: true, item: toPublicDeal(deal) });
  } catch (err) {
    console.error('Error adding deal message:', err);
    res.status(500).json({ ok: false, error: 'Failed to add message' });
  }
});

module.exports = router;

