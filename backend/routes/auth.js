const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { createUserEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');
const { sendWelcomeEmail } = require('../services/emailService');
const { connectMongo, getMongoState } = require('../lib/mongoConnection');
const { ensureSeedUsers, findUser, saveUser } = require('../lib/mockUserStore');
const { getJwtSecret } = require('../lib/jwtSecret');

const hasMongoUri = Boolean(process.env.MONGODB_URI || process.env.DATABASE_URL);
let mongoAuthReadyPromise = null;

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
    const { name, email, password, onboarding } = req.body;
    const roleIntent = normalizeRoleIntent(onboarding?.roleIntent);
    const roleOther = sanitizeRoleOther(onboarding?.roleOther);
    const digestOptIn = Boolean(onboarding?.emailPreferences?.digestOptIn);
    const roleTrackUpdates = onboarding?.emailPreferences?.roleTrackUpdates !== false;
    const compliance = onboarding?.compliance && typeof onboarding.compliance === 'object'
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
    const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
    
    // Dispatch user registration event (non-blocking)
    dispatchToOpenClaw(createUserEvent('registered', user, {
      method: 'password',
    }));

    // Send welcome email in non-blocking mode.
    sendWelcomeEmail(user).catch((emailErr) => {
      console.warn('Welcome email failed (non-blocking):', emailErr?.message || emailErr);
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
    res.status(400).json({ ok: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
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

    if (envAdminPassword && adminIdentifierMatch && password === envAdminPassword) {
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
    const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
    
    // Dispatch user login event (non-blocking)
    dispatchToOpenClaw(createUserEvent('authenticated', user, {
      method: 'password',
    }));
    
    res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ ok: true, user });
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
