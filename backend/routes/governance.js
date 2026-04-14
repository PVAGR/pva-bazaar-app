const express = require('express');
const crypto = require('crypto');
const { Web3 } = require('web3');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const GovernanceProposal = require('../models/GovernanceProposal');
const GovernanceAdminResponse = require('../models/GovernanceAdminResponse');
const GovernanceProposalSupport = require('../models/GovernanceProposalSupport');
const GovernanceVote = require('../models/GovernanceVote');
const GovernanceWalletChallenge = require('../models/GovernanceWalletChallenge');
const User = require('../models/User');
const { createSystemEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

const router = express.Router();
const web3 = new Web3();

const ALLOWED_OUTCOMES = new Set(['accepted', 'planned', 'deferred', 'rejected']);
const ALLOWED_VOTE_CHOICES = new Set(['yes', 'no', 'abstain']);
const ALLOWED_ADMIN_DECISIONS = new Set(['public', 'conference_queue', 'accepted', 'rejected', 'needs_revision', 'in_execution', 'completed']);
const ALLOWED_VOTE_STATUSES = new Set(['agenda_published', 'vote_window']);
const EXECUTION_ELIGIBLE_DECISIONS = new Set(['accepted', 'in_execution', 'completed']);
const STATUS_ORDER = {
  draft: 0,
  public_discussion: 1,
  threshold_reached: 2,
  conference_queue: 3,
  agenda_published: 4,
  vote_window: 5,
  outcome_published: 6,
  archived: 7,
};

function parsePercentEnv(name, fallbackValue) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallbackValue;
  return Math.min(Math.max(raw, 0), 100);
}

async function getEligibleVoterCount() {
  const verifiedCitizens = await User.countDocuments({ passportStatus: 'verified' });
  if (verifiedCitizens > 0) return verifiedCitizens;
  return User.countDocuments({});
}

function buildQuorumMeta(totalVotes, eligibleVoterCount) {
  const requiredPct = parsePercentEnv('GOVERNANCE_VOTE_QUORUM_PCT', 30);
  const participationPct = eligibleVoterCount > 0 ? (totalVotes / eligibleVoterCount) * 100 : 0;
  return {
    requiredPct,
    participationPct: Number(participationPct.toFixed(2)),
    met: participationPct >= requiredPct,
    eligibleVoterCount,
  };
}

function isForwardStatusTransition(currentStatus, nextStatus) {
  const current = STATUS_ORDER[currentStatus];
  const next = STATUS_ORDER[nextStatus];
  if (current === undefined || next === undefined) return false;
  return next >= current;
}

function validateVoteWindow(voteWindow) {
  const startsAt = voteWindow?.startsAt ? new Date(voteWindow.startsAt) : null;
  const endsAt = voteWindow?.endsAt ? new Date(voteWindow.endsAt) : null;

  if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { ok: false, error: 'voteWindow.startsAt and voteWindow.endsAt are required and must be valid dates' };
  }

  if (endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, error: 'voteWindow.endsAt must be later than voteWindow.startsAt' };
  }

  return { ok: true, startsAt, endsAt };
}

function sanitize(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').trim();
}

