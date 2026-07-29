const express = require('express');
const router = express.Router();
const Commodity = require('../models/Commodity');
const { authMiddleware } = require('../middleware/auth');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

// GET /api/commodities - list for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0, category } = req.query;
    const query = { ownerId: req.user.id };
    if (category) query.category = category;

    const items = await Commodity.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip(parseInt(skip, 10))
      .populate('linkedTemplateIds', 'name type')
      .populate('linkedContactIds', 'name company type');

    const total = await Commodity.countDocuments(query);
    res.json({ ok: true, items, total });
  } catch (err) {
    console.error('[commodities] listCommodities error:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch commodities' });
  }
});

// POST /api/commodities - create
router.post('/', authMiddleware, async (req, res) => {
  try {
    const name = sanitize(req.body?.name);
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required' });

    const commodity = new Commodity({
      ownerId: req.user.id,
      name,
      category: sanitize(req.body?.category || ''),
      notes: sanitize(req.body?.notes || ''),
      marketData: {
        fobRange: sanitize(req.body?.marketData?.fobRange || ''),
        sampleCostMax: Number(req.body?.marketData?.sampleCostMax) || undefined,
        certificationsNeeded: sanitize(req.body?.marketData?.certificationsNeeded || ''),
        exportDocs: sanitize(req.body?.marketData?.exportDocs || ''),
      },
      redFlags: Array.isArray(req.body?.redFlags) ? req.body.redFlags.map(sanitize) : [],
      greenFlags: Array.isArray(req.body?.greenFlags) ? req.body.greenFlags.map(sanitize) : [],
      linkedTemplateIds: Array.isArray(req.body?.linkedTemplateIds) ? req.body.linkedTemplateIds : [],
      linkedContactIds: Array.isArray(req.body?.linkedContactIds) ? req.body.linkedContactIds : [],
    });

    await commodity.save();
    res.status(201).json({ ok: true, item: commodity });
  } catch (err) {
    console.error('[commodities] createCommodity error:', err);
    res.status(500).json({ ok: false, error: 'Failed to create commodity' });
  }
});

// GET /api/commodities/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const commodity = await Commodity.findOne({ _id: req.params.id, ownerId: req.user.id })
      .populate('linkedTemplateIds', 'name type body')
      .populate('linkedContactIds', 'name company type email whatsapp telegram');
    if (!commodity) return res.status(404).json({ ok: false, error: 'Commodity not found' });
    res.json({ ok: true, item: commodity });
  } catch (err) {
    console.error('[commodities] getCommodity error:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch commodity' });
  }
});

// PUT /api/commodities/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const commodity = await Commodity.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!commodity) return res.status(404).json({ ok: false, error: 'Commodity not found' });

    const body = req.body || {};
    if (body.name !== undefined) commodity.name = sanitize(body.name);
    if (body.category !== undefined) commodity.category = sanitize(body.category);
    if (body.notes !== undefined) commodity.notes = sanitize(body.notes);
    if (body.marketData) {
      if (body.marketData.fobRange !== undefined) commodity.marketData.fobRange = sanitize(body.marketData.fobRange);
      if (body.marketData.sampleCostMax !== undefined) commodity.marketData.sampleCostMax = Number(body.marketData.sampleCostMax) || undefined;
      if (body.marketData.certificationsNeeded !== undefined) commodity.marketData.certificationsNeeded = sanitize(body.marketData.certificationsNeeded);
      if (body.marketData.exportDocs !== undefined) commodity.marketData.exportDocs = sanitize(body.marketData.exportDocs);
    }
    if (Array.isArray(body.redFlags)) commodity.redFlags = body.redFlags.map(sanitize);
    if (Array.isArray(body.greenFlags)) commodity.greenFlags = body.greenFlags.map(sanitize);
    if (Array.isArray(body.linkedTemplateIds)) commodity.linkedTemplateIds = body.linkedTemplateIds;
    if (Array.isArray(body.linkedContactIds)) commodity.linkedContactIds = body.linkedContactIds;

    await commodity.save();
    res.json({ ok: true, item: commodity });
  } catch (err) {
    console.error('[commodities] updateCommodity error:', err);
    res.status(500).json({ ok: false, error: 'Failed to update commodity' });
  }
});

// DELETE /api/commodities/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Commodity.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!result) return res.status(404).json({ ok: false, error: 'Commodity not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[commodities] deleteCommodity error:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete commodity' });
  }
});

module.exports = router;
