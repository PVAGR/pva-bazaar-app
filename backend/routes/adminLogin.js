const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const { getJwtSecret, hasConfiguredJwtSecret } = require('../lib/jwtSecret');

function isObjectIdHex(v) {
  return typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
}

function issueAdminToken(userId, jwtSecret) {
  return jwt.sign({ id: String(userId), role: 'admin' }, jwtSecret, { expiresIn: '12h' });
}

function setAdminCookie(res, token) {
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000,
  });
}

function getAdminBootstrapCode() {
  return String(process.env.ADMIN_BOOTSTRAP_CODE || process.env.ADMIN_SECRET_CODE || '').trim();
}

function isAdminSelfSignupEnabled() {
  const raw = String(process.env.ADMIN_SELF_SIGNUP_ENABLED || 'true')
    .trim()
    .toLowerCase();
  return raw !== 'false';
}

async function countAdminUsers() {
  return User.countDocuments({ role: 'admin' });
}

function buildBootstrapStatus(adminCount) {
  const needsBootstrap = adminCount === 0;
  const selfSignupEnabled = isAdminSelfSignupEnabled();
  const configuredBootstrapCode = getAdminBootstrapCode();
  const bootstrapCodeRequired = adminCount > 0 && !selfSignupEnabled;
  const signupAllowed = needsBootstrap || selfSignupEnabled || Boolean(configuredBootstrapCode);
  const adminSecretConfigured = Boolean(String(process.env.ADMIN_SECRET_CODE || '').trim());
  const jwtConfigured = hasConfiguredJwtSecret();
  const githubOAuthEnabled = Boolean(
    String(process.env.ADMIN_GITHUB_CLIENT_ID || '').trim() &&
      String(process.env.ADMIN_GITHUB_CLIENT_SECRET || '').trim() &&
      jwtConfigured,
  );

  return {
    adminCount,
    needsBootstrap,
    selfSignupEnabled,
    signupAllowed,
    bootstrapCodeRequired,
    bootstrapCodeConfigured: Boolean(configuredBootstrapCode),
    adminSecretConfigured,
    jwtConfigured,
    githubOAuthEnabled,
    backupAdminReady:
      (adminSecretConfigured && jwtConfigured) || githubOAuthEnabled || signupAllowed,
  };
}

function normalizeUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '');
}

function getRequestOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
    .split(',')[0]
    .trim();
  const host = req.get('host');
  return `${proto}://${host}`;
}

function getAdminGithubCallbackUrl(req) {
  const configured = normalizeUrl(process.env.ADMIN_GITHUB_CALLBACK_URL || '');
  if (configured) return configured;
  return `${getRequestOrigin(req)}/api/admin/oauth/github/callback`;
}

function getAdminGithubFrontendUrl(req) {
  const configured = normalizeUrl(
    process.env.ADMIN_GITHUB_FRONTEND_URL || process.env.PUBLIC_SITE_URL || '',
  );
  if (configured) {
    return configured.includes('#') ? configured : `${configured}/#/admin`;
  }
  return `${getRequestOrigin(req)}/#/admin`;
}

