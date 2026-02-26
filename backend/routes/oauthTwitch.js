const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const { decryptJson, encryptJson } = require('../utils/cryptoVault');
const { authMiddleware } = require('../middleware/auth');

function mustEnv(key) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v;
}

function isObjectIdHex(v) {
  return typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
}

function getRedirectUri(req) {
  // Prefer explicit config so it matches Twitch dev console exactly.
  if (process.env.TWITCH_REDIRECT_URI) return process.env.TWITCH_REDIRECT_URI;

  // Safe default for our production domain. Works for most users but still should be
  // set explicitly in Vercel to avoid mismatch if domains change.
  const host = req.get('host');
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return `${proto}://${host}/api/oauth/twitch/callback`;
}

function getFrontendReturnUrl(_req) {
  return process.env.OAUTH_FRONTEND_RETURN_URL || 'https://pvabazaar.org/#/streams';
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

async function refreshTwitchToken({ clientId, clientSecret, refreshToken }) {
  const tokenRes = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
    timeout: 15000,
  });
  return tokenRes?.data || null;
}

// GET /api/oauth/twitch/status
// Returns configuration status (never returns secret values).
router.get('/twitch/status', (req, res) => {
  const required = ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'OAUTH_TOKEN_ENC_KEY'];
  const optional = ['TWITCH_REDIRECT_URI', 'OAUTH_FRONTEND_RETURN_URL'];
  const missing = required.filter((k) => !process.env[k]);
  res.json({
    ok: true,
    configured: missing.length === 0,
    missing,
    required,
    optional,
    // Helpful diagnostics for the UI (these are not secrets)
    redirectUri: getRedirectUri(req),
    frontendReturnUrl: getFrontendReturnUrl(req),
    clientIdSet: !!process.env.TWITCH_CLIENT_ID,
    clientSecretSet: !!process.env.TWITCH_CLIENT_SECRET,
    tokenVaultKeySet: !!process.env.OAUTH_TOKEN_ENC_KEY,
  });
});

