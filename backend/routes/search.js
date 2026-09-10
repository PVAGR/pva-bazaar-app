const express = require('express');
const router = express.Router();
const VectorSearchService = require('../utils/vectorSearchService');
const Artifact = require('../models/Artifact');
const ArchiveEntry = require('../models/ArchiveEntry');
const BookProject = require('../models/BookProject');
const Blog = require('../models/Blog');
const LibraryDocument = require('../models/LibraryDocument');
const LibraryArticle = require('../models/LibraryArticle');
const PartnerProfile = require('../models/PartnerProfile');
const { searchStaticArchive, searchStaticArtifacts } = require('../lib/staticContent');
const { getMongoState } = require('../lib/mongoConnection');

const vectorSearch = new VectorSearchService();

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shouldUseStaticSearchFallback() {
  const mode = String(getMongoState()?.mode || '').toLowerCase();
  return mode !== 'mongo' && mode !== 'memory';
}

function buildStaticSearchResults(qSafe, lim) {
  const entries = searchStaticArchive(qSafe, lim).map((entry) => ({ ...entry, type: 'entry' }));
  const items = searchStaticArtifacts(qSafe, lim);
  const merged = [...entries, ...items]
    .sort((a, b) => {
      const aTs = new Date(a.updatedAt || a.date || a.createdAt || 0).getTime();
      const bTs = new Date(b.updatedAt || b.date || b.createdAt || 0).getTime();
      return bTs - aTs;
    })
    .slice(0, lim * 2);

  return { entries, items, merged };
}
// Initialize optional vector DB lazily
(async () => {
  try {
    await vectorSearch.vectorDB.initialize();
  } catch (_) {}
})();

