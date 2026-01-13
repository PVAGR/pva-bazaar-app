const express = require('express');
const router = express.Router();
const ArchiveEntry = require('../models/ArchiveEntry');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// List all archive entries (newest first)
router.get('/', async (req, res) => {
  try {
    const entries = await ArchiveEntry.find().sort({ date: -1, createdAt: -1 }).lean();
    res.json({ ok: true, entries });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get a single entry by id or externalId
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry =
      (await ArchiveEntry.findById(id).lean()) ||
      (await ArchiveEntry.findOne({ externalId: id }).lean());
    if (!entry) return res.status(404).json({ ok: false, message: 'Entry not found' });
    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Create a new entry (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const payload = {
      title: req.body?.title || 'Untitled',
      date: req.body?.date || new Date(),
      contentHtml: req.body?.contentHtml || req.body?.content || '',
      excerpt: req.body?.excerpt || '',
      tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
      category: req.body?.category || 'journal',
      location: req.body?.location || '',
      externalId: req.body?.id || '',
    };
    const entry = new ArchiveEntry(payload);
    await entry.save();
    res.status(201).json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Update an entry (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      title: req.body?.title,
      date: req.body?.date,
      contentHtml: req.body?.contentHtml || req.body?.content,
      excerpt: req.body?.excerpt,
      tags: Array.isArray(req.body?.tags) ? req.body.tags : undefined,
      category: req.body?.category,
      location: req.body?.location,
    };
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const entry = await ArchiveEntry.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!entry) return res.status(404).json({ ok: false, message: 'Entry not found' });
    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Delete an entry (admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await ArchiveEntry.findByIdAndDelete(id).lean();
    if (!entry) return res.status(404).json({ ok: false, message: 'Entry not found' });
    res.json({ ok: true, message: 'Entry deleted successfully', entry });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
