const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { decryptJson, encryptJson } = require('../utils/cryptoVault');

function mustEnv(key) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v;
}

function isObjectIdHex(v) {
  return typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
}

function getRedirectUri(req) {
  if (process.env.YOUTUBE_REDIRECT_URI) return process.env.YOUTUBE_REDIRECT_URI;
  const host = req.get('host');
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return `${proto}://${host}/api/oauth/youtube/callback`;
}

function getFrontendReturnUrl(_req) {
  return process.env.OAUTH_FRONTEND_RETURN_URL || 'https://pvabazaar.org/#/streams';
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

// GET /api/oauth/youtube/status
router.get('/youtube/status', (req, res) => {
  const required = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'OAUTH_TOKEN_ENC_KEY'];
  const optional = ['YOUTUBE_REDIRECT_URI', 'OAUTH_FRONTEND_RETURN_URL'];
  const missing = required.filter((k) => !process.env[k]);
  res.json({
    ok: true,
    configured: missing.length === 0,
    missing,
    required,
    optional,
    redirectUri: getRedirectUri(req),
    frontendReturnUrl: getFrontendReturnUrl(req),
    clientIdSet: !!process.env.YOUTUBE_CLIENT_ID,
    clientSecretSet: !!process.env.YOUTUBE_CLIENT_SECRET,
    tokenVaultKeySet: !!process.env.OAUTH_TOKEN_ENC_KEY,
  });
});

// GET /api/oauth/youtube/start (auth required)
router.get('/youtube/start', async (req, res) => {
  try {
    const mode = String(req.query.mode || '');
    const token = getBearerToken(req);
    const returnUrl = getFrontendReturnUrl(req);

    if (!token) {
      if (mode === 'json') return res.status(401).json({ ok: false, message: 'No authentication token provided' });
      return res.redirect(
        `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent('Please log in first')}`
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, message: 'Invalid authentication token' });
    }
    if (!decoded?.id || !isObjectIdHex(String(decoded.id))) {
      return res.status(401).json({ ok: false, message: 'Invalid authentication token (subject)' });
    }

    const clientId = mustEnv('YOUTUBE_CLIENT_ID');
    mustEnv('YOUTUBE_CLIENT_SECRET');
    mustEnv('OAUTH_TOKEN_ENC_KEY');
    const redirectUri = getRedirectUri(req);

    const state = jwt.sign(
      { uid: decoded.id, nonce: Math.random().toString(36).slice(2) },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      // Minimal for "is live" checks; can expand later.
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      state,
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    if (mode === 'json') return res.json({ ok: true, url });
    return res.redirect(url);
  } catch (err) {
    console.error('YouTube oauth start error:', err.message);
    return res.status(503).json({ ok: false, error: 'YouTube OAuth not configured', message: err.message });
  }
});

// GET /api/oauth/youtube/callback (public)
router.get('/youtube/callback', async (req, res) => {
  const returnUrl = getFrontendReturnUrl(req);
  try {
    const clientId = mustEnv('YOUTUBE_CLIENT_ID');
    const clientSecret = mustEnv('YOUTUBE_CLIENT_SECRET');
    mustEnv('OAUTH_TOKEN_ENC_KEY');
    const redirectUri = getRedirectUri(req);

    const code = req.query.code;
    const state = req.query.state;
    const error = req.query.error;

    if (error) {
      return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent(String(error))}`);
    }
    if (!code || !state) {
      return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent('Missing code/state')}`);
    }

    let decoded;
    try {
      decoded = jwt.verify(String(state), process.env.JWT_SECRET);
    } catch {
      return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent('Invalid OAuth state. Please try again.')}`);
    }

    const uid = decoded?.uid;
    if (!uid) {
      return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent('OAuth state missing user id')}`);
    }

    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    const payload = tokenRes?.data || {};
    if (!payload.access_token) throw new Error('Google token exchange failed');

    const user = await User.findById(uid);
    if (user) {
      user.oauthTokens = user.oauthTokens || {};
      user.oauthTokens.youtube = { payload: encryptJson({ provider: 'youtube', ...payload, saved_at: new Date().toISOString() }), updatedAt: new Date() };
      await user.save();
    }

    return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}connected=youtube`);
  } catch (err) {
    console.error('YouTube oauth callback error:', err.response?.data || err.message);
    return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent('YouTube connect failed')}`);
  }
});

// GET /api/oauth/youtube/live-status (auth required) - real LiveBroadcast API
router.get('/youtube/live-status', authMiddleware, async (req, res) => {
  try {
    mustEnv('OAUTH_TOKEN_ENC_KEY');
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    const stored = user.oauthTokens?.youtube?.payload || null;
    const tokens = decryptJson(stored);
    if (!tokens?.access_token) return res.json({ ok: true, connected: false, live: false });

    const headers = { Authorization: `Bearer ${tokens.access_token}` };

    // 1. Get channel (for channelTitle)
    const channelsRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      headers,
      params: { part: 'snippet', mine: 'true' },
      timeout: 15000,
    });
    const channel = channelsRes?.data?.items?.[0] || null;

    // 2. LiveBroadcasts list with broadcastStatus=active = currently live
    const liveRes = await axios.get('https://www.googleapis.com/youtube/v3/liveBroadcasts', {
      headers,
      params: {
        part: 'snippet,status,contentDetails',
        broadcastStatus: 'active',
        maxResults: 1,
      },
      timeout: 15000,
    });
    const liveBroadcast = liveRes?.data?.items?.[0] || null;

    if (!liveBroadcast) {
      return res.json({
        ok: true,
        connected: true,
        live: false,
        channelTitle: channel?.snippet?.title || '',
      });
    }

    // Fetch viewer count from liveStreams if we have a stream id
    let viewerCount = 0;
    const streamId = liveBroadcast?.contentDetails?.boundStreamId;
    if (streamId) {
      try {
        const streamRes = await axios.get('https://www.googleapis.com/youtube/v3/liveStreams', {
          headers,
          params: { part: 'statistics', id: streamId },
          timeout: 10000,
        });
        const ls = streamRes?.data?.items?.[0];
        if (ls?.statistics?.concurrentViewers) viewerCount = parseInt(ls.statistics.concurrentViewers, 10) || 0;
      } catch {
        // best-effort
      }
    }

    return res.json({
      ok: true,
      connected: true,
      live: true,
      title: liveBroadcast?.snippet?.title || '',
      channelTitle: channel?.snippet?.title || '',
      viewerCount,
      startedAt: liveBroadcast?.snippet?.publishedAt || null,
      broadcastId: liveBroadcast?.id || '',
    });
  } catch (err) {
    console.error('YouTube live status error:', err.response?.data || err.message);
    return res.status(503).json({ ok: false, message: 'YouTube status unavailable' });
  }
});

module.exports = router;

