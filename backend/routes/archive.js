
const express = require('express');
const router = express.Router();
const ArchiveEntry = require('../models/ArchiveEntry');
const { normalizeArchiveInput, toPublicArchiveEntry } = require('../lib/archiveNormalize');
const adminSession = require('../middleware/adminSession');
const mongoose = require('mongoose');
const { findStaticArchiveEntry, listStaticArchiveEntries } = require('../lib/staticContent');


// Cursor-based pagination, filtering, and search
const { encodeCursor, decodeCursor } = require('../lib/cursor');

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', async (req, res) => {
  try {
    // Parse query params
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 12, 50));
    const cursor = req.query.cursor ? decodeCursor(req.query.cursor) : null;
    const category = req.query.category ? String(req.query.category).toLowerCase() : null;
    const tag = req.query.tag ? String(req.query.tag) : null;
    const q = req.query.q ? String(req.query.q) : null;
    const sort = req.query.sort === 'old' ? 'old' : 'new';

    // Build filter
    const filter = {};
    if (category) filter.category = new RegExp('^' + escapeRegExp(category) + '$', 'i');
    if (tag) filter.tags = tag;

    // Search
    if (q) {
      // Prefer text index
      filter.$text = { $search: q };
    }

    // Cursor pagination
    if (cursor && cursor.createdAt && cursor.id) {
      const cmp = sort === 'old' ? '$gt' : '$lt';
      filter.$or = [
        { createdAt: { [cmp]: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { [cmp]: cursor.id } },
      ];
    }

    // Sort order
    const sortOrder = sort === 'old' ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };

    // Projection: avoid huge text payloads in list
    const projection = q ? { score: { $meta: 'textScore' } } : {};

    let query = ArchiveEntry.find(filter, projection).sort(sortOrder).limit(limit + 1);
    if (q) query = query.sort({ score: { $meta: 'textScore' }, ...sortOrder });
    const docs = await query.lean();

    if (docs.length === 0) {
      let fallbackDocs = listStaticArchiveEntries({ category, tag, q, sort });
      if (cursor && cursor.createdAt && cursor.id) {
        const cursorTime = new Date(cursor.createdAt).getTime();
        fallbackDocs = fallbackDocs.filter((entry) => {
          const entryTime = new Date(entry.createdAt).getTime();
          if (sort === 'old') {
            return entryTime > cursorTime || (entryTime === cursorTime && String(entry.id) > String(cursor.id));
          }
          return entryTime < cursorTime || (entryTime === cursorTime && String(entry.id) < String(cursor.id));
        });
      }

      const items = fallbackDocs.slice(0, limit).map(toPublicArchiveEntry);
      const last = fallbackDocs[limit - 1];
      const nextCursor = fallbackDocs.length > limit && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id || last.externalId })
        : null;

      return res.json({ ok: true, items, nextCursor });
    }

    // Prepare items and nextCursor
    const items = docs.slice(0, limit).map(toPublicArchiveEntry);
    let nextCursor = null;
    if (docs.length > limit) {
      const last = docs[limit - 1];
      nextCursor = encodeCursor({ createdAt: last.createdAt, id: last._id.toString() });
    }

    res.json({ ok: true, items, nextCursor });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get a single entry by id or externalId
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let entry = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      entry = await ArchiveEntry.findById(id).lean();
    }
    if (!entry) {
      entry = await ArchiveEntry.findOne({ externalId: id }).lean();
    }
    if (!entry) {
      entry = findStaticArchiveEntry(id);
    }
    if (!entry) return res.status(404).json({ ok: false, error: 'Entry not found' });
    res.json({ ok: true, item: toPublicArchiveEntry(entry) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Create a new entry (admin only, session-based)
router.post('/', adminSession, async (req, res) => {
  try {
    const payload = normalizeArchiveInput(req.body);
    const entry = new ArchiveEntry(payload);
    await entry.save();
    res.status(201).json({ ok: true, item: toPublicArchiveEntry(entry) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Update an entry (admin only, session-based)
router.put('/:id', adminSession, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = normalizeArchiveInput(req.body);
    const entry = await ArchiveEntry.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!entry) return res.status(404).json({ ok: false, error: 'Entry not found' });
    res.json({ ok: true, item: toPublicArchiveEntry(entry) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Delete an entry (admin only, session-based)
router.delete('/:id', adminSession, async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await ArchiveEntry.findByIdAndDelete(id).lean();
    if (!entry) return res.status(404).json({ ok: false, error: 'Entry not found' });
    res.json({ ok: true, message: 'Entry deleted successfully', item: toPublicArchiveEntry(entry) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