function parseGithubAllowlist() {
  return String(process.env.ADMIN_GITHUB_ALLOWED_USERS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isGithubIdentityAllowlisted({ githubLogin, githubId, email, allowlist }) {
  if (!Array.isArray(allowlist) || allowlist.length === 0) return false;
  const candidates = [
    String(githubLogin || '')
      .trim()
      .toLowerCase(),
    String(githubId || '')
      .trim()
      .toLowerCase(),
    String(email || '')
      .trim()
      .toLowerCase(),
  ].filter(Boolean);
  return candidates.some((candidate) => allowlist.includes(candidate));
}

function buildFrontendRedirect(frontendUrl, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const delimiter = frontendUrl.includes('?') ? '&' : '?';
  return `${frontendUrl}${query.toString() ? `${delimiter}${query.toString()}` : ''}`;
}

function pickPrimaryGithubEmail({ profileEmail, emails }) {
  const fromList = Array.isArray(emails)
    ? emails.find((entry) => entry?.verified && entry?.primary) ||
      emails.find((entry) => entry?.verified) ||
      emails[0]
    : null;

  const raw = String(fromList?.email || profileEmail || '')
    .trim()
    .toLowerCase();
  return raw || '';
}

async function findUserByGithubIdentity({ email, githubLogin }) {
  if (email) {
    const byEmail = await User.findOne({ email });
    if (byEmail) return byEmail;
  }

  if (githubLogin) {
    const byUsername = await User.findOne({ username: githubLogin });
    if (byUsername) return byUsername;
  }

  return null;
}

// GET /api/admin/bootstrap-status - determines if first-time admin signup is allowed.
router.get('/bootstrap-status', async (_req, res) => {
  try {
    const adminCount = await countAdminUsers();
    return res.json({
      ok: true,
      ...buildBootstrapStatus(adminCount),
    });
  } catch (error) {
    console.error('Admin bootstrap-status error:', error);
    return res.status(500).json({ ok: false, message: 'Failed to load bootstrap status' });
  }
});

// GET /api/admin/oauth/github/status - GitHub OAuth readiness for admin login.
router.get('/oauth/github/status', (req, res) => {
  const required = ['ADMIN_GITHUB_CLIENT_ID', 'ADMIN_GITHUB_CLIENT_SECRET'];
  const missing = required.filter((key) => !String(process.env[key] || '').trim());
  const allowlist = parseGithubAllowlist();

  return res.json({
    ok: true,
    configured: missing.length === 0,
    jwtConfigured: hasConfiguredJwtSecret(),
    missing,
    callbackUrl: getAdminGithubCallbackUrl(req),
    frontendReturnUrl: getAdminGithubFrontendUrl(req),
    allowlistConfigured: allowlist.length > 0,
  });
});

// GET /api/admin/oauth/github/start - Redirect to GitHub OAuth.
router.get('/oauth/github/start', async (req, res) => {
  try {
    const clientId = String(process.env.ADMIN_GITHUB_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.ADMIN_GITHUB_CLIENT_SECRET || '').trim();
    const jwtSecret = getJwtSecret();
    const frontendUrl = getAdminGithubFrontendUrl(req);

    if (!clientId || !clientSecret) {
      return res.redirect(
        buildFrontendRedirect(frontendUrl, {
          oauth_admin_error: 'GitHub admin login is not configured on the server',
        }),
      );
    }

    const state = jwt.sign(
      {
        provider: 'github-admin',
        nonce: crypto.randomBytes(12).toString('hex'),
      },
      jwtSecret,
      { expiresIn: '10m' },
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getAdminGithubCallbackUrl(req),
      scope: 'read:user user:email',
      state,
      allow_signup: 'false',
      prompt: 'select_account',
    });

    return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  } catch (error) {
    const frontendUrl = getAdminGithubFrontendUrl(req);
    return res.redirect(
      buildFrontendRedirect(frontendUrl, {
        oauth_admin_error: error.message || 'GitHub admin login start failed',
      }),
    );
  }
});

// GET /api/admin/oauth/github/callback - Complete GitHub OAuth and issue admin token.
router.get('/oauth/github/callback', async (req, res) => {
  const frontendUrl = getAdminGithubFrontendUrl(req);

  try {
    const clientId = String(process.env.ADMIN_GITHUB_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.ADMIN_GITHUB_CLIENT_SECRET || '').trim();
    const jwtSecret = getJwtSecret();

    if (!clientId || !clientSecret) {
      return res.redirect(
        buildFrontendRedirect(frontendUrl, {
          oauth_admin_error: 'GitHub admin login is not configured on the server',
        }),
      );
    }

    const code = String(req.query.code || '').trim();
    const state = String(req.query.state || '').trim();
    const oauthError = String(req.query.error || '').trim();
    const oauthErrorDescription = String(req.query.error_description || '').trim();

    if (oauthError) {
      const msg = oauthErrorDescription ? `${oauthError}: ${oauthErrorDescription}` : oauthError;
      return res.redirect(buildFrontendRedirect(frontendUrl, { oauth_admin_error: msg }));
    }

    if (!code || !state) {
      return res.redirect(
        buildFrontendRedirect(frontendUrl, {
          oauth_admin_error: 'Missing code/state from GitHub',
        }),
      );
    }

    let decodedState;
    try {
      decodedState = jwt.verify(state, jwtSecret);
    } catch (_err) {
      return res.redirect(
        buildFrontendRedirect(frontendUrl, {
          oauth_admin_error: 'Invalid OAuth state. Please retry.',
        }),
      );
    }

    if (decodedState?.provider !== 'github-admin') {
      return res.redirect(
        buildFrontendRedirect(frontendUrl, {
          oauth_admin_error: 'OAuth provider mismatch',
        }),
      );
    }

    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: getAdminGithubCallbackUrl(req),
      },
      {
        headers: { Accept: 'application/json' },
        timeout: 15000,
      },
    );

    const accessToken = String(tokenResponse?.data?.access_token || '').trim();
    if (!accessToken) {
      return res.redirect(
        buildFrontendRedirect(frontendUrl, {
          oauth_admin_error: 'GitHub token exchange failed',
        }),
      );
    }

    const githubHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'pva-bazaar-admin-oauth',
    };

    const [profileResponse, emailsResponse] = await Promise.all([
      axios.get('https://api.github.com/user', { headers: githubHeaders, timeout: 15000 }),
      axios
        .get('https://api.github.com/user/emails', { headers: githubHeaders, timeout: 15000 })
        .catch(() => ({ data: [] })),
    ]);

    const profile = profileResponse?.data || {};
    const emails = Array.isArray(emailsResponse?.data) ? emailsResponse.data : [];
    const githubLogin = String(profile.login || '').trim();
    const githubId = String(profile.id || '').trim();
    const displayName = String(profile.name || githubLogin || 'GitHub Admin').trim();
    const emailFromGithub = pickPrimaryGithubEmail({
      profileEmail: profile.email,
      emails,
    });
    const derivedEmail =
      emailFromGithub || (githubId ? `github-${githubId}@users.noreply.github.com` : '');

    if (!githubId || !githubLogin) {
      return res.redirect(
        buildFrontendRedirect(frontendUrl, {
          oauth_admin_error: 'GitHub profile data incomplete',
        }),
      );
    }

    const allowlist = parseGithubAllowlist();
    const allowlistConfigured = allowlist.length > 0;
    const allowlisted = isGithubIdentityAllowlisted({
      githubLogin,
      githubId,
      email: derivedEmail,
      allowlist,
    });

    const adminCount = await countAdminUsers();
    let user = await findUserByGithubIdentity({
      email: derivedEmail,
      githubLogin,
    });

    if (allowlistConfigured && !allowlisted) {
      return res.redirect(
        buildFrontendRedirect(frontendUrl, {
          oauth_admin_error: 'GitHub account is not in the admin allowlist',
        }),
      );
    }

    if (!allowlistConfigured && adminCount > 0 && (!user || user.role !== 'admin')) {
      return res.redirect(
        buildFrontendRedirect(frontendUrl, {
          oauth_admin_error: 'GitHub login requires an existing admin account or allowlist entry',
        }),
      );
    }

    if (user && user.role !== 'admin') {
      return res.redirect(
        buildFrontendRedirect(frontendUrl, {
          oauth_admin_error: 'Matched account is not an admin account',
        }),
      );
    }

    if (!user) {
      user = new User({
        name: displayName,
        username: undefined,
        email: derivedEmail,
        password: crypto.randomBytes(24).toString('hex'),
        role: 'admin',
      });
    } else {
      user.name = user.name || displayName;
      user.role = 'admin';
    }

    if (profile.avatar_url && !user.profilePicture) {
      user.profilePicture = String(profile.avatar_url);
    }

    if (!user.username && githubLogin) {
      const usernameTaken = await User.findOne({
        _id: { $ne: user._id },
        username: githubLogin,
      })
        .select('_id')
        .lean();
      if (!usernameTaken) {
        user.username = githubLogin;
      }
    }

    user.oauthTokens = user.oauthTokens || {};
    user.oauthTokens.githubAdminProfile = {
      provider: 'github',
      id: githubId,
      login: githubLogin,
      name: displayName,
      email: derivedEmail || '',
      avatarUrl: String(profile.avatar_url || ''),
      updatedAt: new Date().toISOString(),
    };

    await user.save();

    const token = issueAdminToken(user._id, jwtSecret);
    setAdminCookie(res, token);

    return res.redirect(
      buildFrontendRedirect(frontendUrl, {
        oauth_admin_token: token,
        oauth_provider: 'github',
      }),
    );
  } catch (error) {
    console.error('Admin GitHub OAuth callback error:', error?.response?.data || error.message);
    return res.redirect(
      buildFrontendRedirect(frontendUrl, {
        oauth_admin_error: 'GitHub admin login failed',
      }),
    );
  }
});

