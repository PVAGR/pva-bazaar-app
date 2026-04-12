const express = require('express');
const crypto = require('crypto');
const { Web3 } = require('web3');
const { authMiddleware } = require('../middleware/auth');
const GovernanceProposal = require('../models/GovernanceProposal');
const GovernanceProposalSupport = require('../models/GovernanceProposalSupport');
const GovernanceVote = require('../models/GovernanceVote');
const GovernanceWalletChallenge = require('../models/GovernanceWalletChallenge');
const User = require('../models/User');
const { createSystemEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

const router = express.Router();
const web3 = new Web3();

const ALLOWED_OUTCOMES = new Set(['accepted', 'planned', 'deferred', 'rejected']);
const ALLOWED_VOTE_CHOICES = new Set(['yes', 'no', 'abstain']);

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

router.post('/proposals', authMiddleware, async (req, res) => {
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

router.post('/proposals/:proposalId/support', authMiddleware, async (req, res) => {
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

router.post('/proposals/:proposalId/queue', authMiddleware, async (req, res) => {
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

router.post('/proposals/:proposalId/outcome', authMiddleware, async (req, res) => {
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

router.post('/wallet/challenge', authMiddleware, async (req, res) => {
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

router.post('/wallet/verify', authMiddleware, async (req, res) => {
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

router.post('/proposals/:proposalId/votes/onchain', authMiddleware, async (req, res) => {
  try {
    const proposal = await GovernanceProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ ok: false, error: 'Proposal not found' });
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

    return res.status(201).json({ ok: true, item: vote, voteCounts });
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

    return res.json({
      ok: true,
      proposalId: proposal._id,
      voteCounts,
      totalVotes,
      outcome: proposal.outcome,
      status: proposal.status,
    });
  } catch (error) {
    console.error('Error fetching vote summary:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch vote summary' });
  }
});

module.exports = router;
