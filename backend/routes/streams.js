const express = require('express');
const router = express.Router();
const StreamSession = require('../models/StreamSession');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   GET /api/streams
 * @desc    Get all stream sessions for authenticated user
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;
    
    const query = { userId: req.user.id };
    if (status) query.status = status;
    
    const streams = await StreamSession.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await StreamSession.countDocuments(query);
    
    res.json({
      ok: true,
      items: streams,
      total,
      hasMore: skip + streams.length < total,
    });
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch streams' });
  }
});

/**
 * @route   GET /api/streams/:id
 * @desc    Get single stream session
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const stream = await StreamSession.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!stream) {
      return res.status(404).json({ ok: false, error: 'Stream not found' });
    }
    
    res.json({ ok: true, item: stream });
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch stream' });
  }
});

/**
 * @route   POST /api/streams
 * @desc    Create new stream session
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      platform,
      platformStreamUrl,
      tags,
      isPublic,
    } = req.body;
    
    const stream = new StreamSession({
      userId: req.user.id,
      title: title || 'Untitled Stream',
      description: description || '',
      platform: platform || 'none',
      platformStreamUrl,
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : true,
    });
    
    await stream.save();
    
    res.status(201).json({ ok: true, item: stream });
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ ok: false, error: 'Failed to create stream' });
  }
});

/**
 * @route   PUT /api/streams/:id
 * @desc    Update stream session
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const stream = await StreamSession.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!stream) {
      return res.status(404).json({ ok: false, error: 'Stream not found' });
    }
    
    const allowedUpdates = [
      'title',
      'description',
      'platform',
      'platformStreamUrl',
      'tags',
      'isPublic',
      'status',
      'ipfsHash',
      'ipfsGatewayUrl',
      'recordingDuration',
      'recordingSize',
      'thumbnailIpfsHash',
    ];
    
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        stream[field] = req.body[field];
      }
    });
    
    // Auto-set timestamps for status changes
    if (req.body.status === 'live' && !stream.startedAt) {
      stream.startedAt = new Date();
    } else if (req.body.status === 'ended' && !stream.endedAt) {
      stream.endedAt = new Date();
    }
    
    await stream.save();
    
    res.json({ ok: true, item: stream });
  } catch (error) {
    console.error('Error updating stream:', error);
    res.status(500).json({ ok: false, error: 'Failed to update stream' });
  }
});

/**
 * @route   DELETE /api/streams/:id
 * @desc    Delete stream session
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const stream = await StreamSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!stream) {
      return res.status(404).json({ ok: false, error: 'Stream not found' });
    }
    
    res.json({ ok: true, message: 'Stream deleted' });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete stream' });
  }
});

/**
 * @route   POST /api/streams/:id/webhook
 * @desc    Webhook endpoint for external platform events (Twitch/Kick/etc)
 * @access  Public (with signature verification in production)
 */
router.post('/:id/webhook', async (req, res) => {
  try {
    // TODO: Add webhook signature verification for security
    
    const stream = await StreamSession.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ ok: false, error: 'Stream not found' });
    }
    
    // Log webhook event
    stream.webhookEvents.push({
      event: req.body.event || 'unknown',
      timestamp: new Date(),
      payload: req.body,
    });
    
    // Handle specific events
    if (req.body.event === 'stream.online') {
      stream.status = 'live';
      stream.startedAt = new Date();
    } else if (req.body.event === 'stream.offline') {
      stream.status = 'ended';
      stream.endedAt = new Date();
    }
    
    await stream.save();
    
    res.json({ ok: true, received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

module.exports = router;
