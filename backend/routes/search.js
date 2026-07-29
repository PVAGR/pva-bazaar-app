const express = require('express');
const router = express.Router();
const VectorSearchService = require('../utils/vectorSearchService');
const Artifact = require('../models/Artifact');
const ArchiveEntry = require('../models/ArchiveEntry');
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
