const express = require('express');
const router = express.Router();
const VectorSearchService = require('../utils/vectorSearchService');
const Artifact = require('../models/Artifact');

const vectorSearch = new VectorSearchService();
// Initialize optional vector DB lazily
(async () => { try { await vectorSearch.vectorDB.initialize(); } catch (_) {} })();

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
		console.error('Vector search error:', error);
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
		const results = await Artifact.find(
			{ $text: { $search: q } },
			{ score: { $meta: "textScore" } }
		)
			.sort({ score: { $meta: "textScore" } })
			.limit(parseInt(limit));
		res.json({ success: true, query: q, results: results, count: results.length });
	} catch (error) {
		console.error('Text search error:', error);
		res.status(500).json({ success: false, error: 'An error occurred during search' });
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
			Artifact.find(
				{ $text: { $search: q } },
				{ score: { $meta: "textScore" } }
			)
				.sort({ score: { $meta: "textScore" } })
				.limit(parseInt(limit))
		]);
		// Combine and deduplicate results
		const seenIds = new Set();
		const combinedResults = [];
		// Add text results first
		textResults.forEach(result => {
			seenIds.add(result._id.toString());
			combinedResults.push({ ...result.toObject(), source: 'text' });
		});
		// Add vector results that aren't duplicates
		vectorData.results.forEach(result => {
			const id = result._id.toString();
			if (!seenIds.has(id)) {
				seenIds.add(id);
				combinedResults.push({ ...result, source: 'vector' });
			}
		});
		res.json({ success: true, query: q, results: combinedResults.slice(0, parseInt(limit)), count: combinedResults.length });
	} catch (error) {
		console.error('Hybrid search error:', error);
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
		console.error('Reindexing error:', error);
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
