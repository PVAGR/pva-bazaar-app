const adminSession = require('../middleware/adminSession');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Blog = require('../models/Blog');
const Comment = require('../models/Comment');

// Temporary: allow quick publish without admin secret when enabled
if (process.env.ENABLE_QUICK_PUBLISH === 'true') {
  router.post('/quick-publish', adminSession, async (req, res) => {
    try {
      const slug = (req.body?.slug || '').trim().toLowerCase();
      const title = (req.body?.title || '').trim();
      const content = (req.body?.content || '').toString();
      if (!slug || !title)
        return res.status(400).json({ ok: false, message: 'slug and title are required' });

      let blog = await Blog.findOne({ slug });
      if (!blog) {
        blog = new Blog({ slug, title, content, status: 'published' });
        await blog.save();
        return res.json({ ok: true, message: 'Blog created and published', slug });
      }
      blog.title = title || blog.title;
      blog.content = content;
      blog.status = 'published';
      await blog.save();
      res.json({ ok: true, message: 'Blog updated and published', slug });
    } catch (err) {
      console.error('blogs.quick-publish error', err);
      res.status(500).json({ ok: false, message: err.message || 'Internal error' });
    }
  });
}

// Admin-only: create or rotate a blog's edit secret (session-based)
router.post('/setup', adminSession, async (req, res) => {
  try {
    const slug = (req.body?.slug || '').trim().toLowerCase();
    const title = (req.body?.title || '').trim();
    if (!slug || !title)
      return res.status(400).json({ ok: false, message: 'slug and title are required' });

    let blog = await Blog.findOne({ slug });
    const newSecret = uuidv4();
    const hashed = await bcrypt.hash(newSecret, 10);

    if (!blog) {
      blog = new Blog({ slug, title, content: '', editHashHashed: hashed, status: 'published' });
      await blog.save();
      return res.json({
        ok: true,
        slug,
        editSecret: newSecret,
        message: 'Blog created. Keep the secret safe!',
      });
    }

    blog.editHashHashed = hashed;
    await blog.save();
    return res.json({
      ok: true,
      slug,
      editSecret: newSecret,
      message: 'Secret rotated. Keep the new secret safe!',
    });
  } catch (err) {
    console.error('blogs.setup error', err);
    res.status(500).json({ ok: false, message: err.message || 'Internal error' });
  }
});

// List published blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .select('slug title updatedAt');
    res.json({ ok: true, blogs });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin-only: list pending blogs (session-based)
router.get('/pending', adminSession, async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .select('slug title createdAt');
    res.json({ ok: true, blogs });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get a blog by slug with approved comments
router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const blog = await Blog.findOne({ slug, status: 'published' });
    if (!blog) return res.status(404).json({ ok: false, message: 'Blog not found' });
    const comments = await Comment.find({ blogSlug: slug, approved: true })
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      ok: true,
      blog: {
        slug: blog.slug,
        title: blog.title,
        content: blog.content,
        updatedAt: blog.updatedAt,
      },
      comments,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Update a blog (requires edit secret)
router.post('/:slug/update', async (req, res) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const editSecret = (req.body?.edit || req.query?.edit || '').toString();
    const content = (req.body?.content || '').toString();
    const title = (req.body?.title || '').toString();
    if (!editSecret) return res.status(400).json({ ok: false, message: 'Missing edit secret' });

    const blog = await Blog.findOne({ slug });
    if (!blog) return res.status(404).json({ ok: false, message: 'Blog not found' });
    const valid = await bcrypt.compare(editSecret, blog.editHashHashed || '');
    if (!valid) return res.status(403).json({ ok: false, message: 'Invalid edit secret' });

    if (title) blog.title = title;
    blog.content = content;
    await blog.save();
    res.json({ ok: true, message: 'Blog updated', updatedAt: blog.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin-only: publish a pending blog and issue an edit secret (session-based)
router.post('/:slug/publish', adminSession, async (req, res) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const blog = await Blog.findOne({ slug });
    if (!blog) return res.status(404).json({ ok: false, message: 'Blog not found' });

    blog.status = 'published';
    const newSecret = uuidv4();
    const hashed = await bcrypt.hash(newSecret, 10);
    blog.editHashHashed = hashed;
    await blog.save();
    res.json({ ok: true, message: 'Blog published', editSecret: newSecret });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