function parseCommitteeUserIds() {
  return new Set(
    String(process.env.PEOPLES_COMMITTEE_USER_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

function isCommitteeMember(req) {
  const committeeIds = parseCommitteeUserIds();
  const userId = String(req.user?.id || '');
  return req.user?.role === 'admin' || committeeIds.has(userId);
}

function normalizeWalletAddress(value) {
  const clean = String(value || '').trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(clean) ? clean : '';
}

function normalizeTxHash(value) {
  const clean = String(value || '').trim().toLowerCase();
  return /^0x[a-f0-9]{64}$/.test(clean) ? clean : '';
}

function normalizeAdminDecision(value) {
  const clean = sanitize(value).toLowerCase();
  return ALLOWED_ADMIN_DECISIONS.has(clean) ? clean : '';
}

function expectedLifecycleStatusFromDecision(decision) {
  const normalized = normalizeAdminDecision(decision);
  if (!normalized) return '';
  if (normalized === 'public') return 'public_discussion';
  if (normalized === 'conference_queue') return 'conference_queue';
  return 'outcome_published';
}

function sanitizeExecutionBlock(input) {
  if (!input || typeof input !== 'object') return null;

  const owner = sanitize(input.owner);
  const latestUpdate = sanitize(input.latestUpdate);
  const completed = Boolean(input.completed);
  const progressPercent = Math.min(Math.max(Number(input.progressPercent || 0), 0), 100);
  const milestones = Array.isArray(input.milestones)
    ? input.milestones
      .map((milestone, idx) => ({
        id: sanitize(milestone?.id) || `M-${idx + 1}`,
        title: sanitize(milestone?.title),
        done: Boolean(milestone?.done),
      }))
      .filter((milestone) => Boolean(milestone.title))
    : [];

  return {
    owner,
    milestones,
    progressPercent,
    latestUpdate,
    completed,
  };
}

function sanitizeExecutionUpdate(input) {
  if (!input || typeof input !== 'object') return null;
  const message = sanitize(input.message);
  if (!message) return null;

  const progressCandidate = Number(input.progressPercent);
  const progressPercent = Number.isFinite(progressCandidate)
    ? Math.min(Math.max(progressCandidate, 0), 100)
    : undefined;

  let milestone;
  if (input.milestone && typeof input.milestone === 'object') {
    const title = sanitize(input.milestone.title);
    if (title) {
      milestone = {
        id: sanitize(input.milestone.id),
        title,
        done: Boolean(input.milestone.done),
      };
    }
  }

  return {
    message,
    progressPercent,
    milestone,
  };
}

async function getVerifiedWalletForUser(userId) {
  const user = await User.findById(userId).select('preferences.defaultWalletAddress');
  const wallet = normalizeWalletAddress(user?.preferences?.defaultWalletAddress || '');
  return wallet;
}

async function refreshSupportCount(proposalId) {
  const supportCount = await GovernanceProposalSupport.countDocuments({ proposalId });
  await GovernanceProposal.findByIdAndUpdate(proposalId, { supportCount });
  return supportCount;
}

async function refreshVoteCounts(proposalId) {
  const grouped = await GovernanceVote.aggregate([
    { $match: { proposalId } },
    { $group: { _id: '$choice', count: { $sum: 1 } } },
  ]);

  const voteCounts = { yes: 0, no: 0, abstain: 0 };
  for (const row of grouped) {
    if (row && row._id && voteCounts[row._id] !== undefined) {
      voteCounts[row._id] = row.count;
    }
  }

  await GovernanceProposal.findByIdAndUpdate(proposalId, { voteCounts });
  return voteCounts;
}

router.get('/proposals', async (req, res) => {
  try {
    const { status = '', cycleKey = '', limit = '30', skip = '0' } = req.query;
    const query = {};

    if (status) query.status = status;
    if (cycleKey) query.cycleKey = sanitize(cycleKey);

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
    const parsedSkip = Math.max(parseInt(skip, 10) || 0, 0);

    const items = await GovernanceProposal.find(query)
      .sort({ updatedAt: -1 })
      .limit(parsedLimit)
      .skip(parsedSkip)
      .populate('createdBy', 'name email role')
      .populate('queuedBy', 'name email role')
      .populate('decidedBy', 'name email role');

    const total = await GovernanceProposal.countDocuments(query);

    return res.json({ ok: true, items, total });
  } catch (error) {
    console.error('Error listing proposals:', error);
    return res.status(500).json({ ok: false, error: 'Failed to list proposals' });
  }
});

router.get('/admin-responses', async (_req, res) => {
  try {
    const items = await GovernanceAdminResponse.find({})
      .sort({ updatedAt: -1 })
      .populate('updatedBy', 'name email role');
    return res.json({ ok: true, items });
  } catch (error) {
    console.error('Error listing governance admin responses:', error);
    return res.status(500).json({ ok: false, error: 'Failed to list governance admin responses' });
  }
});

router.get('/admin-responses/sync-health', authenticateToken, adminOnly, async (_req, res) => {
  try {
    const responses = await GovernanceAdminResponse.find({})
      .sort({ updatedAt: -1 })
      .lean();

    const proposalObjectIds = responses
      .map((item) => String(item?.proposalId || '').trim())
      .filter((proposalId) => mongoose.Types.ObjectId.isValid(proposalId));

    const proposals = proposalObjectIds.length
      ? await GovernanceProposal.find({ _id: { $in: proposalObjectIds } })
        .select('_id status title updatedAt')
        .lean()
      : [];

    const proposalMap = new Map(proposals.map((proposal) => [String(proposal._id), proposal]));

    const items = responses.map((item) => {
      const proposalId = String(item?.proposalId || '').trim();
      const expectedLifecycleStatus = expectedLifecycleStatusFromDecision(item?.decision);
      const isObjectId = mongoose.Types.ObjectId.isValid(proposalId);
      const proposal = isObjectId ? proposalMap.get(proposalId) : null;
      const actualLifecycleStatus = proposal?.status || null;

      let syncState = 'local_only';
      if (isObjectId && !proposal) syncState = 'missing';
      if (isObjectId && proposal && !expectedLifecycleStatus) syncState = 'unmapped';
      if (isObjectId && proposal && expectedLifecycleStatus) {
        syncState = expectedLifecycleStatus === actualLifecycleStatus ? 'synced' : 'mismatch';
      }

      return {
        proposalId,
        proposalTitle: proposal?.title || null,
        adminDecision: item?.decision || 'public',
        expectedLifecycleStatus: expectedLifecycleStatus || null,
        actualLifecycleStatus,
        syncState,
        updatedAt: item?.updatedAt || null,
      };
    });

    const summary = items.reduce((acc, item) => {
      acc.total += 1;
      if (item.syncState === 'synced') acc.synced += 1;
      if (item.syncState === 'mismatch') acc.mismatch += 1;
      if (item.syncState === 'missing') acc.missing += 1;
      if (item.syncState === 'local_only') acc.localOnly += 1;
      if (item.syncState === 'unmapped') acc.unmapped += 1;
      return acc;
    }, {
      total: 0,
      synced: 0,
      mismatch: 0,
      missing: 0,
      localOnly: 0,
      unmapped: 0,
    });

    return res.json({ ok: true, summary, items });
  } catch (error) {
    console.error('Error fetching governance admin-response sync health:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch governance sync health' });
  }
});

router.post('/admin-responses/:proposalId/repair-lifecycle', authenticateToken, adminOnly, async (req, res) => {
  try {
    const proposalId = sanitize(req.params?.proposalId);
    if (!proposalId) {
      return res.status(400).json({ ok: false, error: 'proposalId is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      return res.status(400).json({ ok: false, error: 'repair-lifecycle requires a MongoDB proposal id' });
    }

    const adminResponse = await GovernanceAdminResponse.findOne({ proposalId }).lean();
    if (!adminResponse) {
      return res.status(404).json({ ok: false, error: 'Admin response not found for proposal' });
    }

    const expectedLifecycleStatus = expectedLifecycleStatusFromDecision(adminResponse.decision);
    if (!expectedLifecycleStatus) {
      return res.status(409).json({ ok: false, error: 'Cannot map admin decision to lifecycle status' });
    }

    const proposal = await GovernanceProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ ok: false, error: 'Proposal not found' });
    }

    const previousStatus = proposal.status;
    proposal.status = expectedLifecycleStatus;
    await proposal.save();

    return res.json({
      ok: true,
      repaired: previousStatus !== proposal.status,
      proposalId,
      adminDecision: adminResponse.decision,
      previousStatus,
      status: proposal.status,
    });
  } catch (error) {
    console.error('Error repairing governance lifecycle status:', error);
    return res.status(500).json({ ok: false, error: 'Failed to repair governance lifecycle status' });
  }
});

router.put('/admin-responses/:proposalId', authenticateToken, adminOnly, async (req, res) => {
  try {
    const proposalId = sanitize(req.params?.proposalId);
    if (!proposalId) {
      return res.status(400).json({ ok: false, error: 'proposalId is required' });
    }

    const update = {
      updatedBy: req.user.id,
    };

    if (req.body?.decision !== undefined) {
      const decision = normalizeAdminDecision(req.body.decision);
      if (!decision) {
        return res.status(400).json({ ok: false, error: 'Invalid admin decision value' });
      }
      update.decision = decision;
    }

    if (req.body?.reason !== undefined) {
      update.reason = sanitize(req.body.reason);
    }
    if (req.body?.nextStep !== undefined) {
      update.nextStep = sanitize(req.body.nextStep);
    }
    if (req.body?.targetTimeline !== undefined) {
      update.targetTimeline = sanitize(req.body.targetTimeline);
    }
    if (req.body?.executionBlock !== undefined) {
      update.executionBlock = sanitizeExecutionBlock(req.body.executionBlock);
    }

    const item = await GovernanceAdminResponse.findOneAndUpdate(
      { proposalId },
      {
        $set: update,
        $setOnInsert: {
          proposalId,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    ).populate('updatedBy', 'name email role');

    return res.json({ ok: true, item });
  } catch (error) {
    console.error('Error saving governance admin response:', error);
    return res.status(500).json({ ok: false, error: 'Failed to save governance admin response' });
  }
});

router.get('/proposals/:proposalId/execution/timeline', async (req, res) => {
  try {
    const proposalId = sanitize(req.params?.proposalId);
    if (!proposalId) {
      return res.status(400).json({ ok: false, error: 'proposalId is required' });
    }

    let proposal = null;
    if (mongoose.Types.ObjectId.isValid(proposalId)) {
      proposal = await GovernanceProposal.findById(proposalId)
        .select('_id title status outcome outcomeRationale plannedTargetDate voteCounts')
        .lean();
    }

    const item = await GovernanceAdminResponse.findOne({ proposalId })
      .populate('updatedBy', 'name email role')
      .populate('executionUpdates.updatedBy', 'name email role');

    return res.json({
      ok: true,
      proposal,
      execution: {
        decision: item?.decision || 'public',
        reason: item?.reason || '',
        nextStep: item?.nextStep || '',
        targetTimeline: item?.targetTimeline || '',
        executionBlock: item?.executionBlock || null,
        updates: item?.executionUpdates || [],
        updatedAt: item?.updatedAt || null,
        updatedBy: item?.updatedBy || null,
      },
    });
  } catch (error) {
    console.error('Error fetching governance execution timeline:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch execution timeline' });
  }
});

router.post('/proposals/:proposalId/execution/updates', authenticateToken, async (req, res) => {
  try {
    if (!isCommitteeMember(req)) {
      return res.status(403).json({ ok: false, error: 'Only committee members can post execution updates' });
    }

    const proposalId = sanitize(req.params?.proposalId);
    if (!proposalId) {
      return res.status(400).json({ ok: false, error: 'proposalId is required' });
    }

    const updateEntry = sanitizeExecutionUpdate(req.body || {});
    if (!updateEntry) {
      return res.status(400).json({ ok: false, error: 'A non-empty message is required for execution updates' });
    }

    const item = await GovernanceAdminResponse.findOne({ proposalId });
    if (!item) {
      return res.status(409).json({ ok: false, error: 'Admin response not initialized for this proposal' });
    }

    if (!EXECUTION_ELIGIBLE_DECISIONS.has(item.decision)) {
      return res.status(409).json({
        ok: false,
        error: `Execution updates require decision in: ${Array.from(EXECUTION_ELIGIBLE_DECISIONS).join(', ')}`,
      });
    }

    const now = new Date();
    const nextUpdate = {
      message: updateEntry.message,
      progressPercent: updateEntry.progressPercent,
      milestone: updateEntry.milestone || null,
      updatedBy: req.user.id,
      createdAt: now,
    };

    const currentBlock = item.executionBlock || {
      owner: '',
      milestones: [],
      progressPercent: 0,
      latestUpdate: '',
      completed: false,
    };

    const nextMilestones = Array.isArray(currentBlock.milestones) ? [...currentBlock.milestones] : [];
    if (nextUpdate.milestone?.title) {
      const milestoneId = nextUpdate.milestone.id || `M-${nextMilestones.length + 1}`;
      const existingIndex = nextMilestones.findIndex((m) => sanitize(m?.id) === milestoneId);
      const milestonePayload = {
        id: milestoneId,
        title: nextUpdate.milestone.title,
        done: Boolean(nextUpdate.milestone.done),
      };
      if (existingIndex >= 0) {
        nextMilestones[existingIndex] = milestonePayload;
      } else {
        nextMilestones.push(milestonePayload);
      }
    }

    const nextProgress = Number.isFinite(nextUpdate.progressPercent)
      ? nextUpdate.progressPercent
      : Number(currentBlock.progressPercent || 0);

    item.executionBlock = {
      owner: currentBlock.owner || '',
      milestones: nextMilestones,
      progressPercent: Math.min(Math.max(nextProgress, 0), 100),
      latestUpdate: nextUpdate.message,
      completed: nextProgress >= 100 || item.decision === 'completed',
    };

    item.executionUpdates = Array.isArray(item.executionUpdates) ? item.executionUpdates : [];
    item.executionUpdates.push(nextUpdate);
    item.updatedBy = req.user.id;

    await item.save();

    const populated = await GovernanceAdminResponse.findById(item._id)
      .populate('updatedBy', 'name email role')
      .populate('executionUpdates.updatedBy', 'name email role');

    dispatchToOpenClaw(createSystemEvent('info', 'Governance execution update posted', {
      proposalId,
      byUser: req.user.id,
      progressPercent: item.executionBlock.progressPercent,
    })).catch((err) => {
      console.warn('OpenClaw dispatch failed (execution update):', err?.message || err);
    });

    return res.status(201).json({
      ok: true,
      executionBlock: populated.executionBlock,
      latestUpdate: populated.executionUpdates[populated.executionUpdates.length - 1],
      updatesCount: populated.executionUpdates.length,
    });
  } catch (error) {
    console.error('Error posting governance execution update:', error);
    return res.status(500).json({ ok: false, error: 'Failed to post execution update' });
  }
});

router.post('/proposals', authenticateToken, async (req, res) => {
  try {
    const walletAddress = await getVerifiedWalletForUser(req.user.id);
    if (!walletAddress) {
      return res.status(403).json({
        ok: false,
        error: 'Wallet verification is required before creating proposals',
      });
    }

    const title = sanitize(req.body?.title);
    const summary = sanitize(req.body?.summary);

    if (!title || !summary) {
      return res.status(400).json({ ok: false, error: 'Title and summary are required' });
    }

    const proposal = await GovernanceProposal.create({
      title,
      summary,
      problem: sanitize(req.body?.problem),
      solution: sanitize(req.body?.solution),
      expectedOutcome: sanitize(req.body?.expectedOutcome),
      tags: Array.isArray(req.body?.tags) ? req.body.tags.map((v) => sanitize(v)).filter(Boolean) : [],
      cycleKey: sanitize(req.body?.cycleKey),
      voteWindow: {
        startsAt: req.body?.voteWindow?.startsAt ? new Date(req.body.voteWindow.startsAt) : undefined,
        endsAt: req.body?.voteWindow?.endsAt ? new Date(req.body.voteWindow.endsAt) : undefined,
      },
      onChain: {
        chainId: Number(req.body?.onChain?.chainId || 8453),
        contractAddress: sanitize(req.body?.onChain?.contractAddress),
        proposalRef: sanitize(req.body?.onChain?.proposalRef),
      },
      createdBy: req.user.id,
    });

    dispatchToOpenClaw(createSystemEvent('info', 'Governance proposal created', {
      proposalId: proposal._id.toString(),
      userId: req.user.id,
      walletAddress,
    })).catch((err) => {
      console.warn('OpenClaw dispatch failed (proposal created):', err?.message || err);
    });

    return res.status(201).json({ ok: true, item: proposal });
  } catch (error) {
    console.error('Error creating proposal:', error);
    return res.status(500).json({ ok: false, error: 'Failed to create proposal' });
  }
});

router.get('/proposals/:proposalId', async (req, res) => {
  try {
    const proposal = await GovernanceProposal.findById(req.params.proposalId)
      .populate('createdBy', 'name email role')
      .populate('queuedBy', 'name email role')
      .populate('decidedBy', 'name email role');

    if (!proposal) {
      return res.status(404).json({ ok: false, error: 'Proposal not found' });
    }

    return res.json({ ok: true, item: proposal });
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch proposal' });
  }
});

router.post('/proposals/:proposalId/support', authenticateToken, async (req, res) => {
  try {
    const walletAddress = await getVerifiedWalletForUser(req.user.id);
    if (!walletAddress) {
      return res.status(403).json({ ok: false, error: 'Wallet verification is required before supporting proposals' });
    }

    const proposal = await GovernanceProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ ok: false, error: 'Proposal not found' });
    }

    const existing = await GovernanceProposalSupport.findOne({
      proposalId: proposal._id,
      userId: req.user.id,
    });

    let supported;
    if (existing) {
      await existing.deleteOne();
      supported = false;
    } else {
      await GovernanceProposalSupport.create({
        proposalId: proposal._id,
        userId: req.user.id,
      });
      supported = true;
    }

    const supportCount = await refreshSupportCount(proposal._id);

    if (proposal.status === 'public_discussion' && supportCount > 0) {
      const threshold = Math.max(parseInt(process.env.GOVERNANCE_SUPPORT_THRESHOLD || '25', 10), 1);
      if (supportCount >= threshold) {
        proposal.status = 'threshold_reached';
        await proposal.save();
      }
    }

    return res.json({ ok: true, supported, supportCount, status: proposal.status });
  } catch (error) {
    console.error('Error toggling proposal support:', error);
    return res.status(500).json({ ok: false, error: 'Failed to support proposal' });
  }
});

