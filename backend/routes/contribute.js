const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { createSystemEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

// Public: submit a contribution (creates a pending blog without edit secret)
router.post('/submit', async (req, res) => {
  try {
    const title = (req.body?.title || '').trim();
    const content = (req.body?.content || '').toString();
    const authorName = (req.body?.authorName || 'Anonymous').toString();
    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!title || title.length < 3)
      return res.status(400).json({ ok: false, message: 'Title too short' });
    if (!content || content.length < 5)
      return res.status(400).json({ ok: false, message: 'Content too short' });

    // Ensure slug uniqueness by appending millis if needed
    let slug = slugBase || 'contribution';
    const exists = await Blog.findOne({ slug });
    if (exists) slug = `${slug}-${Date.now()}`;

    const blog = new Blog({
      slug,
      title,
      content,
      authorName,
      status: 'pending',
      editHashHashed: null,
    });
    await blog.save();

    dispatchToOpenClaw(createSystemEvent('info', 'Contribution submitted', {
      blogId: blog._id?.toString(),
      slug: blog.slug,
      title: blog.title,
      status: blog.status,
      route: 'contribute',
      actor: 'public',
    }));

    res.json({ ok: true, message: 'Contribution submitted for review', slug });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
