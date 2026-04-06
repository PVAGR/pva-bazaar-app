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

function computeBountyPriority(bounty) {
  const keywordScore = Array.isArray(bounty.keywords) ? bounty.keywords.length * 2 : 0;
  const rewardScore = Number.isFinite(bounty.rewardRaw) ? Math.min(bounty.rewardRaw, 5000) / 25 : 0;
  const statusBoost = bounty.status === 'approved' ? 10 : bounty.status === 'draft_ready' ? 6 : 0;
  const freshnessHours = Math.max(1, (Date.now() - new Date(bounty.createdAt || Date.now()).getTime()) / 3600000);
  const freshnessScore = Math.max(0, 12 - Math.log2(freshnessHours + 1) * 2);
  return Math.round((keywordScore + rewardScore + statusBoost + freshnessScore) * 100) / 100;
}

function buildDispatchPrompt(topBounties, walletAddress) {
  const skills = process.env.BOUNTY_SKILLS || 'web3 development, smart contracts, JavaScript/TypeScript, React, Node.js, Solidity, technical writing';
  const lines = topBounties.map((b, index) => {
    const highValue = (b.rewardRaw || 0) >= 100 ? ' ⭐ HIGH VALUE' : '';
    return [
      `${index + 1}. [${b.platform}] ${b.title}${highValue}`,
      `   status=${b.status} priority=${computeBountyPriority(b)}`,
      `   reward=${b.rewardAmount || 'unknown'} chain=${b.chain || 'base'}`,
      `   url=${b.platformUrl || 'n/a'}`,
    ].join('\n');
  });

  return [
    'OpenClaw mission: prioritize and act on top bounty candidates.',
    `Target payout wallet (Base): ${walletAddress || 'not configured'}`,
    `Operator skills: ${skills}`,
    'Tasks:',
    '- Review these ranked opportunities. Items marked ⭐ HIGH VALUE are priority.',
    '- Recommend top 3 immediate actions with rationale, matching operator skills.',
    '- Draft first submission approach for the #1 candidate.',
    '- For HIGH VALUE items, provide a full execution plan.',
    '',
    'Ranked opportunities:',
    ...lines,
  ].join('\n');
}

function rankBountyCandidates(candidates, { limit = 10, minRewardRaw = 0 } = {}) {
  const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 25);
  const normalizedMinReward = Math.max(0, Number(minRewardRaw) || 0);

  return candidates
    .filter(item => (Number(item.rewardRaw) || 0) >= normalizedMinReward)
    .map(item => ({ ...item, priorityScore: computeBountyPriority(item) }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, normalizedLimit);
}

async function queueOpenClawDispatch({ ranked, walletAddress, event }) {
  const OpenClawMessage = require('../models/OpenClawMessage');
  const prompt = buildDispatchPrompt(ranked, walletAddress);
  return OpenClawMessage.create({
    direction: 'outbound',
    content: prompt,
    event,
    source: 'bounty-hunter-admin',
    processed: false,
    metadata: {
      walletAddress,
      chain: process.env.BOUNTY_PAYOUT_CHAIN || 'base',
      topBountyIds: ranked.map(b => String(b._id)),
      generatedAt: new Date().toISOString(),
    },
  });
}

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

    return res.json({
      ok: true,
      stats,
      totalEarned,
      wonCount: won.length,
      defaultPayoutWallet: process.env.BOUNTY_PAYOUT_WALLET || '',
      defaultPayoutChain: process.env.BOUNTY_PAYOUT_CHAIN || 'base',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

router.get('/ranked', requireAdmin, async (req, res) => {
  try {
    await dbConnect();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
    const statusFilter = req.query.status
      ? req.query.status.split(',').map(s => s.trim()).filter(Boolean)
      : ['discovered', 'draft_ready', 'approved', 'pending_review'];

    const rows = await Bounty.find({ status: { $in: statusFilter } })
      .sort({ createdAt: -1 })
      .limit(250)
      .lean();

    const ranked = rows
      .map(item => ({ ...item, priorityScore: computeBountyPriority(item) }))
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, limit);

    return res.json({ ok: true, ranked, count: ranked.length });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

router.post('/dispatch-top', requireAdmin, async (req, res) => {
  try {
    await dbConnect();
    const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 10, 1), 25);
    const minRewardRaw = Math.max(0, Number(req.body?.minRewardRaw) || 0);
    const walletAddress = String(req.body?.walletAddress || process.env.BOUNTY_PAYOUT_WALLET || '').trim();

    const candidates = await Bounty.find({
      status: { $in: ['discovered', 'draft_ready', 'approved', 'pending_review'] },
    })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    if (!candidates.length) {
      return res.json({ ok: true, queued: false, message: 'No bounty candidates available to dispatch' });
    }

    const ranked = rankBountyCandidates(candidates, { limit, minRewardRaw });
    if (!ranked.length) {
      return res.json({
        ok: true,
        queued: false,
        message: `No candidates met min reward ${minRewardRaw}`,
        minRewardRaw,
      });
    }

    const queued = await queueOpenClawDispatch({
      ranked,
      walletAddress,
      event: 'pvabazaar.bounty.rank.dispatch',
    });

    return res.json({
      ok: true,
      queued: true,
      messageId: String(queued._id),
      walletAddress,
      minRewardRaw,
      rankedCount: ranked.length,
      top: ranked.map(b => ({ id: b._id, title: b.title, platform: b.platform, score: b.priorityScore })),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

router.post('/money-run', requireAdmin, async (req, res) => {
  try {
    await dbConnect();
    const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 10, 1), 25);
    const minRewardRaw = Math.max(0, Number(req.body?.minRewardRaw) || 0);
    const walletAddress = String(req.body?.walletAddress || process.env.BOUNTY_PAYOUT_WALLET || '').trim();
    const { platforms } = req.body || {};

    const scanResults = await runScan({ platforms, generateDrafts: false });

    const candidates = await Bounty.find({
      status: { $in: ['discovered', 'draft_ready', 'approved', 'pending_review'] },
    })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    if (!candidates.length) {
      return res.json({
        ok: true,
        queued: false,
        message: 'Money run completed, but no bounty candidates are available yet.',
        scanResults,
      });
    }

    const ranked = rankBountyCandidates(candidates, { limit, minRewardRaw });
    if (!ranked.length) {
      return res.json({
        ok: true,
        queued: false,
        message: `Money run completed, but no candidates met min reward ${minRewardRaw}.`,
        scanResults,
        minRewardRaw,
      });
    }

    const queued = await queueOpenClawDispatch({
      ranked,
      walletAddress,
      event: 'pvabazaar.bounty.money.run',
    });

    return res.json({
      ok: true,
      queued: true,
      mode: 'quick',
      messageId: String(queued._id),
      walletAddress,
      minRewardRaw,
      rankedCount: ranked.length,
      scanResults,
      top: ranked.map(b => ({ id: b._id, title: b.title, platform: b.platform, score: b.priorityScore })),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ─── POST /api/bounties/scan ──────────────────────────────────────────────────

router.post('/scan', requireAdmin, async (req, res) => {
  try {
    const { platforms } = req.body || {};
    const quick = req.body?.quick !== false;
    const results = await runScan({ platforms, generateDrafts: !quick });
    return res.json({ ok: true, results, mode: quick ? 'quick' : 'full' });
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