router.post('/proposals/:proposalId/queue', authenticateToken, async (req, res) => {
  try {
    if (!isCommitteeMember(req)) {
      return res.status(403).json({ ok: false, error: 'Only committee members can queue proposals' });
    }

    const proposal = await GovernanceProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ ok: false, error: 'Proposal not found' });
    }

    proposal.status = 'conference_queue';
    proposal.cycleKey = sanitize(req.body?.cycleKey || proposal.cycleKey);
    proposal.queuedBy = req.user.id;

    if (req.body?.voteWindow?.startsAt || req.body?.voteWindow?.endsAt) {
      proposal.voteWindow = {
        startsAt: req.body?.voteWindow?.startsAt ? new Date(req.body.voteWindow.startsAt) : proposal.voteWindow?.startsAt,
        endsAt: req.body?.voteWindow?.endsAt ? new Date(req.body.voteWindow.endsAt) : proposal.voteWindow?.endsAt,
      };
    }

    if (req.body?.onChain?.chainId || req.body?.onChain?.contractAddress || req.body?.onChain?.proposalRef) {
      proposal.onChain = {
        ...proposal.onChain,
        chainId: Number(req.body?.onChain?.chainId || proposal.onChain?.chainId || 8453),
        contractAddress: sanitize(req.body?.onChain?.contractAddress || proposal.onChain?.contractAddress),
        proposalRef: sanitize(req.body?.onChain?.proposalRef || proposal.onChain?.proposalRef),
      };
    }

    await proposal.save();

    return res.json({ ok: true, item: proposal });
  } catch (error) {
    console.error('Error queueing proposal:', error);
    return res.status(500).json({ ok: false, error: 'Failed to queue proposal' });
  }
});