// POST /api/admin/signup - create an admin account for first-time setup or controlled bootstrap.
router.post('/signup', async (req, res) => {
  try {
    const jwtSecret = String(process.env.JWT_SECRET || '').trim();
    if (!jwtSecret) {
      return res.status(503).json({ ok: false, message: 'JWT secret not configured on server' });
    }

    const name = String(req.body?.name || '').trim();
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || '').trim();
    const bootstrapCode = String(req.body?.bootstrapCode || '').trim();

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, message: 'Name, email, and password are required' });
    }

    if (String(process.env.ADMIN_SIGNUP_SIMULATE_CAPACITY_ERROR || '').toLowerCase() === 'true') {
      return res.status(503).json({
        ok: false,
        message: 'Admin signup is temporarily unavailable due to backend capacity limits',
        code: 'SIGNUP_CAPACITY_LIMIT',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters' });
    }

    const adminCount = await countAdminUsers();
    const status = buildBootstrapStatus(adminCount);
    if (!status.signupAllowed) {
      return res
        .status(403)
        .json({ ok: false, message: 'Admin signup is disabled. Contact an existing admin.' });
    }

    if (status.bootstrapCodeRequired) {
      const configuredCode = getAdminBootstrapCode();
      if (!configuredCode) {
        return res
          .status(403)
          .json({ ok: false, message: 'Admin bootstrap is locked. Contact an existing admin.' });
      }
      if (!bootstrapCode || bootstrapCode !== configuredCode) {
        return res.status(403).json({ ok: false, message: 'Invalid bootstrap code' });
      }
    }

    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
      return res.status(409).json({ ok: false, message: 'Email already in use' });
    }
    if (username) {
      const existingByUsername = await User.findOne({ username });
      if (existingByUsername) {
        return res.status(409).json({ ok: false, message: 'Username already in use' });
      }
    }

    const user = new User({
      name,
      username: username || undefined,
      email,
      password,
      role: 'admin',
    });
    await user.save();

    const token = issueAdminToken(user._id, jwtSecret);
    setAdminCookie(res, token);

    return res.status(201).json({
      ok: true,
      message: 'Admin account created',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || '',
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Admin signup error:', error);
    return res.status(500).json({ ok: false, message: error.message || 'Signup failed' });
  }
});

