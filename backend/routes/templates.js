const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const { authMiddleware } = require('../middleware/auth');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

// GET /api/templates - list for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0, type, commodity } = req.query;
    const query = { ownerId: req.user.id };
    if (type) query.type = type;
    if (commodity) query.commodityTags = commodity;

    const items = await Template.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip(parseInt(skip, 10));

    const total = await Template.countDocuments(query);
    res.json({ ok: true, items, total });
  } catch (err) {
    console.error('[templates] listTemplates error:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch templates' });
  }
});

// POST /api/templates - create
router.post('/', authMiddleware, async (req, res) => {
  try {
    const name = sanitize(req.body?.name);
    const body = sanitize(req.body?.body);
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required' });
    if (!body) return res.status(400).json({ ok: false, error: 'Body is required' });

    const template = new Template({
      ownerId: req.user.id,
      name,
      type: sanitize(req.body?.type || 'vetting') || 'vetting',
      body,
      commodityTags: Array.isArray(req.body?.commodityTags) ? req.body.commodityTags : [],
      stepTags: Array.isArray(req.body?.stepTags) ? req.body.stepTags : [],
    });

    await template.save();
    res.status(201).json({ ok: true, item: template });
  } catch (err) {
    console.error('[templates] createTemplate error:', err);
    res.status(500).json({ ok: false, error: 'Failed to create template' });
  }
});

// GET /api/templates/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const template = await Template.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!template) return res.status(404).json({ ok: false, error: 'Template not found' });
    res.json({ ok: true, item: template });
  } catch (err) {
    console.error('[templates] getTemplate error:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch template' });
  }
});

// PUT /api/templates/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const template = await Template.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!template) return res.status(404).json({ ok: false, error: 'Template not found' });

    const body = req.body || {};
    if (body.name !== undefined) template.name = sanitize(body.name);
    if (body.type !== undefined) template.type = sanitize(body.type) || template.type;
    if (body.body !== undefined) template.body = sanitize(body.body);
    if (Array.isArray(body.commodityTags)) template.commodityTags = body.commodityTags;
    if (Array.isArray(body.stepTags)) template.stepTags = body.stepTags;

    await template.save();
    res.json({ ok: true, item: template });
  } catch (err) {
    console.error('[templates] updateTemplate error:', err);
    res.status(500).json({ ok: false, error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Template.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!result) return res.status(404).json({ ok: false, error: 'Template not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[templates] deleteTemplate error:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete template' });
  }
});

module.exports = router;