router.post('/proposals/:proposalId/status', authenticateToken, async (req, res) => {
  try {
    if (!isCommitteeMember(req)) {
      return res.status(403).json({ ok: false, error: 'Only committee members can change proposal status' });
    }

    const proposal = await GovernanceProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ ok: false, error: 'Proposal not found' });
    }

    const nextStatus = sanitize(req.body?.status).toLowerCase();
    if (!nextStatus || STATUS_ORDER[nextStatus] === undefined) {
      return res.status(400).json({ ok: false, error: 'Invalid status value' });
    }

    if (!isForwardStatusTransition(proposal.status, nextStatus)) {
      return res.status(400).json({
        ok: false,
        error: `Cannot move status backward from ${proposal.status} to ${nextStatus}`,
      });
    }

    if (nextStatus === 'agenda_published' || nextStatus === 'vote_window') {
      const maybeWindow = req.body?.voteWindow || proposal.voteWindow;
      const check = validateVoteWindow(maybeWindow);
      if (!check.ok) {
        return res.status(400).json({ ok: false, error: check.error });
      }

      proposal.voteWindow = {
        startsAt: check.startsAt,
        endsAt: check.endsAt,
      };
    }

    if (nextStatus === 'vote_window') {
      const startsAtMs = proposal.voteWindow?.startsAt ? new Date(proposal.voteWindow.startsAt).getTime() : null;
      const endsAtMs = proposal.voteWindow?.endsAt ? new Date(proposal.voteWindow.endsAt).getTime() : null;
      const now = Date.now();
      if (!startsAtMs || !endsAtMs || now < startsAtMs || now > endsAtMs) {
        return res.status(400).json({ ok: false, error: 'Current time must be inside the configured vote window' });
      }
    }

    if (nextStatus === 'outcome_published') {
      const voteCounts = await refreshVoteCounts(proposal._id);
      const totalVotes = voteCounts.yes + voteCounts.no + voteCounts.abstain;
      const eligibleVoterCount = await getEligibleVoterCount();
      const quorum = buildQuorumMeta(totalVotes, eligibleVoterCount);

      if (totalVotes < 1) {
        return res.status(400).json({ ok: false, error: 'Cannot publish outcome before any votes are recorded' });
      }

      if (!quorum.met) {
        return res.status(400).json({
          ok: false,
          error: 'Cannot publish outcome before quorum is met',
          quorum,
        });
      }
    }

    proposal.status = nextStatus;

    if (req.body?.cycleKey !== undefined) {
      proposal.cycleKey = sanitize(req.body.cycleKey);
    }

    if (req.body?.voteWindow?.startsAt || req.body?.voteWindow?.endsAt) {
      const existingStartsAt = proposal.voteWindow?.startsAt;
      const existingEndsAt = proposal.voteWindow?.endsAt;
      proposal.voteWindow = {
        startsAt: req.body?.voteWindow?.startsAt ? new Date(req.body.voteWindow.startsAt) : existingStartsAt,
        endsAt: req.body?.voteWindow?.endsAt ? new Date(req.body.voteWindow.endsAt) : existingEndsAt,
      };
    }

    await proposal.save();

    return res.json({ ok: true, item: proposal });
  } catch (error) {
    console.error('Error updating proposal status:', error);
    return res.status(500).json({ ok: false, error: 'Failed to update proposal status' });
  }
});

