// backend/routes/forums.js - Discussion forums
const express = require('express');
const { ForumCategory, ForumThread } = require('../models/ForumThread');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * GET /api/forums/categories - List all forum categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await ForumCategory.find()
      .sort({ name: 1 })
      .lean();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/forums/:categoryId/threads - Get category threads
 */
router.get('/:categoryId/threads', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const threads = await ForumThread.find({ categoryId: req.params.categoryId })
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name avatar')
      .lean();

    const total = await ForumThread.countDocuments({ categoryId: req.params.categoryId });

    res.json({
      threads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/forums/:categoryId/threads - Create thread
 */
router.post('/:categoryId/threads', requireAuth, async (req, res) => {
  try {
    const category = await ForumCategory.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const thread = new ForumThread({
      categoryId: req.params.categoryId,
      authorId: req.user._id,
      title: req.body.title,
      content: req.body.content,
      tags: req.body.tags || [],
    });

    await thread.save();
    await category.updateOne({ $inc: { threadCount: 1 } });

    const populated = await thread.populate('authorId', 'name avatar');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/forums/thread/:threadId - Get single thread
 */
router.get('/thread/:threadId', async (req, res) => {
  try {
    const thread = await ForumThread.findByIdAndUpdate(
      req.params.threadId,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('authorId', 'name avatar');

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    res.json(thread);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/forums/thread/:threadId/reply - Add reply
 */
router.post('/thread/:threadId/reply', requireAuth, async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (thread.locked) {
      return res.status(400).json({ error: 'Thread is locked' });
    }

    const reply = {
      _id: new require('mongoose').Types.ObjectId(),
      authorId: req.user._id,
      content: req.body.content,
      createdAt: new Date(),
    };

    thread.replies.push(reply);
    thread.replyCount = thread.replies.length;
    thread.updatedAt = new Date();

    await thread.save();

    res.status(201).json({ message: 'Reply added', reply });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/forums/thread/:threadId/pin - Pin thread (mod only)
 */
router.post('/thread/:threadId/pin', requireAuth, async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const category = await ForumCategory.findById(thread.categoryId);
    if (!category || !category.moderators.includes(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    thread.pinned = !thread.pinned;
    await thread.save();

    res.json({ message: 'Thread pinned', pinned: thread.pinned });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