// POST /api/admin/login - Secure admin login
router.post('/login', async (req, res) => {
  try {
    const rawIdentifier = req.body?.username || req.body?.email || req.body?.identifier || '';
    const identifier = String(rawIdentifier).trim();
    const password = String(req.body?.password || '').trim();
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ ok: false, message: 'Username/email and password are required' });
    }

    if (!jwtSecret) {
      return res.status(503).json({ ok: false, message: 'JWT secret not configured on server' });
    }

    const identifierLower = identifier.toLowerCase();
    const adminUserLower = String(adminUser || '').toLowerCase();

    const envAdminMatch =
      Boolean(adminUser && adminPass) &&
      (identifier === adminUser || identifierLower === adminUserLower) &&
      password === adminPass;

    if (!envAdminMatch) {
      const user = await User.findOne({
        $or: [{ email: identifierLower }, { username: identifier }],
      });

      if (!user || user.role !== 'admin') {
        return res.status(401).json({ ok: false, message: 'Invalid username or password' });
      }

      const validPassword = await user.comparePassword(password);
      if (!validPassword) {
        return res.status(401).json({ ok: false, message: 'Invalid username or password' });
      }

      const token = issueAdminToken(user._id, jwtSecret);
      setAdminCookie(res, token);
      return res.json({
        ok: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username || '',
          role: user.role,
        },
      });
    }

    // If configured, this is the preferred way to bind "admin login" to a real user identity.
    // This avoids 500s in routes that do User.findById(req.user.id) or store ObjectId userId.
    const adminUserIdFromEnv = process.env.ADMIN_USER_ID;
    let subjectId = isObjectIdHex(adminUserIdFromEnv) ? adminUserIdFromEnv : null;

    // Otherwise, try to find/create an admin user; fall back to a synthetic ID on DB failure.
    if (!subjectId) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@pvabazaar.org';
      try {
        let user = await User.findOne({ email: adminEmail });
        if (!user) {
          const randomPassword = crypto.randomBytes(24).toString('hex');
          user = new User({ name: 'Admin', email: adminEmail, password: randomPassword });
          await user.save();
        }
        subjectId = String(user._id);
      } catch (_dbErr) {
        // DB write may fail (read-only user, cold start, etc); still allow login
        subjectId = '000000000000000000000000';
      }
    }

    // Issue JWT (12h) - in production, prefer HttpOnly cookie
    const token = issueAdminToken(subjectId, jwtSecret);
    setAdminCookie(res, token);

    res.json({ ok: true, message: 'Login successful', token });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ ok: false, message: 'Login failed', error: error.message });
  }
});

module.exports = router;
