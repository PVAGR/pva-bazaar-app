const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const slugify = require('slugify');
const PartnerSubmission = require('../models/PartnerSubmission');
const PartnerProfile = require('../models/PartnerProfile');
const adminSession = require('../middleware/adminSession');
const {
  sendPartnerSubmissionEmail,
  sendPartnerApprovedEmail,
} = require('../service/emailService');

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://pvabazaar.org';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function makeEditToken() {
  return `parts_${crypto.randomBytes(18).toString('hex')}`;
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Guarantee the directory is always live and non-empty for every visitor:
// if no approved profiles exist yet, seed the flagship PVA Bazaar profile
// (idempotent). Everything else is created through the apply + approve flow.
async function ensureSeedProfile() {
  const existing = await PartnerProfile.findOne({ slug: 'pvabazaar', status: 'approved' }).lean();
  if (existing) return existing;
  const profile = await PartnerProfile.create({
    businessName: 'PVA Bazaar',
    slug: 'pvabazaar',
    ownerName: 'PVA Bazaar',
    contactEmail: 'contact@pvabazaar.org',
    headline: 'Global marketplace for knowledge, resources, and real trade.',
    summary: 'PVA Bazaar connects farmers, miners, manufacturers, educators, researchers, and traders around the world. We handle publishing, sourcing, logistics, and international trade from one platform.',
    story: 'PVA Bazaar connects farmers, miners, manufacturers, educators, researchers, and traders around the world. We handle publishing, sourcing, logistics, and international trade from one platform.',
    businessType: 'Marketplace',
    website: 'https://pvabazaar.org',
    contact: { email: 'contact@pvabazaar.org', location: 'Global' },
    services: ['Published books', 'Marketplace', 'Education', 'Publishing'],
    status: 'approved',
    approvedAt: new Date(),
  }).catch((err) => {
    if (err?.code === 11000) return null; // concurrent seed — already there
    throw err;
  });
  return profile || (await PartnerProfile.findOne({ slug: 'pvabazaar', status: 'approved' }).lean());
}