// GET /api/oauth/twitch/live-status (auth required)
router.get('/twitch/live-status', authMiddleware, async (req, res) => {
  try {
    const clientId = mustEnv('TWITCH_CLIENT_ID');
    const clientSecret = mustEnv('TWITCH_CLIENT_SECRET');
    mustEnv('OAUTH_TOKEN_ENC_KEY');

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    if (!user.twitch?.id) {
      return res.json({ ok: true, connected: false, live: false, message: 'Twitch not connected' });
    }

    const stored = user.oauthTokens?.twitch?.payload || null;
    const tokens = decryptJson(stored);
    if (!tokens?.access_token) {
      return res.status(409).json({
        ok: false,
        message: 'Twitch connected, but tokens are not stored yet. Reconnect Twitch.',
      });
    }

    // Best-effort refresh if expired or if API returns 401.
    async function callHelix(accessToken) {
      return axios.get('https://api.twitch.tv/helix/streams', {
        headers: { 'Client-ID': clientId, Authorization: `Bearer ${accessToken}` },
        params: { user_id: user.twitch.id },
        timeout: 15000,
      });
    }

    let accessToken = tokens.access_token;
    let helix;
    try {
      helix = await callHelix(accessToken);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 && tokens.refresh_token) {
        const refreshed = await refreshTwitchToken({
          clientId,
          clientSecret,
          refreshToken: tokens.refresh_token,
        });
        if (refreshed?.access_token) {
          accessToken = refreshed.access_token;
          const nextTokens = { ...tokens, ...refreshed, refreshed_at: new Date().toISOString() };
          user.oauthTokens = user.oauthTokens || {};
          user.oauthTokens.twitch = { payload: encryptJson(nextTokens), updatedAt: new Date() };
          await user.save();
          helix = await callHelix(accessToken);
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }

    const stream = helix?.data?.data?.[0] || null;
    if (!stream) return res.json({ ok: true, connected: true, live: false });
    return res.json({
      ok: true,
      connected: true,
      live: true,
      title: stream.title || '',
      viewerCount: stream.viewer_count || 0,
      startedAt: stream.started_at || null,
      gameName: stream.game_name || '',
    });
  } catch (err) {
    console.error('Twitch live status error:', err.response?.data || err.message);
    return res.status(503).json({ ok: false, message: 'Twitch status unavailable' });
  }
});

// GET /api/oauth/twitch/start
// - If called from the frontend app, it should use Authorization header and request mode=json,
//   then the UI redirects to the returned URL.
// - If opened directly in a browser tab without auth, redirect to the frontend login.
router.get('/twitch/start', async (req, res) => {
  try {
    const mode = String(req.query.mode || '');
    const token = getBearerToken(req);

    if (!token) {
      const returnUrl = getFrontendReturnUrl(req);
      if (mode === 'json') {
        return res.status(401).json({ ok: false, message: 'No authentication token provided' });
      }
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

    const clientId = mustEnv('TWITCH_CLIENT_ID');
    mustEnv('TWITCH_CLIENT_SECRET'); // we only validate here; used in callback
    const redirectUri = getRedirectUri(req);

    // Encode user id into signed state so callback can link the Twitch identity.
    const state = jwt.sign(
      { uid: decoded.id, nonce: Math.random().toString(36).slice(2) },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      // Request basic user identity + refresh token.
      scope: 'user:read:email',
      state,
      force_verify: 'true',
    });

    const url = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    if (mode === 'json') {
      return res.json({ ok: true, url });
    }
    return res.redirect(url);
  } catch (err) {
    console.error('Twitch oauth start error:', err);
    return res.status(503).json({
      ok: false,
      error: 'Twitch OAuth not configured',
      message: err.message,
    });
  }
});

// GET /api/oauth/twitch/callback (public)
router.get('/twitch/callback', async (req, res) => {
  try {
    const clientId = mustEnv('TWITCH_CLIENT_ID');
    const clientSecret = mustEnv('TWITCH_CLIENT_SECRET');
    const redirectUri = getRedirectUri(req);

    const code = req.query.code;
    const state = req.query.state;
    const error = req.query.error;
    const errorDesc = req.query.error_description;

    const returnUrl = getFrontendReturnUrl(req);

    if (error) {
      const msg = `${error}${errorDesc ? `: ${errorDesc}` : ''}`;
      return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent(msg)}`);
    }

    if (!code || !state) {
      return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent('Missing code/state')}`);
    }

    let decoded;
    try {
      decoded = jwt.verify(String(state), process.env.JWT_SECRET);
    } catch (e) {
      return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent('Invalid OAuth state. Please try again.')}`);
    }

    const uid = decoded?.uid;
    if (!uid) {
      return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent('OAuth state missing user id')}`);
    }

    // Exchange code -> user access token
    const tokenRes = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      },
      timeout: 15000,
    });

    const accessToken = tokenRes?.data?.access_token;
    if (!accessToken) throw new Error('Twitch token exchange failed');
    const refreshToken = tokenRes?.data?.refresh_token || '';
    const expiresIn = tokenRes?.data?.expires_in;
    const tokenType = tokenRes?.data?.token_type || '';

    // Fetch Twitch user info
    const userRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 15000,
    });

    const twitchUser = userRes?.data?.data?.[0];
    if (!twitchUser?.id) throw new Error('Twitch user fetch failed');

    await User.findByIdAndUpdate(
      uid,
      {
        $set: {
          twitch: {
            id: String(twitchUser.id || ''),
            login: String(twitchUser.login || ''),
            displayName: String(twitchUser.display_name || ''),
            connectedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    // Persist tokens encrypted (foundation for real API calls).
    const user = await User.findById(uid);
    if (user) {
      user.oauthTokens = user.oauthTokens || {};
      user.oauthTokens.twitch = {
        payload: encryptJson({
          provider: 'twitch',
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
          token_type: tokenType,
          saved_at: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      };
      await user.save();
    }

    return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}connected=twitch`);
  } catch (err) {
    console.error('Twitch oauth callback error:', err.response?.data || err.message);
    const returnUrl = getFrontendReturnUrl(req);
    return res.redirect(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}oauth_error=${encodeURIComponent('Twitch connect failed')}`);
  }
});

module.exports = router;

