/**
 * routes/bounties.js
 *
 * Admin-only REST API for the BountyHunter system.
 * All routes require a valid admin JWT (same auth as the rest of the admin panel).
 *
 * GET  /api/bounties              – List bounties with optional filters
 * POST /api/bounties/scan         – Trigger a live scan now
 * GET  /api/bounties/:id          – Get single bounty
 * PUT  /api/bounties/:id/review   – Approve / reject / update draft (HITL)
 * POST /api/bounties/:id/submit   – Mark as submitted (stores submission record)
 * POST /api/bounties/:id/payout   – Record a payout (links tx hash)
 * PUT  /api/bounties/:id/draft    – Regenerate AI draft
 * GET  /api/bounties/stats        – Quick stats for the dashboard widget
 */

'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const dbConnect = require('../lib/dbConnect');
const Bounty = require('../models/Bounty');
const { runScan, generateDraft } = require('../service/bountyHunter');

const router = express.Router();

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, message: 'Missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin only' });
    }
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid token' });
  }
}

// ─── GET /api/bounties ────────────────────────────────────────────────────────

router.get('/', requireAdmin, async (req, res) => {
  try {
    await dbConnect();
    const { status, platform, page = 1, limit = 25 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (platform) filter.platform = platform;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [bounties, total] = await Promise.all([
      Bounty.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      Bounty.countDocuments(filter),
    ]);

    return res.json({ ok: true, bounties, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─── GET /api/bounties/stats ──────────────────────────────────────────────────

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    await dbConnect();
    const counts = await Bounty.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const stats = {};
    for (const row of counts) stats[row._id] = row.count;

    const won = await Bounty.find({ status: 'won' }).lean();
    const totalEarned = won.reduce((acc, b) => acc + (b.rewardRaw || 0), 0);

    return res.json({ ok: true, stats, totalEarned, wonCount: won.length });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─── POST /api/bounties/scan ──────────────────────────────────────────────────

router.post('/scan', requireAdmin, async (req, res) => {
  try {
    const { platforms } = req.body || {};
    const results = await runScan({ platforms });
    return res.json({ ok: true, results });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─── GET /api/bounties/:id ────────────────────────────────────────────────────

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    await dbConnect();
    const bounty = await Bounty.findById(req.params.id).lean();
    if (!bounty) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, bounty });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─── PUT /api/bounties/:id/review  (HITL approval / rejection) ───────────────

router.put('/:id/review', requireAdmin, async (req, res) => {
  try {
    await dbConnect();
    const { action, draftContent, reviewNotes } = req.body || {};
    // action: 'approve' | 'reject' | 'skip'

    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).json({ ok: false, message: 'Not found' });

    const statusMap = { approve: 'approved', reject: 'discovered', skip: 'skipped' };
    if (action && statusMap[action]) bounty.status = statusMap[action];
    if (draftContent !== undefined) bounty.draftContent = draftContent;
    if (reviewNotes !== undefined) bounty.reviewNotes = reviewNotes;

    bounty.reviewedBy = req.admin?.username || req.admin?.email || 'admin';
    bounty.reviewedAt = new Date();

    await bounty.save();
    return res.json({ ok: true, bounty });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─── PUT /api/bounties/:id/draft  (Regenerate AI draft) ──────────────────────

router.put('/:id/draft', requireAdmin, async (req, res) => {
  try {
    await dbConnect();
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).json({ ok: false, message: 'Not found' });

    const newDraft = await generateDraft(bounty);
    if (!newDraft) {
      return res.status(503).json({ ok: false, message: 'AI draft generation unavailable (check OPENAI_API_KEY)' });
    }

    bounty.draftContent = newDraft;
    bounty.draftGeneratedAt = new Date();
    bounty.draftModel = 'gpt-4o';
    if (bounty.status === 'discovered') bounty.status = 'draft_ready';

    await bounty.save();
    return res.json({ ok: true, bounty });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─── POST /api/bounties/:id/submit ───────────────────────────────────────────

router.post('/:id/submit', requireAdmin, async (req, res) => {
  try {
    await dbConnect();
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).json({ ok: false, message: 'Not found' });

    bounty.status = 'submitted';
    bounty.submittedAt = new Date();
    bounty.submissionPayload = req.body.submissionPayload || { content: bounty.draftContent };

    await bounty.save();
    return res.json({ ok: true, bounty });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─── POST /api/bounties/:id/payout ───────────────────────────────────────────

router.post('/:id/payout', requireAdmin, async (req, res) => {
  try {
    await dbConnect();
    const { txHash, amount, wallet } = req.body || {};
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).json({ ok: false, message: 'Not found' });

    bounty.status = 'won';
    bounty.payoutTxHash = txHash || '';
    bounty.payoutAmount = amount || bounty.rewardAmount;
    bounty.payoutWallet = wallet || process.env.BOUNTY_PAYOUT_WALLET || '';
    bounty.payoutConfirmedAt = new Date();

    await bounty.save();
    return res.json({ ok: true, bounty });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