// Universal search endpoint — searches across all public content types
router.get('/', async (req, res) => {
  try {
    const { q, limit = 30 } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ ok: false, error: 'Query parameter "q" is required' });
    }

    const qSafe = q.trim().slice(0, 100);
    if (qSafe.length < 2) {
      return res.status(400).json({ ok: false, error: 'Query must be at least 2 characters' });
    }

    const lim = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 30);
    const perSource = Math.ceil(lim / 6); // 3-5 results per source

    const useStatic = shouldUseStaticSearchFallback();

    const results = [];
    const failedSources = [];

    if (useStatic) {
      // Static fallback — only archive entries and artifacts
      const entries = searchStaticArchive(qSafe, lim).map((e) => ({
        type: 'entry',
        id: e.id || e._id || e.externalId || e.slug || '',
        title: e.title || 'Untitled',
        subtitle: e.excerpt?.slice(0, 80) || '',
        path: '/archive',
      }));
      const items = searchStaticArtifacts(qSafe, lim).map((item) => ({
        type: 'artifact',
        id: item.id || item._id || item.slug || '',
        title: item.title || item.name || 'Untitled',
        subtitle: item.description?.slice(0, 80) || '',
        path: item.slug ? `/marketplace/${item.slug}` : '/marketplace',
      }));
      return res.json({
        ok: true,
        query: qSafe,
        count: entries.length + items.length,
        results: [...entries, ...items].slice(0, lim),
        partial: false,
        failedSources: [],
      });
    }

    const regex = new RegExp(escapeRegExp(qSafe), 'i');

    // Search each source in parallel
    const searches = [
      // Books (status: published)
      BookProject.find({
        status: 'published',
        $or: [
          { title: regex },
          { subtitle: regex },
          { authorName: regex },
          { description: regex },
        ],
      })
        .select('title subtitle authorName slug status')
        .sort({ updatedAt: -1 })
        .limit(perSource)
        .lean()
        .then((docs) => docs.map((d) => ({
          type: 'book',
          id: d._id || d.id || '',
          title: d.title || 'Untitled',
          subtitle: d.subtitle || d.authorName || '',
          path: d.slug ? `/books/read/${d.slug}` : '/books',
        })))
        .catch(() => {
          failedSources.push('books');
          return [];
        }),

      // Blog posts (status: published)
      Blog.find({
        status: 'published',
        $or: [
          { title: regex },
          { content: regex },
        ],
      })
        .select('title slug status createdAt')
        .sort({ createdAt: -1 })
        .limit(perSource)
        .lean()
        .then((docs) => docs.map((d) => ({
          type: 'blog',
          id: d._id || d.id || '',
          title: d.title || 'Untitled',
          subtitle: '',
          path: d.slug ? `/blog/${d.slug}` : '/blog',
        })))
        .catch(() => {
          failedSources.push('blog');
          return [];
        }),

      // Library documents (status: published, visibility: public)
      LibraryDocument.find({
        status: 'published',
        visibility: 'public',
        $or: [
          { title: regex },
          { description: regex },
          { category: regex },
          { domain: regex },
        ],
      })
        .select('title description category domain status visibility')
        .sort({ updatedAt: -1 })
        .limit(perSource)
        .lean()
        .then((docs) => docs.map((d) => ({
          type: 'libraryDocument',
          id: d._id || d.id || '',
          title: d.title || 'Untitled',
          subtitle: d.description?.slice(0, 80) || '',
          path: '/library',
        })))
        .catch(() => {
          failedSources.push('libraryDocuments');
          return [];
        }),

      // Library articles (status: published)
      LibraryArticle.find({
        status: 'published',
        $or: [
          { title: regex },
          { markdown: regex },
        ],
      })
        .select('title slug status createdAt')
        .sort({ createdAt: -1 })
        .limit(perSource)
        .lean()
        .then((docs) => docs.map((d) => ({
          type: 'libraryArticle',
          id: d._id || d.id || '',
          title: d.title || 'Untitled',
          subtitle: '',
          path: d.slug ? `/civilization-library/article/${d.slug}` : '/civilization-library',
        })))
        .catch(() => {
          failedSources.push('libraryArticles');
          return [];
        }),

      // Partner profiles (status: approved)
      PartnerProfile.find({
        status: 'approved',
        $or: [
          { businessName: regex },
          { ownerName: regex },
          { headline: regex },
        ],
      })
        .select('businessName ownerName headline slug status')
        .sort({ updatedAt: -1 })
        .limit(perSource)
        .lean()
        .then((docs) => docs.map((d) => ({
          type: 'partner',
          id: d._id || d.id || '',
          title: d.businessName || 'Untitled',
          subtitle: d.headline || d.ownerName || '',
          path: '/partners',
        })))
        .catch(() => {
          failedSources.push('partners');
          return [];
        }),

      // Artifacts (status: published)
      Artifact.find({
        status: 'published',
        $or: [
          { title: regex },
          { name: regex },
          { description: regex },
          { category: regex },
          { artisan: regex },
        ],
      })
        .select('title name description category artisan price slug status')
        .sort({ updatedAt: -1 })
        .limit(perSource)
        .lean()
        .then((docs) => docs.map((d) => ({
          type: 'artifact',
          id: d._id || d.id || '',
          title: d.title || d.name || 'Untitled',
          subtitle: d.description?.slice(0, 80) || '',
          path: d.slug ? `/marketplace/${d.slug}` : '/marketplace',
        })))
        .catch(() => {
          failedSources.push('artifacts');
          return [];
        }),

      // Archive entries
      ArchiveEntry.find({
        $or: [
          { title: regex },
          { excerpt: regex },
          { category: regex },
        ],
      })
        .select('title excerpt category date externalId')
        .sort({ date: -1 })
        .limit(perSource)
        .lean()
        .then((docs) => docs.map((d) => ({
          type: 'entry',
          id: d._id || d.id || d.externalId || '',
          title: d.title || 'Untitled',
          subtitle: d.excerpt?.slice(0, 80) || '',
          path: '/archive',
        })))
        .catch(() => {
          failedSources.push('entries');
          return [];
        }),
    ];

    const searchResults = await Promise.all(searches);
    searchResults.forEach((arr) => results.push(...arr));

    // Sort by relevance (title match first, then recency)
    results.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().includes(qSafe.toLowerCase()) ? 0 : 1;
      const bTitleMatch = b.title.toLowerCase().includes(qSafe.toLowerCase()) ? 0 : 1;
      if (aTitleMatch !== bTitleMatch) return aTitleMatch - bTitleMatch;
      return 0;
    });

    const finalResults = results.slice(0, lim);

    res.json({
      ok: true,
      query: qSafe,
      count: finalResults.length,
      results: finalResults,
      partial: failedSources.length > 0,
      failedSources,
    });
  } catch (error) {
    console.error('[search] universalSearch error:', error);
    res.status(500).json({ ok: false, error: 'An error occurred during search' });
  }
});

