const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/oauth/kick/live-status
 * Returns real viewer count from Kick public API (no OAuth - Kick uses channel slug).
 * Uses user's kick.slug from profile.
 */
router.get('/kick/live-status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    const slug = user.kick?.slug?.trim();
    if (!slug) {
      return res.json({ ok: true, connected: false, live: false, message: 'Kick channel not set' });
    }

    const resp = await axios.get(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`, {
      timeout: 10000,
      headers: { 'Accept': 'application/json', 'User-Agent': 'PVA-Bazaar/1.0' },
    });

    const data = resp?.data;
    const stream = data?.livestream || data?.stream || null;
    const isLive = stream?.is_live === true;
    const viewerCount = typeof stream?.viewer_count === 'number' ? stream.viewer_count : 0;

    return res.json({
      ok: true,
      connected: true,
      live: isLive,
      viewerCount: isLive ? viewerCount : 0,
      slug,
      channelName: data?.user?.username || data?.slug || slug,
      streamTitle: stream?.session_title || stream?.stream_title || stream?.title || '',
      startedAt: stream?.created_at || stream?.start_time || null,
    });
  } catch (err) {
    if (err?.response?.status === 404) {
      return res.json({ ok: true, connected: true, live: false, message: 'Channel not found' });
    }
    console.error('Kick live status error:', err?.response?.data || err.message);
    return res.status(503).json({ ok: false, message: 'Kick status unavailable' });
  }
});

/**
 * GET /api/oauth/kick/status
 * Returns whether Kick channel is configured for this user.
 */
router.get('/kick/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const slug = user?.kick?.slug?.trim();
    res.json({
      ok: true,
      configured: !!slug,
      slug: slug || null,
      message: slug ? `Channel: ${slug}` : 'Add your Kick channel slug in Streams settings',
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