router.post('/proposals/:proposalId/outcome', authenticateToken, async (req, res) => {
  try {
    if (!isCommitteeMember(req)) {
      return res.status(403).json({ ok: false, error: 'Only committee members can publish outcomes' });
    }

    const outcome = sanitize(req.body?.outcome).toLowerCase();
    const outcomeRationale = sanitize(req.body?.outcomeRationale);

    if (!ALLOWED_OUTCOMES.has(outcome)) {
      return res.status(400).json({ ok: false, error: 'Invalid outcome value' });
    }

    if (!outcomeRationale) {
      return res.status(400).json({ ok: false, error: 'Outcome rationale is required' });
    }

    const proposal = await GovernanceProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ ok: false, error: 'Proposal not found' });
    }

    proposal.outcome = outcome;
    proposal.outcomeRationale = outcomeRationale;
    proposal.plannedTargetDate = req.body?.plannedTargetDate ? new Date(req.body.plannedTargetDate) : proposal.plannedTargetDate;
    proposal.decidedBy = req.user.id;
    proposal.status = 'outcome_published';

    if (sanitize(req.body?.onChain?.tallyTxHash)) {
      proposal.onChain = {
        ...proposal.onChain,
        tallyTxHash: sanitize(req.body?.onChain?.tallyTxHash),
      };
    }

    await proposal.save();

    dispatchToOpenClaw(createSystemEvent('info', 'Governance proposal outcome published', {
      proposalId: proposal._id.toString(),
      outcome,
      decidedBy: req.user.id,
    })).catch((err) => {
      console.warn('OpenClaw dispatch failed (proposal outcome):', err?.message || err);
    });

    return res.json({ ok: true, item: proposal });
  } catch (error) {
    console.error('Error publishing proposal outcome:', error);
    return res.status(500).json({ ok: false, error: 'Failed to publish outcome' });
  }
});

