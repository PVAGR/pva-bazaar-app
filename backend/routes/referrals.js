const express = require('express');
const router = express.Router();
const ReferralCode = require('../models/ReferralCode');
const adminSession = require('../middleware/adminSession');
const {
  registerReferral,
  resolveActiveReferral,
  normalizeCode,
} = require('../services/referralService');

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://pvabazaar.org';

// POST /api/referrals/register
// Public: create (or re-fetch) a referral code for an email and email it to them.
router.post('/register', async (req, res) => {
  try {
    const { email, name } = req.body || {};
    const result = await registerReferral({
      email,
      name,
      siteUrl: PUBLIC_SITE_URL,
    });
    return res.status(201).json({
      ok: true,
      message: 'Referral code issued and emailed to you. Check your inbox.',
      data: result.record,
      referralUrl: result.referralUrl,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      ok: false,
      error: status === 500 ? 'Internal error' : err.message,
    });
  }
});

// GET /api/referrals/resolve/:code
// Public: validate a code so any link or page can confirm attribution.
router.get('/resolve/:code', async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const record = await resolveActiveReferral(code);
    if (!record) {
      return res.status(404).json({ ok: false, valid: false, error: 'Unknown or inactive referral code' });
    }
    return res.json({
      ok: true,
      valid: true,
      code: record.code,
      name: record.name || null,
      commissionRate: record.commissionRate,
      message: `You arrived via ${record.name || record.code}'s referral. Purchases count toward their kickback.`,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/referrals/:code/click
// Public: a visitor landed on the site via a referral link. Persists the click
// so the referrer's dashboard shows real link traffic (online, not browser-local).
router.post('/:code/click', async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const record = await ReferralCode.findOne({ code, status: 'active' });
    if (!record) return res.status(404).json({ ok: false, valid: false, error: 'Unknown or inactive referral code' });
    record.clicks = (record.clicks || 0) + 1;
    record.lastClickedAt = new Date();
    await record.save();
    return res.json({ ok: true, valid: true, code: record.code, clicks: record.clicks });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/referrals/earnings
// Public but owner-gated: { email } returns that person's own earnings summary.
router.post('/earnings', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    // Fetch the full document (toPublicJSON strips pendingOrders which this
    // endpoint reports as the recent activity list).
    const record = await ReferralCode.findOne({ email: String(email).trim().toLowerCase() });
    if (!record) {
      return res.status(404).json({ ok: false, error: 'No referral code found for that email yet.' });
    }
    const pendingOrders = record.pendingOrders || [];
    const recent = pendingOrders.slice(-10).reverse();
    return res.json({
      ok: true,
      data: {
        code: record.code,
        name: record.name,
        commissionRate: record.commissionRate,
        sales: record.sales,
        totalCommissionsCents: record.totalCommissionsCents,
        pendingCents: record.pendingCents,
        joinedAt: record.joinedAt,
        status: record.status,
        recent,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Admin panel ──────────────────────────────────────────────────────────────
router.use('/', adminSession);

// GET /api/referrals — admin list with filters
router.get('/', async (req, res) => {
  try {
    const { status, q, limit = 50, offset = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) {
      const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100), 'i');
      filter.$or = [{ email: regex }, { code: regex }, { name: regex }];
    }
    const records = await ReferralCode.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip(parseInt(offset, 10))
      .lean();
    const total = await ReferralCode.countDocuments(filter);
    return res.json({ ok: true, referrals: records, total });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/referrals/:id/status — suspend or reactivate a referral code
router.post('/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Status must be active or suspended' });
    }
    const record = await ReferralCode.findById(req.params.id);
    if (!record) return res.status(404).json({ ok: false, error: 'Referral not found' });
    record.status = status;
    await record.save();
    return res.json({ ok: true, referral: record.toPublicJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/referrals/:id/rate — adjust the commission rate for a referral
router.post('/:id/rate', async (req, res) => {
  try {
    const { commissionRate } = req.body || {};
    const rate = Number(commissionRate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 0.5) {
      return res.status(400).json({ ok: false, error: 'commissionRate must be a fraction between 0 and 0.5' });
    }
    const record = await ReferralCode.findById(req.params.id);
    if (!record) return res.status(404).json({ ok: false, error: 'Referral not found' });
    record.commissionRate = rate;
    await record.save();
    return res.json({ ok: true, referral: record.toPublicJSON() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;