// Vector search endpoint
router.get('/vector', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }
    const data = await vectorSearch.search(q, { limit: parseInt(limit) });
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[search] vectorSearch error:', error);
    res.status(500).json({ success: false, error: 'An error occurred during search' });
  }
});

// Traditional text search endpoint
router.get('/text', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const qSafe = String(q).slice(0, 100);
    const lim = Math.min(parseInt(limit, 10) || 10, 50);

    if (shouldUseStaticSearchFallback()) {
      const normalized = searchStaticArchive(qSafe, lim);
      return res.json({ success: true, query: qSafe, results: normalized, count: normalized.length });
    }

    const regex = new RegExp(escapeRegExp(qSafe), 'i');

    const results = await ArchiveEntry.find({
      $or: [
        { title: regex },
        { contentHtml: regex },
        { excerpt: regex },
        { tags: regex },
        { category: regex },
      ],
    })
      .select('title date excerpt category tags location externalId createdAt')
      .sort({ date: -1, createdAt: -1 })
      .limit(lim)
      .lean();

    const normalized = results.length > 0
      ? results.map((e) => ({ ...e, id: e._id || e.id }))
      : searchStaticArchive(qSafe, lim);
    res.json({ success: true, query: qSafe, results: normalized, count: normalized.length });
  } catch (error) {
    console.error('[search] textSearch error:', error);
    const { q, limit = 10 } = req.query || {};
    const qSafe = String(q || '').slice(0, 100);
    const lim = Math.min(parseInt(limit, 10) || 10, 50);
    const normalized = searchStaticArchive(qSafe, lim);
    res.json({ success: true, query: qSafe, results: normalized, count: normalized.length, fallback: true });
  }
});

// Artifact text search endpoint (marketplace artifacts)
router.get('/artifacts', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const qSafe = String(q).slice(0, 100);
    const lim = Math.min(parseInt(limit, 10) || 10, 50);

    if (shouldUseStaticSearchFallback()) {
      const normalized = searchStaticArtifacts(qSafe, lim);
      return res.json({ success: true, query: qSafe, results: normalized, count: normalized.length });
    }

    const regex = new RegExp(escapeRegExp(qSafe), 'i');

    const items = await Artifact.find({
      $or: [
        { title: regex },
        { name: regex },
        { description: regex },
        { category: regex },
        { artisan: regex },
        { tags: regex },
        { materials: regex },
      ],
    })
      .select('title name description category tags artisan price slug imageUrls status createdAt updatedAt')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(lim)
      .lean();

    const normalized = items.length > 0
      ? items.map((item) => ({
          ...item,
          id: item._id || item.id,
          type: 'artifact',
        }))
      : searchStaticArtifacts(qSafe, lim);

    return res.json({ success: true, query: qSafe, results: normalized, count: normalized.length });
  } catch (error) {
    console.error('[search] artifactSearch error:', error);
    return res.status(500).json({ success: false, error: 'An error occurred during artifact search' });
  }
});

