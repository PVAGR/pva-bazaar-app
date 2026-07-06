// Serverless archive API endpoint - GET and POST

// Serverless archive API endpoint - GET and POST (Vercel)
const dbConnect = require('../lib/dbConnect');
const ArchiveEntry = require('../models/ArchiveEntry');
const { normalizeArchiveInput, toPublicArchiveEntry } = require('../lib/archiveNormalize');

const { encodeCursor, decodeCursor } = require('../lib/cursor');

module.exports = async (req, res) => {
  // CORS headers - allow pvabazaar.org
  const allowed = (process.env.ALLOWED_ORIGIN || 'https://pvabazaar.org,https://www.pvabazaar.org')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Code');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    await dbConnect();

    if (req.method === 'GET') {
      // Parse query params
      const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 12, 50));
      const cursor = req.query.cursor ? decodeCursor(req.query.cursor) : null;
      const category = req.query.category ? String(req.query.category).toLowerCase() : null;
      const tag = req.query.tag ? String(req.query.tag) : null;
      const q = req.query.q ? String(req.query.q) : null;
      const sort = req.query.sort === 'old' ? 'old' : 'new';

      // Build filter
      const filter = {};
      if (category) filter.category = new RegExp(`^${category}$`, 'i');
      if (tag) filter.tags = tag;

      // Search
      if (q) {
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

      let query = ArchiveEntry.find(filter, projection)
        .sort(sortOrder)
        .limit(limit + 1);
      if (q) query = query.sort({ score: { $meta: 'textScore' }, ...sortOrder });
      const docs = await query.lean();

      // Prepare items and nextCursor
      const items = docs.slice(0, limit).map(toPublicArchiveEntry);
      let nextCursor = null;
      if (docs.length > limit) {
        const last = docs[limit - 1];
        nextCursor = encodeCursor({ createdAt: last.createdAt, id: last._id.toString() });
      }

      return res.status(200).json({ ok: true, items, nextCursor });
    }

    if (req.method === 'POST') {
      // Parse JSON body (Vercel passes req.body as string sometimes)
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
      const payload = normalizeArchiveInput(body);
      const entry = new ArchiveEntry(payload);
      await entry.save();
      return res.status(201).json({ ok: true, item: toPublicArchiveEntry(entry) });
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
