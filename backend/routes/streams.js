const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const StreamSession = require('../models/StreamSession');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

function sanitizeDeep(v) {
  if (typeof v === 'string') return sanitize(v);
  if (Array.isArray(v)) return v.map(sanitizeDeep);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = sanitizeDeep(val);
    return out;
  }
  return v;
}

/**
 * @route   GET /api/streams
 * @desc    Get all stream sessions for authenticated user
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
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
    console.error('[streams] listStreams error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch streams' });
  }
});

/**
 * @route   GET /api/streams/drafts
 * @desc    Fetch the saved create-stream draft for the current user
 * @access  Private
 */
router.get('/drafts', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    const draft = user?.preferences?.drafts?.streams || null;
    res.json({ ok: true, draft });
  } catch (error) {
    console.error('[streams] getDraft error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch stream draft' });
  }
});

/**
 * @route   PUT /api/streams/drafts
 * @desc    Save the create-stream draft for the current user (Mongo-backed)
 * @access  Private
 */
router.put('/drafts', authenticateToken, async (req, res) => {
  try {
    const incoming = req.body?.draft !== undefined ? req.body.draft : req.body;
    const draft = sanitizeDeep(incoming || null);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        'preferences.drafts.streams': draft,
        updatedAt: Date.now(),
      },
      { new: true }
    ).select('preferences');

    res.json({ ok: true, draft: user?.preferences?.drafts?.streams || null });
  } catch (error) {
    console.error('[streams] saveDraft error:', error);
    res.status(500).json({ ok: false, error: 'Failed to save stream draft' });
  }
});

/**
 * @route   DELETE /api/streams/drafts
 * @desc    Clear the saved stream draft
 * @access  Private
 */
router.delete('/drafts', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user.id,
      { 'preferences.drafts.streams': null, updatedAt: Date.now() },
      { new: true }
    ).select('preferences');

    res.json({ ok: true, draft: null });
  } catch (error) {
    console.error('[streams] clearDraft error:', error);
    res.status(500).json({ ok: false, error: 'Failed to clear stream draft' });
  }
});

/**
 * @route   GET /api/streams/:id
 * @desc    Get single stream session
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
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
    console.error('[streams] getStream error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch stream' });
  }
});

/**
 * @route   POST /api/streams
 * @desc    Create new stream session
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
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
    console.error('[streams] createStream error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create stream' });
  }
});

/**
 * @route   PUT /api/streams/:id
 * @desc    Update stream session
 * @access  Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
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
    console.error('[streams] updateStream error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update stream' });
  }
});

/**
 * @route   DELETE /api/streams/:id
 * @desc    Delete stream session
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
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
    console.error('[streams] deleteStream error:', error);
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
    // Webhook signature verification (HMAC SHA-256)
    // Expected headers:
    //  - x-webhook-signature: hex digest of HMAC(secret, `${timestamp}.${jsonPayload}`)
    //  - x-webhook-timestamp: unix epoch seconds
    const webhookSecret = process.env.STREAM_WEBHOOK_SECRET;
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const isProd = process.env.NODE_ENV === 'production';

    if (webhookSecret) {
      if (!signature || !timestamp) {
        return res.status(401).json({ ok: false, error: 'Missing webhook signature headers' });
      }

      const ts = Number(timestamp);
      if (!Number.isFinite(ts)) {
        return res.status(401).json({ ok: false, error: 'Invalid webhook timestamp' });
      }

      // Replay protection: reject requests older than 5 minutes
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > 300) {
        return res.status(401).json({ ok: false, error: 'Stale webhook timestamp' });
      }

      const payload = JSON.stringify(req.body || {});
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');

      // timing-safe compare
      const sigBuf = Buffer.from(String(signature), 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return res.status(401).json({ ok: false, error: 'Invalid webhook signature' });
      }
    } else if (isProd) {
      // In production, require the secret to be configured.
      console.error('STREAM_WEBHOOK_SECRET is not configured in production');
      return res.status(503).json({ ok: false, error: 'Webhook not configured' });
    }
    
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
    console.error('[streams] processWebhook error:', error);
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

module.exports = router;
