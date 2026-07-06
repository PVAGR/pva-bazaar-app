const express = require('express');
const router = express.Router();
const PartnerSubmission = require('../models/PartnerSubmission');

router.post('/', async (req, res) => {
  try {
    const { email, name, company, website, message } = req.body || {};
    if (!email || !name)
      return res.status(400).json({ ok: false, message: 'Missing name or email' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await PartnerSubmission.findOne({
      email: normalizedEmail,
      status: 'new',
    }).sort({ createdAt: -1 });
    if (existing) {
      return res.json({
        ok: true,
        message: 'Submission already received, our team will follow up soon.',
        data: { id: existing._id, name: existing.name, email: existing.email },
      });
    }

    const submission = await PartnerSubmission.create({
      name: String(name).trim(),
      email: normalizedEmail,
      company: company ? String(company).trim() : '',
      website: website ? String(website).trim() : '',
      message: message ? String(message).trim() : '',
      metadata: {
        source: 'api:/partners',
        ip: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });

    return res.status(201).json({
      ok: true,
      message: 'Submission received',
      data: {
        id: submission._id,
        name: submission.name,
        email: submission.email,
        status: submission.status,
      },
    });
  } catch (err) {
    console.error('Partners submission failed:', err);
    return res.status(500).json({ ok: false, message: 'Internal error' });
  }
});

module.exports = router;
