const adminSession = require('../middleware/adminSession');
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const { createSystemEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

// Basic rate limiter for comment posting (per IP)
const commentsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin-only: list pending comments (session-based)
router.get('/pending', adminSession, async (req, res) => {
  try {
    const comments = await Comment.find({ approved: false }).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, comments });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin-only: approve a comment (session-based)
router.post('/:id/approve', adminSession, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ ok: false, message: 'Comment not found' });
    comment.approved = true;
    await comment.save();

    dispatchToOpenClaw(createSystemEvent('info', 'Comment approved', {
      commentId: comment._id?.toString(),
      blogSlug: comment.blogSlug,
      route: 'comments',
      actor: 'admin',
    }));

    res.json({ ok: true, message: 'Approved' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin-only: delete a comment (session-based)
router.post('/:id/delete', adminSession, async (req, res) => {
  try {
    const deleted = await Comment.findByIdAndDelete(req.params.id);

    if (deleted) {
      dispatchToOpenClaw(createSystemEvent('warning', 'Comment deleted', {
        commentId: deleted._id?.toString(),
        blogSlug: deleted.blogSlug,
        route: 'comments',
        actor: 'admin',
      }));
    }

    res.json({ ok: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin-only: debug list all comments (session-based)
router.get('/debug/all', adminSession, async (req, res) => {
  try {
    const comments = await Comment.find({}).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, comments });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// List comments for a blog slug
router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const comments = await Comment.find({ blogSlug: slug, approved: true })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ ok: true, comments });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Add a comment for a blog slug
router.post('/:slug/add', commentsLimiter, async (req, res) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const { authorName, body } = req.body || {};
    if (!body || body.trim().length < 2)
      return res.status(400).json({ ok: false, message: 'Comment body too short' });
    if (body.length > 5000)
      return res.status(400).json({ ok: false, message: 'Comment body too long (max 5000 characters)' });
    const safeAuthorName = (authorName || 'Anonymous').toString().slice(0, 100);
    const blogExists = await Blog.findOne({ slug, status: 'published' }).select('_id');
    if (!blogExists) return res.status(404).json({ ok: false, message: 'Blog not found' });
    const comment = new Comment({
      blogSlug: slug,
      authorName: safeAuthorName,
      body: body.toString().slice(0, 5000),
      approved: false,
    });
    await comment.save();

    dispatchToOpenClaw(createSystemEvent('info', 'Comment submitted', {
      commentId: comment._id?.toString(),
      blogSlug: comment.blogSlug,
      approved: comment.approved,
      route: 'comments',
      actor: 'public',
    }));

    res.json({ ok: true, message: 'Comment added', commentId: comment._id });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
