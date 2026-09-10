const adminSession = require('../middleware/adminSession');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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

// Admin-only: create a blog draft ONLINE or rotate its edit secret.
//
// Server authority: the record is created as `pending` (a saved draft), never
// `published`. An empty blog must not become publicly visible before its
// content has been written. The owner writes content via /:slug/update (edit
// secret) and only then explicitly publishes via /:slug/publish.
router.post('/setup', adminSession, async (req, res) => {
  try {
    const slug = (req.body?.slug || '').trim().toLowerCase();
    const title = (req.body?.title || '').trim();
    if (!slug || !title)
      return res.status(400).json({ ok: false, message: 'slug and title are required' });

    let blog = await Blog.findOne({ slug });
    const newSecret = crypto.randomUUID();
    const hashed = await bcrypt.hash(newSecret, 10);

    if (!blog) {
      blog = new Blog({ slug, title, content: '', editHashHashed: hashed, status: 'pending' });
      await blog.save();
      return res.json({
        ok: true,
        slug,
        status: 'pending',
        editSecret: newSecret,
        message: 'Draft saved online. Keep the edit secret safe!',
      });
    }

    blog.editHashHashed = hashed;
    if (blog.status !== 'published') {
      blog.status = 'pending';
    }
    await blog.save();
    return res.json({
      ok: true,
      slug,
      status: blog.status,
      editSecret: newSecret,
      message: 'Secret rotated. Keep the new edit secret safe!',
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
      .select('slug title authorName updatedAt createdAt');
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

// Get a blog by slug with approved comments (published only)
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
        authorName: blog.authorName,
        status: blog.status,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
      },
      comments,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Update a blog that is saved online (requires edit secret). Does NOT change
// publication status — a pending draft stays pending, a published post stays
// published with the updated content.
router.post('/:slug/update', async (req, res) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const editSecret = (req.body?.edit || req.query?.edit || '').toString();
    const content = (req.body?.content || '').toString();
    const title = (req.body?.title || '').toString();
    const authorName = (req.body?.authorName || '').toString().trim();
    if (!editSecret) return res.status(400).json({ ok: false, message: 'Missing edit secret' });

    const blog = await Blog.findOne({ slug });
    if (!blog) return res.status(404).json({ ok: false, message: 'Blog not found' });
    const valid = await bcrypt.compare(editSecret, blog.editHashHashed || '');
    if (!valid) return res.status(403).json({ ok: false, message: 'Invalid edit secret' });

    if (title) blog.title = title;
    blog.content = content;
    if (authorName) {
      blog.authorName = authorName;
    }
    await blog.save();
    res.json({ ok: true, message: 'Blog updated', status: blog.status, updatedAt: blog.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin-only: publish a saved online blog draft. Requires real content so an
// empty draft can never be pushed public by accident.
router.post('/:slug/publish', adminSession, async (req, res) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const blog = await Blog.findOne({ slug });
    if (!blog) return res.status(404).json({ ok: false, message: 'Blog not found' });

    if (!blog.title || !String(blog.content || '').trim()) {
      return res.status(400).json({
        ok: false,
        message: 'Add a title and body to the draft before publishing',
      });
    }

    blog.status = 'published';
    await blog.save();
    res.json({ ok: true, message: 'Blog published', slug: blog.slug, status: 'published' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin-only: delete a blog draft or published post.
router.delete('/:slug', adminSession, async (req, res) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const blog = await Blog.findOneAndDelete({ slug });
    if (!blog) return res.status(404).json({ ok: false, message: 'Blog not found' });
    res.json({ ok: true, message: 'Blog deleted', slug });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;