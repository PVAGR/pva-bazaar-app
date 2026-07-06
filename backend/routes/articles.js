// backend/routes/articles.js - Knowledge base articles
const express = require('express');
const Article = require('../models/Article');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) return res.status(401).json({ error: 'Authentication required' });
  next();
}

/**
 * GET /api/articles - List articles
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const query = { published: true };
    if (req.query.category) query.category = req.query.category;
    if (req.query.tag) query.tags = req.query.tag;

    const articles = await Article.find(query)
      .sort({ featured: -1, publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name avatar')
      .lean();

    const total = await Article.countDocuments(query);

    res.json({ articles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/articles - Create article
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const article = new Article({
      ...req.body,
      author: req.user._id,
    });
    await article.save();
    res.status(201).json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/articles/:articleId
 */
router.get('/:articleId', async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.articleId,
      { $inc: { views: 1 } },
      { new: true },
    ).populate('author', 'name avatar');
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/articles/:articleId - Update (author only)
 */
router.put('/:articleId', requireAuth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.articleId);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    if (article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    Object.assign(article, req.body);
    await article.save();
    res.json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/articles/:articleId/like - Like article
 */
router.post('/:articleId/like', requireAuth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.articleId);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    if (article.likedBy.includes(req.user._id)) {
      article.likedBy = article.likedBy.filter((id) => id.toString() !== req.user._id.toString());
      article.likes = Math.max(0, article.likes - 1);
    } else {
      article.likedBy.push(req.user._id);
      article.likes += 1;
    }

    await article.save();
    res.json({ likes: article.likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