async function uniqueSlug(businessName) {
  const base = slugify(String(businessName || 'business'), { lower: true, strict: true }).slice(0, 48) || 'business';
  let slug = base;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const existing = await PartnerProfile.findOne({ slug }).lean();
    if (!existing) return slug;
    slug = `${base}-${crypto.randomBytes(2).toString('hex')}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function handleApplication(payload, metadata = {}) {
  const { email, name, company, website, message, businessType } = payload;
  if (!email || !name) {
    const error = new Error('Missing name or email');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = await PartnerSubmission.findOne({ email: normalizedEmail, status: 'new' })
    .sort({ createdAt: -1 });
  if (existing) {
    return {
      ok: true,
      duplicate: true,
      message: 'Application already received — our team will follow up soon.',
      data: { id: existing._id, name: existing.name, email: existing.email, status: existing.status },
    };
  }

  const submission = await PartnerSubmission.create({
    name: String(name).trim(),
    email: normalizedEmail,
    company: company ? String(company).trim() : '',
    website: website ? String(website).trim() : '',
    message: message ? String(message).trim() : '',
    businessType: businessType ? String(businessType).trim() : '',
    metadata: {
      source: 'web-form',
      ...(metadata || {}),
    },
  });

  // Notify the admin (non-blocking).
  sendPartnerSubmissionEmail({
    to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
    businessName: company || payload.businessName || name,
    ownerName: name,
    company: normalizeEmail(email),
    website,
  }).catch((err) => console.warn('Partner admin email failed:', err?.message || err));

  return {
    ok: true,
    message: 'Application received — our team will review and email you your page link if accepted.',
    data: { id: submission._id, name: submission.name, email: submission.email, status: submission.status },
  };
}

// ── Public: apply (also kept as POST / for backward compatibility) ──────────
router.post('/', async (req, res) => {
  try {
    const result = await handleApplication(req.body, {
      source: 'api:/partners',
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ ok: false, message: status === 500 ? 'Internal error' : err.message });
  }
});

router.post('/apply', async (req, res) => {
  try {
    const result = await handleApplication(req.body, {
      source: 'web:/partners/apply',
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ ok: false, message: status === 500 ? 'Internal error' : err.message });
  }
});

// ── Public: directory listing ────────────────────────────────────────────────
router.get('/public', async (req, res) => {
  try {
    await ensureSeedProfile();
    const { limit = 100, offset = 0 } = req.query;
    const profiles = await PartnerProfile.find({ status: 'approved' })
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit, 10))
      .skip(parseInt(offset, 10))
      .lean();
    const total = await PartnerProfile.countDocuments({ status: 'approved' });
    return res.json({
      ok: true,
      partners: profiles.map((p) => ({
        businessName: p.businessName,
        slug: p.slug,
        headline: p.headline,
        summary: p.summary,
        businessType: p.businessType,
        website: p.website,
        images: p.images,
        socialLinks: p.socialLinks,
        accentColor: p.accentColor,
        updatedAt: p.updatedAt,
      })),
      total,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Public: single partner page ──────────────────────────────────────────────
router.get('/public/:slug', async (req, res) => {
  try {
    const profile = await PartnerProfile.findOne({
      slug: String(req.params.slug).toLowerCase(),
      status: 'approved',
    }).lean();
    if (!profile) return res.status(404).json({ ok: false, error: 'Partner not found' });
    return res.json({
      ok: true,
      partner: {
        businessName: profile.businessName,
        slug: profile.slug,
        headline: profile.headline,
        summary: profile.summary,
        story: profile.story,
        businessType: profile.businessType,
        website: profile.website,
        commodities: profile.commodities,
        services: profile.services,
        images: profile.images,
        socialLinks: profile.socialLinks,
        contact: profile.contact,
        faq: profile.faq,
        accentColor: profile.accentColor,
        ownerName: profile.ownerName,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Public: fetch profile by edit token (capability link, emailed to owner) ──
router.get('/edit/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    const profile = await PartnerProfile.findOne({ editToken: token }).select('+editToken');
    if (!profile) return res.status(404).json({ ok: false, error: 'Edit link not found or revoked.' });
    return res.json({
      ok: true,
      partner: profile.toPublicJSON(),
      editToken: profile.editToken,
      pageUrl: `${PUBLIC_SITE_URL.replace(/\/$/, '')}/partners/${profile.slug}`,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Public: update profile by edit token ─────────────────────────────────────
const EDITABLE_FIELDS = [
  'businessName', 'headline', 'summary', 'story', 'website', 'businessType',
  'commodities', 'services', 'images', 'socialLinks', 'contact', 'faq', 'accentColor',
];

function pickEditable(body) {
  const clean = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) clean[field] = body[field];
  }
  // Validate shapes: arrays of strings, objects with known keys.
  const strings = ['businessName', 'headline', 'summary', 'story', 'website', 'businessType', 'accentColor'];
  for (const field of strings) {
    if (typeof clean[field] === 'string') clean[field] = clean[field].slice(0, 4000);
  }
  if (Array.isArray(clean.commodities)) clean.commodities = clean.commodities.map((s) => String(s).slice(0, 200)).filter(Boolean).slice(0, 60);
  if (Array.isArray(clean.services)) clean.services = clean.services.map((s) => String(s).slice(0, 200)).filter(Boolean).slice(0, 60);
  if (clean.images && typeof clean.images === 'object') {
    for (const key of ['logoUrl', 'bannerUrl']) {
      if (typeof clean.images[key] === 'string') clean.images[key] = String(clean.images[key]).slice(0, 1000);
    }
  }
  if (clean.socialLinks && typeof clean.socialLinks === 'object') {
    for (const key of ['instagram', 'tiktok', 'facebook', 'youtube', 'whatsapp', 'other']) {
      if (typeof clean.socialLinks[key] === 'string') clean.socialLinks[key] = String(clean.socialLinks[key]).slice(0, 1000);
    }
  }
  if (clean.contact && typeof clean.contact === 'object') {
    for (const key of ['email', 'phone', 'location', 'customMessage']) {
      if (typeof clean.contact[key] === 'string') clean.contact[key] = String(clean.contact[key]).slice(0, 1000);
    }
  }
  if (Array.isArray(clean.faq)) {
    clean.faq = clean.faq.map((entry) => ({
      q: String((entry && entry.q) || '').slice(0, 1000),
      a: String((entry && entry.a) || '').slice(0, 4000),
    })).slice(0, 20);
  }
  return clean;
}

router.put('/edit/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    const profile = await PartnerProfile.findOne({ editToken: token }).select('+editToken');
    if (!profile) return res.status(404).json({ ok: false, error: 'Edit link not found or revoked.' });

    const clean = pickEditable(req.body || {});

    // Changing the business name must re-roll a fresh unique slug.
    if (clean.businessName && String(clean.businessName).trim() !== profile.businessName) {
      clean.slug = await uniqueSlug(clean.businessName);
    }

    Object.assign(profile, clean);
    profile.status = 'approved'; // saving an edit keeps the page live
    await profile.save();

    return res.json({
      ok: true,
      message: 'Page updated.',
      partner: profile.toPublicJSON(),
      pageUrl: `${PUBLIC_SITE_URL.replace(/\/$/, '')}/partners/${profile.slug}`,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Admin panel (all /submissions/* routes require admin session) ────────────
router.use('/submissions', adminSession);

// GET /api/partners/submissions — list partner applications
router.get('/submissions', async (req, res) => {
  try {
    const { status, q, limit = 50, offset = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) {
      const regex = new RegExp(escapeRegExp(String(q)).slice(0, 100), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { company: regex }];
    }
    const items = await PartnerSubmission.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip(parseInt(offset, 10))
      .lean();
    const total = await PartnerSubmission.countDocuments(filter);
    return res.json({ ok: true, submissions: items, total });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/partners/submissions/:id
router.get('/submissions/:id', async (req, res) => {
  try {
    const item = await PartnerSubmission.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, error: 'Submission not found' });
    return res.json({ ok: true, submission: item });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/partners/submissions/:id/approve
// Creates the live PartnerProfile (MySpace-style page), generates the edit
// token, and emails the business the link. All automatic, all free.
router.post('/submissions/:id/approve', async (req, res) => {
  try {
    const submission = await PartnerSubmission.findById(req.params.id);
    if (!submission) return res.status(404).json({ ok: false, error: 'Submission not found' });

    let profile = await PartnerProfile.findOne({ submissionId: submission._id });
    if (!profile) {
      profile = await PartnerProfile.create({
        submissionId: submission._id,
        businessName: submission.company || submission.name,
        slug: await uniqueSlug(submission.company || submission.name),
        ownerName: submission.name,
        contactEmail: submission.email,
        website: submission.website || '',
        businessType: submission.businessType || '',
        summary: submission.message ? submission.message.slice(0, 500) : '',
        story: submission.message || '',
        status: 'approved',
        editToken: makeEditToken(),
        approvedAt: new Date(),
      });
    }

    submission.status = 'approved';
    await submission.save();

    const pageUrl = `${PUBLIC_SITE_URL.replace(/\/$/, '')}/partners/${profile.slug}`;
    const editUrl = `${PUBLIC_SITE_URL.replace(/\/$/, '')}/partners/edit?token=${encodeURIComponent(profile.editToken)}`;

    try {
      await sendPartnerApprovedEmail({
        to: profile.contactEmail,
        name: profile.ownerName || profile.contactEmail,
        businessName: profile.businessName,
        pageUrl,
        editUrl,
      });
    } catch (err) {
      console.warn('Partner approval email failed:', err?.message || err);
    }

    return res.json({
      ok: true,
      message: 'Partner approved. They have been emailed their page and edit link.',
      partner: profile.toPublicJSON(),
      pageUrl,
      editUrl,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/partners/submissions/:id/reject — declines the application
router.post('/submissions/:id/reject', async (req, res) => {
  try {
    const submission = await PartnerSubmission.findById(req.params.id);
    if (!submission) return res.status(404).json({ ok: false, error: 'Submission not found' });
    submission.status = 'rejected';
    await submission.save();
    return res.json({ ok: true, message: 'Application rejected.' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/partners/profiles — admin list of all partner profiles
router.get('/profiles', async (req, res) => {
  try {
    const profiles = await PartnerProfile.find({})
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit || 100, 10))
      .lean();
    return res.json({
      ok: true,
      partners: profiles.map((p) => ({
        id: p._id,
        businessName: p.businessName,
        slug: p.slug,
        contactEmail: p.contactEmail,
        status: p.status,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;