// backend/routes/items.js
const express = require('express');
const router = express.Router();
const Artifact = require('../models/Artifact');
const { normalizeItemInput, toPublicItem } = require('../lib/itemNormalize');
const { encodeCursor, decodeCursor } = require('../lib/cursor');
const mongoose = require('mongoose');

// GET /api/items
router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 12, 50));
    const { cursor, category, tag, q, sort = 'new', includeDrafts } = req.query;
    // Admin draft access (simple check: X-Admin-Code header or session)
    const isAdmin = req.headers['x-admin-code'] === process.env.ADMIN_SECRET_CODE;
    const filter = {};
    if (!isAdmin || includeDrafts !== 'true') {
      filter.status = 'published';
    }
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    // Search
    if (q) {
      filter.$text = { $search: q };
    }
    // Cursor-based pagination
    let cursorQuery = {};
    if (cursor) {
      const c = decodeCursor(cursor);
      if (c && c.createdAt && c.id) {
        if (sort === 'new') {
          cursorQuery = {
            $or: [
              { createdAt: { $lt: new Date(c.createdAt) } },
              { createdAt: new Date(c.createdAt), _id: { $lt: mongoose.Types.ObjectId(c.id) } },
            ],
          };
        } else {
          cursorQuery = {
            $or: [
              { createdAt: { $gt: new Date(c.createdAt) } },
              { createdAt: new Date(c.createdAt), _id: { $gt: mongoose.Types.ObjectId(c.id) } },
            ],
          };
        }
      }
    }
    const sortOrder = sort === 'old' ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };
    const query = Artifact.find({ ...filter, ...cursorQuery })
      .sort(sortOrder)
      .limit(limit + 1);
    const docs = await query.exec();
    const items = docs.slice(0, limit).map(toPublicItem);
    let nextCursor = null;
    if (docs.length > limit) {
      const last = docs[limit - 1];
      nextCursor = encodeCursor({ createdAt: last.createdAt, id: last._id });
    }
    res.json({ ok: true, items, nextCursor });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/items/:slugOrId
router.get('/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const isAdmin = req.headers['x-admin-code'] === process.env.ADMIN_SECRET_CODE;
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      doc = await Artifact.findById(slugOrId);
    }
    if (!doc) {
      doc = await Artifact.findOne({ slug: slugOrId });
    }
    if (!doc || (!isAdmin && doc.status !== 'published')) {
      return res.status(404).json({ ok: false, error: 'Item not found' });
    }
    res.json({ ok: true, item: toPublicItem(doc) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/items (admin only)
router.post('/', async (req, res) => {
  const isAdmin = req.headers['x-admin-code'] === process.env.ADMIN_SECRET_CODE;
  if (!isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const input = normalizeItemInput(req.body);
    const artifact = new Artifact(input);
    await artifact.save();
    res.status(201).json({ ok: true, item: toPublicItem(artifact) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// PUT /api/items/:id (admin only)
router.put('/:id', async (req, res) => {
  const isAdmin = req.headers['x-admin-code'] === process.env.ADMIN_SECRET_CODE;
  if (!isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const { id } = req.params;
    const input = normalizeItemInput(req.body);
    const artifact = await Artifact.findByIdAndUpdate(id, input, { new: true });
    if (!artifact) return res.status(404).json({ ok: false, error: 'Item not found' });
    res.json({ ok: true, item: toPublicItem(artifact) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// DELETE /api/items/:id (admin only)
router.delete('/:id', async (req, res) => {
  const isAdmin = req.headers['x-admin-code'] === process.env.ADMIN_SECRET_CODE;
  if (!isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const { id } = req.params;
    const artifact = await Artifact.findByIdAndDelete(id);
    if (!artifact) return res.status(404).json({ ok: false, error: 'Item not found' });
    res.json({ ok: true, item: toPublicItem(artifact) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