router.post('/wallet/challenge', authenticateToken, async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.body?.walletAddress);
    if (!walletAddress) {
      return res.status(400).json({ ok: false, error: 'A valid wallet address is required' });
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const message = [
      'PVA Bazaar Governance Wallet Verification',
      `User: ${req.user.id}`,
      `Wallet: ${walletAddress}`,
      `Nonce: ${nonce}`,
      `ExpiresAt: ${expiresAt.toISOString()}`,
    ].join('\n');

    await GovernanceWalletChallenge.create({
      userId: req.user.id,
      walletAddress,
      nonce,
      message,
      expiresAt,
    });

    return res.json({ ok: true, walletAddress, nonce, message, expiresAt });
  } catch (error) {
    console.error('Error creating wallet challenge:', error);
    return res.status(500).json({ ok: false, error: 'Failed to create wallet challenge' });
  }
});

router.post('/wallet/verify', authenticateToken, async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.body?.walletAddress);
    const nonce = sanitize(req.body?.nonce);
    const signature = sanitize(req.body?.signature);

    if (!walletAddress || !nonce || !signature) {
      return res.status(400).json({ ok: false, error: 'walletAddress, nonce and signature are required' });
    }

    const challenge = await GovernanceWalletChallenge.findOne({
      userId: req.user.id,
      walletAddress,
      nonce,
      usedAt: { $exists: false },
    });

    if (!challenge) {
      return res.status(404).json({ ok: false, error: 'Challenge not found or already used' });
    }

    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ ok: false, error: 'Challenge expired' });
    }

    const recoveredAddress = normalizeWalletAddress(web3.eth.accounts.recover(challenge.message, signature));
    if (!recoveredAddress || recoveredAddress !== walletAddress) {
      return res.status(401).json({ ok: false, error: 'Signature verification failed' });
    }

    challenge.usedAt = new Date();
    await challenge.save();

    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        'preferences.defaultWalletAddress': walletAddress,
      },
    });

    dispatchToOpenClaw(createSystemEvent('info', 'Governance wallet verified', {
      userId: req.user.id,
      walletAddress,
    })).catch((err) => {
      console.warn('OpenClaw dispatch failed (wallet verified):', err?.message || err);
    });

    return res.json({ ok: true, walletAddress, verified: true });
  } catch (error) {
    console.error('Error verifying wallet challenge:', error);
    return res.status(500).json({ ok: false, error: 'Failed to verify wallet signature' });
  }
});

