// backend/routes/events.js - Community events management
const express = require('express');
const Event = require('../models/Event');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) return res.status(401).json({ error: 'Authentication required' });
  next();
}

/**
 * GET /api/events - List upcoming events
 */
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const query = { published: true, cancelled: false, startDateTime: { $gte: now } };
    if (req.query.type) query.eventType = req.query.type;

    const events = await Event.find(query)
      .sort({ startDateTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name avatar')
      .lean();

    const total = await Event.countDocuments(query);

    res.json({ events, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/events - Create event
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const event = new Event({
      ...req.body,
      organizer: req.user._id,
    });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/events/:eventId
 */
router.get('/:eventId', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      { $inc: { views: 1 } },
      { new: true },
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/events/:eventId/register - Register for event
 */
router.post('/:eventId/register', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const already = event.registeredUsers.find(
      (u) => u.userId.toString() === req.user._id.toString(),
    );
    if (already) {
      return res.status(400).json({ error: 'Already registered' });
    }

    if (event.maxAttendees && event.registeredUsers.length >= event.maxAttendees) {
      return res.status(400).json({ error: 'Event is full' });
    }

    event.registeredUsers.push({ userId: req.user._id, registeredAt: new Date() });
    event.registrationCount = event.registeredUsers.length;
    await event.save();

    res.json({ message: 'Registered', registrationCount: event.registrationCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
