const adminSession = require('../middleware/adminSession');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const EditablePage = require('../models/EditablePage');

// Create or rotate an editable page's secret (admin-only, session-based)
router.post('/setup', adminSession, async (req, res) => {
  try {
    const slug = (req.body?.slug || 'home').trim().toLowerCase();
    const title = req.body?.title || '';
    const rotate = !!req.body?.rotate;

    let page = await EditablePage.findOne({ slug });
    const newSecret = uuidv4();
    const hashed = await bcrypt.hash(newSecret, 10);

    if (!page) {
      page = new EditablePage({ slug, title, content: '', editHashHashed: hashed });
      await page.save();
      return res.json({
        ok: true,
        slug,
        editSecret: newSecret,
        message: 'Page created. Keep the secret safe!',
      });
    }

    if (rotate) {
      page.editHashHashed = hashed;
      await page.save();
      return res.json({
        ok: true,
        slug,
        editSecret: newSecret,
        message: 'Secret rotated. Keep the new secret safe!',
      });
    }

    // If not rotating, inform already exists
    return res.json({
      ok: true,
      slug,
      exists: true,
      message: 'Page already exists. Use rotate=true to issue a new secret.',
    });
  } catch (err) {
    console.error('pages.setup error', err);
    res.status(500).json({ ok: false, message: err.message || 'Internal error' });
  }
});

// Public: get page by slug
router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const page = await EditablePage.findOne({ slug }).lean();
    if (!page) return res.status(404).json({ ok: false, message: 'Page not found' });
    res.json({
      ok: true,
      slug: page.slug,
      title: page.title,
      content: page.content,
      updatedAt: page.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Update: requires valid edit secret via body.edit or query ?edit=
router.post('/:slug/update', async (req, res) => {
  try {
    const slug = req.params.slug.trim().toLowerCase();
    const editSecret = (req.body?.edit || req.query?.edit || '').toString();
    const content = (req.body?.content || '').toString();

    if (!editSecret) return res.status(400).json({ ok: false, message: 'Missing edit secret' });
    const page = await EditablePage.findOne({ slug });
    if (!page) return res.status(404).json({ ok: false, message: 'Page not found' });

    const valid = await bcrypt.compare(editSecret, page.editHashHashed);
    if (!valid) return res.status(403).json({ ok: false, message: 'Invalid edit secret' });

    page.content = content;
    await page.save();
    res.json({ ok: true, message: 'Updated successfully', updatedAt: page.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