router.post('/proposals/:proposalId/votes/onchain', authenticateToken, async (req, res) => {
  try {
    const proposal = await GovernanceProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ ok: false, error: 'Proposal not found' });
    }

    if (!ALLOWED_VOTE_STATUSES.has(proposal.status)) {
      return res.status(400).json({
        ok: false,
        error: 'Proposal is not in an active voting state',
        status: proposal.status,
      });
    }

    const now = Date.now();
    if (proposal.voteWindow?.startsAt && new Date(proposal.voteWindow.startsAt).getTime() > now) {
      return res.status(400).json({ ok: false, error: 'Vote window has not started' });
    }
    if (proposal.voteWindow?.endsAt && new Date(proposal.voteWindow.endsAt).getTime() < now) {
      return res.status(400).json({ ok: false, error: 'Vote window has ended' });
    }

    const walletAddress = await getVerifiedWalletForUser(req.user.id);
    if (!walletAddress) {
      return res.status(403).json({ ok: false, error: 'Wallet verification is required before voting' });
    }

    const choice = sanitize(req.body?.choice).toLowerCase();
    const txHash = normalizeTxHash(req.body?.txHash);
    const chainId = Number(req.body?.chainId || proposal.onChain?.chainId || 8453);

    if (!ALLOWED_VOTE_CHOICES.has(choice)) {
      return res.status(400).json({ ok: false, error: 'Invalid vote choice' });
    }

    if (!txHash) {
      return res.status(400).json({ ok: false, error: 'A valid on-chain txHash is required' });
    }

    const existing = await GovernanceVote.findOne({ proposalId: proposal._id, userId: req.user.id });
    if (existing) {
      return res.status(409).json({ ok: false, error: 'User has already submitted a vote for this proposal' });
    }

    const existingWalletVote = await GovernanceVote.findOne({
      proposalId: proposal._id,
      walletAddress,
    });
    if (existingWalletVote) {
      return res.status(409).json({ ok: false, error: 'Wallet has already submitted a vote for this proposal' });
    }

    const vote = await GovernanceVote.create({
      proposalId: proposal._id,
      userId: req.user.id,
      walletAddress,
      choice,
      chainId,
      txHash,
      blockNumber: Number(req.body?.blockNumber || 0) || undefined,
      status: sanitize(req.body?.status || 'submitted') || 'submitted',
    });

    const voteCounts = await refreshVoteCounts(proposal._id);
    const totalVotes = voteCounts.yes + voteCounts.no + voteCounts.abstain;
    const eligibleVoterCount = await getEligibleVoterCount();
    const quorum = buildQuorumMeta(totalVotes, eligibleVoterCount);

    if (proposal.status !== 'vote_window') {
      proposal.status = 'vote_window';
      await proposal.save();
    }

    dispatchToOpenClaw(createSystemEvent('info', 'Governance vote submitted', {
      proposalId: proposal._id.toString(),
      voteId: vote._id.toString(),
      choice,
      chainId,
      txHash,
    })).catch((err) => {
      console.warn('OpenClaw dispatch failed (vote submitted):', err?.message || err);
    });

    return res.status(201).json({ ok: true, item: vote, voteCounts, totalVotes, quorum });
  } catch (error) {
    console.error('Error submitting on-chain vote:', error);
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, error: 'Duplicate vote or transaction hash detected' });
    }
    return res.status(500).json({ ok: false, error: 'Failed to submit vote' });
  }
});

