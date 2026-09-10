// GET /api/blog-feed
// Public, server-authoritative combined blog feed.
//
// The owner's posts live in two places: ArchiveEntry records (created via the
// archive editor) and Blog records (published via the writing studio). This
// read-only endpoint merges both into one normalized feed so /blog shows every
// published post regardless of which surface created it.
//
// Rules:
// - Published/public records only. Drafts (archive) and pending (blog) are
//   never returned, even for admin sessions — this is a public feed.
// - Stable unique IDs: "archive:<mongoId|externalId>" and "blog:<slug>".
// - Date normalization: publishedAt -> createdAt -> updatedAt (first
//   non-empty wins). ArchiveEntry uses createdAt/updatedAt; Blog uses
//   createdAt/updatedAt. Documented here, applied once server-side.
// - Bounded: limit clamped to [1, 50], default 20.
// - No admin/draft fields leak: only whitelisted public fields are returned.
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ArchiveEntry = require('../models/ArchiveEntry');
const Blog = require('../models/Blog');

function resolveDate(...candidates) {
  for (const c of candidates) {
    if (!c) continue;
    const t = new Date(c).getTime();
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  return '';
}

function excerptFrom(text, max = 180) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}

function toFeedItemFromArchive(entry) {
  const id = String(entry._id || entry.id || entry.externalId || '');
  return {
    id: `archive:${id}`,
    kind: 'archive',
    refId: id,
    slug: '',
    title: String(entry.title || 'Untitled'),
    excerpt: excerptFrom(entry.description || entry.excerpt || entry.content),
    category: String(entry.category || ''),
    authorName: '',
    wordCount: Number(entry.wordCount) || 0,
    // Date normalization: publishedAt -> createdAt -> updatedAt
    publishedAt: resolveDate(entry.publishedAt, entry.createdAt, entry.updatedAt, entry.date),
    updatedAt: resolveDate(entry.updatedAt, entry.createdAt),
    path: `/blog/a/${encodeURIComponent(id)}`,
  };
}

function toFeedItemFromBlog(blog) {
  return {
    id: `blog:${blog.slug}`,
    kind: 'blog',
    refId: String(blog.slug || ''),
    slug: String(blog.slug || ''),
    title: String(blog.title || 'Untitled'),
    excerpt: excerptFrom(blog.content),
    category: 'Blog',
    authorName: String(blog.authorName || ''),
    wordCount: 0,
    // Date normalization: publishedAt -> createdAt -> updatedAt
    publishedAt: resolveDate(blog.publishedAt, blog.createdAt, blog.updatedAt),
    updatedAt: resolveDate(blog.updatedAt, blog.createdAt),
    path: `/blog/${encodeURIComponent(String(blog.slug || ''))}`,
  };
}

router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 20, 50));
    // Query Mongo only when the default connection is actually live.
    // Otherwise return an empty feed — no fake content when the database is
    // unreachable (static fallback mode serves read-only reference material,
    // not owner posts).
    const mongoLive = mongoose.connection.readyState === 1;

    let archiveItems = [];
    let blogItems = [];

    if (mongoLive) {
      const [archiveDocs, blogDocs] = await Promise.all([
        ArchiveEntry.find({ status: 'published' })
          .sort({ createdAt: -1, _id: -1 })
          .limit(limit)
          .lean(),
        Blog.find({ status: 'published' })
          .sort({ createdAt: -1 })
          .select('slug title authorName content createdAt updatedAt')
          .limit(limit)
          .lean(),
      ]);
      archiveItems = archiveDocs.map(toFeedItemFromArchive);
      blogItems = blogDocs.map(toFeedItemFromBlog);
    }
    // Static fallback mode (no Mongo): archive static entries are read-only
    // reference material, not owner posts; the feed is simply empty until the
    // database is reachable. No fake content.

    const items = [...archiveItems, ...blogItems]
      .sort((a, b) => {
        const at = new Date(a.publishedAt || 0).getTime();
        const bt = new Date(b.publishedAt || 0).getTime();
        if (bt !== at) return bt - at;
        return String(b.id).localeCompare(String(a.id));
      })
      .slice(0, limit);

    res.json({ ok: true, items, total: items.length });
  } catch (err) {
    console.error('blogFeed.list error', err);
    res.status(500).json({ ok: false, message: err.message || 'Internal error' });
  }
});

module.exports = router;