// Combined search endpoint (archive entries + artifacts)
router.get('/all', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const qSafe = String(q).slice(0, 100);
    const lim = Math.min(parseInt(limit, 10) || 10, 50);

    if (shouldUseStaticSearchFallback()) {
      const staticResults = buildStaticSearchResults(qSafe, lim);
      return res.json({
        success: true,
        query: qSafe,
        results: staticResults.merged,
        count: staticResults.merged.length,
        breakdown: {
          entries: staticResults.entries.length,
          artifacts: staticResults.items.length,
        },
      });
    }

    const regex = new RegExp(escapeRegExp(qSafe), 'i');

    const [entries, items] = await Promise.all([
      ArchiveEntry.find({
        $or: [
          { title: regex },
          { contentHtml: regex },
          { excerpt: regex },
          { tags: regex },
          { category: regex },
        ],
      })
        .select('title date excerpt category tags location externalId createdAt')
        .sort({ date: -1, createdAt: -1 })
        .limit(lim)
        .lean(),
      Artifact.find({
        $or: [
          { title: regex },
          { name: regex },
          { description: regex },
          { category: regex },
          { artisan: regex },
          { tags: regex },
          { materials: regex },
        ],
      })
        .select('title name description category tags artisan price slug imageUrls status createdAt updatedAt')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(lim)
        .lean(),
    ]);

    const normalizedEntries = entries.map((e) => ({
      ...e,
      id: e._id || e.id,
      type: 'entry',
    }));
    const normalizedItems = items.map((item) => ({
      ...item,
      id: item._id || item.id,
      type: 'artifact',
    }));

    const finalEntries = normalizedEntries.length > 0
      ? normalizedEntries
      : searchStaticArchive(qSafe, lim).map((entry) => ({ ...entry, type: 'entry' }));
    const finalItems = normalizedItems.length > 0
      ? normalizedItems
      : searchStaticArtifacts(qSafe, lim);

    const merged = [...finalEntries, ...finalItems]
      .sort((a, b) => {
        const aTs = new Date(a.updatedAt || a.date || a.createdAt || 0).getTime();
        const bTs = new Date(b.updatedAt || b.date || b.createdAt || 0).getTime();
        return bTs - aTs;
      })
      .slice(0, lim * 2);

    return res.json({
      success: true,
      query: qSafe,
      results: merged,
      count: merged.length,
      breakdown: {
        entries: finalEntries.length,
        artifacts: finalItems.length,
      },
    });
  } catch (error) {
    console.error('[search] combinedSearch error:', error);
    const { q, limit = 10 } = req.query || {};
    const qSafe = String(q || '').slice(0, 100);
    const lim = Math.min(parseInt(limit, 10) || 10, 50);
    const staticResults = buildStaticSearchResults(qSafe, lim);
    return res.json({
      success: true,
      query: qSafe,
      results: staticResults.merged,
      count: staticResults.merged.length,
      breakdown: {
        entries: staticResults.entries.length,
        artifacts: staticResults.items.length,
      },
      fallback: true,
    });
  }
});

// Hybrid search (combines results from both methods)
router.get('/hybrid', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }
    // Run both searches in parallel
    const [vectorData, textResults] = await Promise.all([
      vectorSearch.search(q, { limit: parseInt(limit) }),
      Artifact.find({ $text: { $search: q } }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(parseInt(limit)),
    ]);
    // Combine and deduplicate results
    const seenIds = new Set();
    const combinedResults = [];
    // Add text results first
    textResults.forEach((result) => {
      seenIds.add(result._id.toString());
      combinedResults.push({ ...result.toObject(), source: 'text' });
    });
    // Add vector results that aren't duplicates
    vectorData.results.forEach((result) => {
      const id = result._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        combinedResults.push({ ...result, source: 'vector' });
      }
    });
    res.json({
      success: true,
      query: q,
      results: combinedResults.slice(0, parseInt(limit)),
      count: combinedResults.length,
    });
  } catch (error) {
    console.error('[search] hybridSearch error:', error);
    res.status(500).json({ success: false, error: 'An error occurred during search' });
  }
});

// Admin endpoint to reindex all artifacts
router.post('/reindex', async (req, res) => {
  try {
    // Verify admin access - you should replace this with proper authentication
    const { secret } = req.body;
    if (secret !== process.env.ADMIN_SECRET_CODE) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const count = await vectorSearch.indexAllArtifacts();
    res.json({ success: true, message: `Successfully indexed ${count} artifacts` });
  } catch (error) {
    console.error('[search] reindexAll error:', error);
    res.status(500).json({ success: false, error: 'Failed to reindex artifacts' });
  }
});

// Reindex a single artifact
router.post('/reindex/:id', async (req, res) => {
  try {
    // Verify admin access - you should replace this with proper authentication
    const { secret } = req.body;
    if (secret !== process.env.ADMIN_SECRET_CODE) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    await vectorSearch.indexArtifact({ _id: req.params.id });
    res.json({ success: true, message: 'Successfully indexed artifact' });
  } catch (error) {
    console.error(`Error reindexing artifact ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Failed to reindex artifact' });
  }
});

module.exports = router;