router.get('/proposals/:proposalId/votes/summary', async (req, res) => {
  try {
    const proposal = await GovernanceProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ ok: false, error: 'Proposal not found' });
    }

    const voteCounts = await refreshVoteCounts(proposal._id);
    const totalVotes = voteCounts.yes + voteCounts.no + voteCounts.abstain;
    const eligibleVoterCount = await getEligibleVoterCount();
    const quorum = buildQuorumMeta(totalVotes, eligibleVoterCount);
    const now = Date.now();
    const startsAtMs = proposal.voteWindow?.startsAt ? new Date(proposal.voteWindow.startsAt).getTime() : null;
    const endsAtMs = proposal.voteWindow?.endsAt ? new Date(proposal.voteWindow.endsAt).getTime() : null;

    const voteWindow = {
      startsAt: proposal.voteWindow?.startsAt || null,
      endsAt: proposal.voteWindow?.endsAt || null,
      opensInMs: startsAtMs && startsAtMs > now ? startsAtMs - now : 0,
      closesInMs: endsAtMs && endsAtMs > now ? endsAtMs - now : 0,
      isOpen: Boolean(startsAtMs && endsAtMs && now >= startsAtMs && now <= endsAtMs),
      isScheduled: Boolean(startsAtMs && startsAtMs > now),
      hasEnded: Boolean(endsAtMs && endsAtMs < now),
    };

    return res.json({
      ok: true,
      proposalId: proposal._id,
      voteCounts,
      totalVotes,
      quorum,
      voteWindow,
      outcome: proposal.outcome,
      status: proposal.status,
    });
  } catch (error) {
    console.error('Error fetching vote summary:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch vote summary' });
  }
});

module.exports = router;
