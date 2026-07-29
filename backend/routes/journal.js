const express = require('express');
const router = express.Router();
const JournalEntry = require('../models/JournalEntry');
const { authenticateToken } = require('../middleware/auth');
const { createSystemEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

/**
 * @route   GET /api/journal
 * @desc    Get all journal entries for authenticated user
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, skip = 0, tags, isPublic } = req.query;
    
    const query = { userId: req.user.id };
    if (tags) query.tags = { $in: tags.split(',') };
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';
    
    const entries = await JournalEntry.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('streamSessionId', 'title platform startedAt');
    
    const total = await JournalEntry.countDocuments(query);
    
    res.json({
      ok: true,
      items: entries,
      total,
      hasMore: skip + entries.length < total,
    });
  } catch (error) {
    console.error('[journal] listEntries error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch journal entries' });
  }
});

/**
 * @route   GET /api/journal/:id
 * @desc    Get single journal entry
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate('streamSessionId', 'title platform startedAt');
    
    if (!entry) {
      return res.status(404).json({ ok: false, error: 'Journal entry not found' });
    }
    
    res.json({ ok: true, item: entry });
  } catch (error) {
    console.error('[journal] getEntry error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch journal entry' });
  }
});

/**
 * @route   POST /api/journal
 * @desc    Create new journal entry
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      content,
      contentType,
      streamSessionId,
      tags,
      mood,
      isPublic,
    } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ ok: false, error: 'Title and content are required' });
    }
    
    const entry = new JournalEntry({
      userId: req.user.id,
      title,
      content,
      contentType: contentType || 'markdown',
      streamSessionId,
      tags: tags || [],
      mood,
      isPublic: isPublic || false,
    });
    
    await entry.save();

    dispatchToOpenClaw(createSystemEvent('info', 'Journal entry created', {
      journalEntryId: entry._id?.toString(),
      title: entry.title,
      isPublic: entry.isPublic,
      userId: req.user.id,
      route: 'journal',
    }));
    
    res.status(201).json({ ok: true, item: entry });
  } catch (error) {
    console.error('[journal] createEntry error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create journal entry' });
  }
});

/**
 * @route   PUT /api/journal/:id
 * @desc    Update journal entry
 * @access  Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!entry) {
      return res.status(404).json({ ok: false, error: 'Journal entry not found' });
    }
    
    const allowedUpdates = [
      'title',
      'content',
      'contentType',
      'tags',
      'mood',
      'isPublic',
      'ipfsHash',
    ];
    
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        entry[field] = req.body[field];
      }
    });
    
    // Set publishedAt when making public for the first time
    if (req.body.isPublic && !entry.publishedAt) {
      entry.publishedAt = new Date();
    }
    
    await entry.save();

    dispatchToOpenClaw(createSystemEvent('info', 'Journal entry updated', {
      journalEntryId: entry._id?.toString(),
      title: entry.title,
      isPublic: entry.isPublic,
      userId: req.user.id,
      route: 'journal',
    }));
    
    res.json({ ok: true, item: entry });
  } catch (error) {
    console.error('[journal] updateEntry error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update journal entry' });
  }
});

/**
 * @route   DELETE /api/journal/:id
 * @desc    Delete journal entry
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await JournalEntry.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!entry) {
      return res.status(404).json({ ok: false, error: 'Journal entry not found' });
    }

    dispatchToOpenClaw(createSystemEvent('warning', 'Journal entry deleted', {
      journalEntryId: entry._id?.toString(),
      title: entry.title,
      userId: req.user.id,
      route: 'journal',
    }));
    
    res.json({ ok: true, message: 'Journal entry deleted' });
  } catch (error) {
    console.error('[journal] deleteEntry error:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete journal entry' });
  }
});

/**
 * @route   GET /api/journal/public/feed
 * @desc    Get public journal entries (for community feed)
 * @access  Public
 */
router.get('/public/feed', async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    
    const entries = await JournalEntry.find({ isPublic: true })
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'name profilePicture')
      .select('-content'); // Only return excerpts for feed
    
    res.json({ ok: true, items: entries });
  } catch (error) {
    console.error('[journal] listPublicFeed error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch public feed' });
  }
});

module.exports = router;
