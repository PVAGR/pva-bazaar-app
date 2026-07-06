const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { authMiddleware } = require('../middleware/auth');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

// GET /api/contacts - list for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0, type, commodity } = req.query;
    const query = { ownerId: req.user.id };
    if (type) query.type = type;
    if (commodity) query.commodities = commodity;

    const items = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip(parseInt(skip, 10))
      .populate('commodities', 'name category');

    const total = await Contact.countDocuments(query);
    res.json({ ok: true, items, total });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch contacts' });
  }
});

// POST /api/contacts - create
router.post('/', authMiddleware, async (req, res) => {
  try {
    const name = sanitize(req.body?.name);
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required' });

    const contact = new Contact({
      ownerId: req.user.id,
      name,
      email: sanitize(req.body?.email || ''),
      phone: sanitize(req.body?.phone || ''),
      whatsapp: sanitize(req.body?.whatsapp || ''),
      telegram: sanitize(req.body?.telegram || ''),
      company: sanitize(req.body?.company || ''),
      country: sanitize(req.body?.country || ''),
      city: sanitize(req.body?.city || ''),
      type: sanitize(req.body?.type || 'supplier') || 'supplier',
      commodities: Array.isArray(req.body?.commodities) ? req.body.commodities : [],
      notes: sanitize(req.body?.notes || ''),
      birthDate: req.body?.birthDate ? new Date(req.body.birthDate) : undefined,
      birthTime: sanitize(req.body?.birthTime || ''),
      birthPlace: sanitize(req.body?.birthPlace || ''),
    });

    await contact.save();
    res.status(201).json({ ok: true, item: contact });
  } catch (err) {
    console.error('Error creating contact:', err);
    res.status(500).json({ ok: false, error: 'Failed to create contact' });
  }
});

// GET /api/contacts/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, ownerId: req.user.id }).populate(
      'commodities',
      'name category',
    );
    if (!contact) return res.status(404).json({ ok: false, error: 'Contact not found' });
    res.json({ ok: true, item: contact });
  } catch (err) {
    console.error('Error fetching contact:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch contact' });
  }
});

// PUT /api/contacts/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!contact) return res.status(404).json({ ok: false, error: 'Contact not found' });

    const body = req.body || {};
    if (body.name !== undefined) contact.name = sanitize(body.name);
    if (body.email !== undefined) contact.email = sanitize(body.email);
    if (body.phone !== undefined) contact.phone = sanitize(body.phone);
    if (body.whatsapp !== undefined) contact.whatsapp = sanitize(body.whatsapp);
    if (body.telegram !== undefined) contact.telegram = sanitize(body.telegram);
    if (body.company !== undefined) contact.company = sanitize(body.company);
    if (body.country !== undefined) contact.country = sanitize(body.country);
    if (body.city !== undefined) contact.city = sanitize(body.city);
    if (body.type !== undefined) contact.type = sanitize(body.type) || contact.type;
    if (Array.isArray(body.commodities)) contact.commodities = body.commodities;
    if (body.notes !== undefined) contact.notes = sanitize(body.notes);
    if (body.birthDate !== undefined)
      contact.birthDate = body.birthDate ? new Date(body.birthDate) : undefined;
    if (body.birthTime !== undefined) contact.birthTime = sanitize(body.birthTime);
    if (body.birthPlace !== undefined) contact.birthPlace = sanitize(body.birthPlace);

    await contact.save();
    res.json({ ok: true, item: contact });
  } catch (err) {
    console.error('Error updating contact:', err);
    res.status(500).json({ ok: false, error: 'Failed to update contact' });
  }
});

// POST /api/contacts/:id/outreach - log outreach
router.post('/:id/outreach', authMiddleware, async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!contact) return res.status(404).json({ ok: false, error: 'Contact not found' });

    const { templateId, response, status } = req.body || {};
    contact.outreachLog.push({
      templateId: templateId || undefined,
      response: sanitize(response || ''),
      status: sanitize(status || 'sent') || 'sent',
    });
    await contact.save();
    res.json({ ok: true, item: contact });
  } catch (err) {
    console.error('Error logging outreach:', err);
    res.status(500).json({ ok: false, error: 'Failed to log outreach' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Contact.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!result) return res.status(404).json({ ok: false, error: 'Contact not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete contact' });
  }
});

module.exports = router;
