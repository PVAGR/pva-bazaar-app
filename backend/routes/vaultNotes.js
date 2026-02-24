const express = require('express');
const router = express.Router();
const VaultNote = require('../models/VaultNote');
const { authMiddleware } = require('../middleware/auth');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

// GET /api/vault-notes - list for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0, recordType, recordId } = req.query;
    const query = { ownerId: req.user.id };
    if (recordType) query.recordType = recordType;
    if (recordId) query.recordId = recordId;

    const items = await VaultNote.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip(parseInt(skip, 10));

    const total = await VaultNote.countDocuments(query);
    res.json({ ok: true, items, total });
  } catch (err) {
    console.error('Error fetching vault notes:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch vault notes' });
  }
});

// POST /api/vault-notes - create
router.post('/', authMiddleware, async (req, res) => {
  try {
    const recordType = ['contact', 'commodity', 'deal', 'general'].includes(req.body?.recordType)
      ? req.body.recordType
      : 'general';

    const note = new VaultNote({
      ownerId: req.user.id,
      recordType,
      recordId: req.body?.recordId || null,
      title: sanitize(req.body?.title || ''),
      content: sanitize(req.body?.content || ''),
    });

    await note.save();
    res.status(201).json({ ok: true, item: note });
  } catch (err) {
    console.error('Error creating vault note:', err);
    res.status(500).json({ ok: false, error: 'Failed to create vault note' });
  }
});

// GET /api/vault-notes/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const note = await VaultNote.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!note) return res.status(404).json({ ok: false, error: 'Vault note not found' });
    res.json({ ok: true, item: note });
  } catch (err) {
    console.error('Error fetching vault note:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch vault note' });
  }
});

// PUT /api/vault-notes/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const note = await VaultNote.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!note) return res.status(404).json({ ok: false, error: 'Vault note not found' });

    const body = req.body || {};
    if (body.recordType !== undefined) note.recordType = ['contact', 'commodity', 'deal', 'general'].includes(body.recordType) ? body.recordType : note.recordType;
    if (body.recordId !== undefined) note.recordId = body.recordId || null;
    if (body.title !== undefined) note.title = sanitize(body.title);
    if (body.content !== undefined) note.content = sanitize(body.content);

    await note.save();
    res.json({ ok: true, item: note });
  } catch (err) {
    console.error('Error updating vault note:', err);
    res.status(500).json({ ok: false, error: 'Failed to update vault note' });
  }
});

// DELETE /api/vault-notes/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await VaultNote.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!result) return res.status(404).json({ ok: false, error: 'Vault note not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting vault note:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete vault note' });
  }
});

module.exports = router;
