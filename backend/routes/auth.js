const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailService');
const { connectMongo, getMongoState } = require('../lib/mongoConnection');
const { ensureSeedUsers, findUser, saveUser } = require('../lib/mockUserStore');
const { getJwtSecret, hasConfiguredJwtSecret } = require('../lib/jwtSecret');

const hasMongoUri = Boolean(process.env.MONGODB_URI || process.env.DATABASE_URL);
let mongoAuthReadyPromise = null;

function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

// Production must fail closed when the signing secret would fall back to a
// public dev value. Signing/verifying with a known value would let anyone
// forge user/admin sessions.
function secretRequired(res) {
  if (process.env.NODE_ENV === 'production' && !hasConfiguredJwtSecret()) {
    return res.status(503).json({ ok: false, message: 'Authentication is not configured on the server (JWT secret missing)' });
  }
  return null;
}

function isMongoQuotaLikeError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('space quota') ||
    message.includes('writes are blocked') ||
    message.includes('limit=storage') ||
    message.includes('free up storage') ||
    message.includes('quota')
  );
}

async function issueFallbackToken(identifier, password, res) {
  await ensureSeedUsers();
  const identifierLower = String(identifier || '').trim().toLowerCase();
  const user = await findUser({
    $or: [
      { email: identifierLower },
      { email: identifier },
      { username: identifier },
      { _id: identifier },
    ],
  });
  if (!user) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }
  const valid = await user.comparePassword(password);
  if (!valid) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { id: user._id, role: user.role, authStore: 'file' },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: '7d' },
  );
  return res.json({
    ok: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}

async function ensureMongoAuthReady() {
  if (!hasMongoUri) return null;
  if (!mongoAuthReadyPromise) {
    mongoAuthReadyPromise = connectMongo({ logger: console, allowMemoryFallback: false });
  }

  await mongoAuthReadyPromise;
  const state = getMongoState();
  if (state.mode !== 'mongo') {
    const error = new Error(state.lastError || 'MongoDB authentication store is unavailable');
    error.status = 503;
    throw error;
  }

  return state;
}

const ROLE_INTENT_TO_APP_ROLE = {
  seller: 'seller',
  consumer: 'consumer',
  creator_artist: 'creator',
  collector: 'collector',
  researcher: 'researcher',
  federation_contributor: 'contributor',
  other: 'other',
};

function normalizeRoleIntent(rawRoleIntent) {
  const value = String(rawRoleIntent || '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ROLE_INTENT_TO_APP_ROLE, value)) {
    return value;
  }
  return 'consumer';
}

function sanitizeRoleOther(rawRoleOther) {
  return String(rawRoleOther || '').trim().slice(0, 120);
}

function cleanText(value, maxLen = 200) {
  return String(value || '').trim().slice(0, maxLen);
}

// Register
router.post('/register', async (req, res) => {
  try {
    if (secretRequired(res)) return;

    const { name } = req.body;
    // Email is canonicalized to lowercase so Mongo uniqueness is case-insensitive
    // and login/registration always resolve to the same account.
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const onboarding = req.body?.onboarding && typeof req.body.onboarding === 'object' ? req.body.onboarding : {};
    const roleIntent = normalizeRoleIntent(onboarding.roleIntent);
    const roleOther = sanitizeRoleOther(onboarding.roleOther);
    const digestOptIn = Boolean(onboarding.emailPreferences?.digestOptIn);
    const roleTrackUpdates = onboarding.emailPreferences?.roleTrackUpdates !== false;
    const compliance = onboarding.compliance && typeof onboarding.compliance === 'object'
      ? {
        legalFullName: cleanText(onboarding.compliance.legalFullName, 150),
        legalIdType: cleanText(onboarding.compliance.legalIdType, 80),
        legalIdNumber: cleanText(onboarding.compliance.legalIdNumber, 120),
        addressLine1: cleanText(onboarding.compliance.addressLine1, 180),
        addressLine2: cleanText(onboarding.compliance.addressLine2, 180),
        city: cleanText(onboarding.compliance.city, 120),
        stateProvince: cleanText(onboarding.compliance.stateProvince, 120),
        postalCode: cleanText(onboarding.compliance.postalCode, 40),
        country: cleanText(onboarding.compliance.country, 120),
        phone: cleanText(onboarding.compliance.phone, 40),
        identityAttested: Boolean(onboarding.compliance.identityAttested),
      }
      : null;

    // Check if user already exists
    const useMongoStore = hasMongoUri;
    if (useMongoStore) {
      await ensureMongoAuthReady();
    } else {
      await ensureSeedUsers();
    }

    const existingUser = useMongoStore
      ? await User.findOne({ email })
      : await findUser({ email });
    if (existingUser) {
      return res.status(400).json({ ok: false, message: 'User already exists' });
    }

    const userData = {
      name,
      email,
      password,
      onboardingProfile: {
        roleIntent,
        roleOther,
        appRole: ROLE_INTENT_TO_APP_ROLE[roleIntent] || 'consumer',
        compliance: compliance ? {
          ...compliance,
          identityAttestedAt: compliance.identityAttested ? new Date() : undefined,
          submittedAt: compliance.identityAttested ? new Date() : undefined,
        } : undefined,
        emailPreferences: {
          digestOptIn,
          roleTrackUpdates,
        },
      },
    };

    const user = useMongoStore ? await new User(userData).save() : await saveUser(userData);
    const token = jwt.sign(
      { id: user._id, role: user.role, authStore: useMongoStore ? 'mongo' : 'file' },
      getJwtSecret(),
      { algorithm: 'HS256', expiresIn: '7d' },
    );
    
    // Send welcome email in non-blocking mode.
    sendWelcomeEmail(user).catch((emailErr) => {
      console.warn('[auth] sendWelcomeEmail failed (non-blocking):', emailErr?.message || emailErr);
    });
    
    res
      .status(201)
      .json({
        ok: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          onboardingProfile: {
            roleIntent: user.onboardingProfile?.roleIntent || 'consumer',
            appRole: user.onboardingProfile?.appRole || 'consumer',
          },
        },
      });
  } catch (error) {
    if (hasMongoUri && isMongoQuotaLikeError(error)) {
      try {
        const { name, email, password } = req.body || {};
        return await issueFallbackToken(email || name || '', password || '', res);
      } catch (fallbackError) {
        return res.status(500).json({ ok: false, message: fallbackError.message || error.message });
      }
    }
    res.status(400).json({ ok: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    if (secretRequired(res)) return;

    const rawIdentifier = req.body?.email || req.body?.username || '';
    const identifier = String(rawIdentifier).trim();
    const password = String(req.body?.password || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: 'Email/username and password are required' });
    }

    const identifierLower = identifier.toLowerCase();
    const useMongoStore = hasMongoUri;
    if (useMongoStore) {
      await ensureMongoAuthReady();
    } else {
      await ensureSeedUsers();
    }

    let user = useMongoStore
      ? await User.findOne({
          $or: [
            { email: identifierLower },
            { email: identifier },
            { username: identifier },
          ],
        })
      : await findUser({
          $or: [
            { email: identifierLower },
            { email: identifier },
            { username: identifier },
          ],
        });

    // Optional emergency admin bootstrap from env vars.
    // This keeps production recoverable if the admin user record is missing.
    const envAdminUsername = String(process.env.ADMIN_USERNAME || '').trim();
    const envAdminPassword = String(process.env.ADMIN_PASSWORD || '').trim();
    const envAdminEmail = String(process.env.ADMIN_EMAIL || 'admin@pvabazaar.org').trim().toLowerCase();
    const envAdminUsernameLower = envAdminUsername.toLowerCase();
    const adminIdentifierMatch = Boolean(envAdminUsername) && (
      identifier === envAdminUsername ||
      identifierLower === envAdminUsernameLower ||
      identifierLower === envAdminEmail
    );

    let envAdminAuthenticated = false;

    if (envAdminPassword && adminIdentifierMatch && constantTimeEqual(password, envAdminPassword)) {
      user = useMongoStore
        ? await User.findOne({
            $or: [
              { username: envAdminUsername },
              { email: envAdminEmail },
              { email: envAdminUsernameLower },
            ],
          })
        : await findUser({
            $or: [
              { username: envAdminUsername },
              { email: envAdminEmail },
              { email: envAdminUsernameLower },
            ],
          });

      if (!user) {
        const adminData = {
          name: 'PVA Admin',
          username: envAdminUsername,
          email: envAdminEmail || envAdminUsernameLower,
          password: envAdminPassword,
          role: 'admin',
        };
        user = useMongoStore ? new User(adminData) : await saveUser(adminData);
      } else {
        if (!user.username) user.username = envAdminUsername;
        // Keep env-admin login deterministic: refresh password from env when override path is used.
        user.password = envAdminPassword;
        user.role = 'admin';
      }

      if (useMongoStore) {
        await user.save();
      } else {
        await saveUser(user);
      }
      envAdminAuthenticated = true;
    }

    if (!user) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    if (!envAdminAuthenticated && !(await user.comparePassword(password))) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, authStore: useMongoStore ? 'mongo' : 'file' },
      getJwtSecret(),
      { algorithm: 'HS256', expiresIn: '7d' },
    );
    
    res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    if (hasMongoUri && isMongoQuotaLikeError(error)) {
      try {
        return await issueFallbackToken(
          req.body?.email || req.body?.username || '',
          req.body?.password || '',
          res,
        );
      } catch (fallbackError) {
        return res.status(500).json({ ok: false, message: fallbackError.message || error.message });
      }
    }
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const id = String(req.user?.id || req.user?._id || '');
    let user = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).select('-password');
    } else if (req.user) {
      // File/legacy store user: the middleware already resolved it.
      user = req.user;
    }

    if (!user) {
      return res.status(401).json({ ok: false, message: 'User not found' });
    }

    const safeUser = user.toObject ? user.toObject() : user;
    const rest = { ...safeUser };
    delete rest.password;
    // Expose a stable string id for both Mongo and legacy store users.
    rest.id = rest.id || String(rest._id || '');
    res.json({ ok: true, user: rest });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Auth diagnostic endpoint (no secrets exposed)
router.get('/diagnostic', async (_req, res) => {
  try {
    const { getMongoState } = require('../lib/mongoConnection');
    const mongoState = getMongoState();
    const authStoreMode = mongoState.mode === 'mock' ? 'mock' : 'mongo';
    const mongoConnected = mongoState.connected;
    // We removed the Vercel force mock logic, so it's always false now
    const mockAuthForcedByVercel = false;
    const loginWouldUseMongo = mongoState.mode !== 'mock';

    res.json({
      ok: true,
      authStoreMode,
      mongoConnected,
      mockAuthForcedByVercel,
      loginWouldUseMongo,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
