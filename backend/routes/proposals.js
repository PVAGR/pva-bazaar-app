const express = require('express');
const auth = require('../middleware/auth');
const Proposal = require('../models/Proposal');
const User = require('../models/User');
const requireVerifiedCitizen = require('../middleware/verifiedCitizenOnly');

const router = express.Router();

function asPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function isAdminOrSecretariat(userDoc, tokenUser) {
  return tokenUser?.role === 'admin' || userDoc?.citizenRole === 'secretariat' || userDoc?.citizenRole === 'admin';
}

async function requireAdminSecretariat(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('role citizenRole');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
    if (!isAdminOrSecretariat(user, req.user)) {
      return res.status(403).json({ ok: false, message: 'Admin or secretariat access required' });
    }
    req.adminActor = user;
    return next();
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

function normalizeMilestones(milestones) {
  if (!Array.isArray(milestones)) return [];
  return milestones.map((m) => String(m || '').trim()).filter(Boolean);
}

function normalizeUpdates(updates) {
  if (!Array.isArray(updates)) return [];
  return updates
    .map((item) => ({
      text: String(item?.text || '').trim(),
      postedAt: item?.postedAt ? new Date(item.postedAt) : new Date(),
    }))
    .filter((item) => item.text);
}

// Public list
router.get('/proposals', async (req, res) => {
  try {
    const page = asPositiveInt(req.query.page, 1);
    const limit = Math.min(asPositiveInt(req.query.limit, 20), 100);
    const status = String(req.query.status || '').trim();
    const category = String(req.query.category || '').trim();
    const sort = String(req.query.sort || 'recent').trim();

    const query = { isPublic: true };
    if (status) query.status = status;
    if (category) query.category = category;

    const sortQuery = sort === 'popular'
      ? { endorsementCount: -1, createdAt: -1 }
      : { createdAt: -1 };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Proposal.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', 'name societalId citizenRole'),
      Proposal.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// Own submissions (must come before :proposalId route)
router.get('/proposals/my/submissions', auth, requireVerifiedCitizen, async (req, res) => {
  try {
    const items = await Proposal.find({ submittedBy: req.user.id })
      .sort({ updatedAt: -1 })
      .populate('submittedBy', 'name societalId citizenRole');

    return res.json({ ok: true, items });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// Public detail by proposalId
router.get('/proposals/:proposalId', async (req, res) => {
  try {
    const proposalId = String(req.params.proposalId || '').trim().toUpperCase();
    const item = await Proposal.findOne({ proposalId })
      .populate('submittedBy', 'name societalId citizenRole')
      .populate('officialResponse.respondedBy', 'name citizenRole');

    if (!item || !item.isPublic) {
      return res.status(404).json({ ok: false, message: 'Proposal not found' });
    }

    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// Create draft proposal
router.post('/proposals', auth, requireVerifiedCitizen, async (req, res) => {
  try {
    const payload = {
      title: String(req.body?.title || '').trim(),
      category: String(req.body?.category || '').trim(),
      problem: String(req.body?.problem || '').trim(),
      solution: String(req.body?.solution || '').trim(),
      expectedOutcome: String(req.body?.expectedOutcome || '').trim(),
      estimatedCost: String(req.body?.estimatedCost || '').trim(),
      timeline: String(req.body?.timeline || '').trim(),
      submittedBy: req.user.id,
      status: 'draft',
      isPublic: true,
    };

    const item = await Proposal.create(payload);
    await User.findByIdAndUpdate(req.user.id, { $inc: { proposalsSubmitted: 1 } });

    return res.status(201).json({ ok: true, item });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message });
  }
});

// Publish own draft
router.post('/proposals/:proposalId/publish', auth, requireVerifiedCitizen, async (req, res) => {
  try {
    const proposalId = String(req.params.proposalId || '').trim().toUpperCase();
    const item = await Proposal.findOne({ proposalId });

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Proposal not found' });
    }

    if (String(item.submittedBy) !== String(req.user.id)) {
      return res.status(403).json({ ok: false, message: 'Only the submitter can publish this proposal' });
    }

    if (item.status !== 'draft') {
      return res.status(400).json({ ok: false, message: 'Only draft proposals can be published' });
    }

    item.status = 'open';
    await item.save();
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// Endorse proposal
router.post('/proposals/:proposalId/endorse', auth, requireVerifiedCitizen, async (req, res) => {
  try {
    const proposalId = String(req.params.proposalId || '').trim().toUpperCase();
    const item = await Proposal.findOne({ proposalId });

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Proposal not found' });
    }

    if (String(item.submittedBy) === String(req.user.id)) {
      return res.status(400).json({ ok: false, message: 'Submitter cannot endorse their own proposal' });
    }

    const existing = item.endorsements.find((entry) => String(entry.citizen) === String(req.user.id));
    if (existing) {
      return res.status(409).json({ ok: false, message: 'Proposal already endorsed by this citizen' });
    }

    item.endorsements.push({ citizen: req.user.id, endorsedAt: new Date() });
    item.endorsementCount = item.endorsements.length;

    if (item.endorsementCount >= item.endorsementThreshold) {
      item.thresholdReachedAt = item.thresholdReachedAt || new Date();
      if (['open', 'draft'].includes(item.status)) {
        item.status = 'endorsed';
      }
    }

    await item.save();
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// Remove endorsement
router.delete('/proposals/:proposalId/endorse', auth, requireVerifiedCitizen, async (req, res) => {
  try {
    const proposalId = String(req.params.proposalId || '').trim().toUpperCase();
    const item = await Proposal.findOne({ proposalId });

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Proposal not found' });
    }

    const before = item.endorsements.length;
    item.endorsements = item.endorsements.filter((entry) => String(entry.citizen) !== String(req.user.id));

    if (item.endorsements.length === before) {
      return res.status(404).json({ ok: false, message: 'Endorsement not found for this citizen' });
    }

    item.endorsementCount = item.endorsements.length;
    if (item.endorsementCount < item.endorsementThreshold) {
      item.thresholdReachedAt = null;
      if (item.status === 'endorsed') {
        item.status = 'open';
      }
    }

    await item.save();
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// Admin: list threshold-reached proposals
router.get('/admin/proposals/endorsed', auth, requireAdminSecretariat, async (req, res) => {
  try {
    const items = await Proposal.find({
      thresholdReachedAt: { $ne: null },
      endorsementCount: { $gte: 10 },
    })
      .sort({ thresholdReachedAt: -1 })
      .populate('submittedBy', 'name societalId citizenRole');

    return res.json({ ok: true, items });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// Admin: official response
router.post('/admin/proposals/:proposalId/respond', auth, requireAdminSecretariat, async (req, res) => {
  try {
    const proposalId = String(req.params.proposalId || '').trim().toUpperCase();
    const item = await Proposal.findOne({ proposalId });

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Proposal not found' });
    }

    item.officialResponse = {
      respondedBy: req.user.id,
      decision: String(req.body?.decision || '').trim(),
      explanation: String(req.body?.explanation || '').trim(),
      respondedAt: new Date(),
    };

    await item.save();
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message });
  }
});

// Admin: override status
router.put('/admin/proposals/:proposalId/status', auth, requireAdminSecretariat, async (req, res) => {
  try {
    const proposalId = String(req.params.proposalId || '').trim().toUpperCase();
    const status = String(req.body?.status || '').trim();
    const item = await Proposal.findOne({ proposalId });

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Proposal not found' });
    }

    item.status = status;
    await item.save();
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message });
  }
});

// Admin: set execution project
router.post('/admin/proposals/:proposalId/execution', auth, requireAdminSecretariat, async (req, res) => {
  try {
    const proposalId = String(req.params.proposalId || '').trim().toUpperCase();
    const item = await Proposal.findOne({ proposalId });

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Proposal not found' });
    }

    item.executionProject = {
      owner: String(req.body?.owner || '').trim(),
      milestones: normalizeMilestones(req.body?.milestones),
      budget: String(req.body?.budget || '').trim(),
      status: String(req.body?.status || 'not_started').trim(),
      updates: normalizeUpdates(req.body?.updates),
    };

    await item.save();
    return res.json({ ok: true, item });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message });
  }
});

module.exports = router;
