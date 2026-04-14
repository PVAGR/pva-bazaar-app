const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/adminOnly');
const User = require('../models/User');

const router = express.Router();

const PUBLIC_FIELDS = [
  '_id',
  'name',
  'societalId',
  'passportStatus',
  'passportIssuedAt',
  'avatarUrl',
  'bio',
  'location',
  'governanceToken',
  'citizenRole',
  'committees',
  'proposalsSubmitted',
  'votesCast',
  'joinedCivilizationAt',
  'pvaReputation',
].join(' ');

const PRIVATE_FIELDS = `${PUBLIC_FIELDS} walletAddress bazBalance email username walletBindingChallenge auditHistory approvalHistory`;

const CLAIMS = new Set([
  'visitor',
  'citizen',
  'committee_member',
  'secretariat',
  'admin',
  'treasury_operator',
  'creator',
]);

function toClaimsForRole(role) {
  const normalized = String(role || 'citizen').toLowerCase();
  const base = ['visitor', 'citizen'];
  if (normalized === 'committee') base.push('committee_member');
  if (normalized === 'secretariat') base.push('committee_member', 'secretariat');
  if (normalized === 'admin') base.push('committee_member', 'secretariat', 'admin', 'treasury_operator');
  return Array.from(new Set(base));
}

function makeCredentialId() {
  const part = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `PVA-CRED-${part}`;
}

function buildDidSubject(societalId = '') {
  if (!societalId) return '';
  return `did:pva:${String(societalId).toLowerCase()}`;
}

function deriveEligibility(userDoc) {
  const claims = Array.isArray(userDoc?.claims) ? userDoc.claims : [];
  const hasVerifiedPassport = String(userDoc?.passportStatus || '') === 'verified';
  const hasGovernanceVoteEligibility = hasVerifiedPassport && Boolean(userDoc?.governanceToken);
  const hasTreasuryAccess = claims.includes('treasury_operator') || claims.includes('admin');
  const hasCommitteeAccess = claims.includes('committee_member') || claims.includes('secretariat') || claims.includes('admin');
  return {
    hasVerifiedPassport,
    hasGovernanceVoteEligibility,
    hasTreasuryAccess,
    hasCommitteeAccess,
  };
}

function pushAuditEvent(userDoc, event, options = {}) {
  const record = {
    event,
    actorId: options.actorId,
    actorRole: options.actorRole || 'system',
    note: options.note || '',
    metadata: options.metadata || {},
    occurredAt: new Date(),
  };

  if (!Array.isArray(userDoc.auditHistory)) userDoc.auditHistory = [];
  if (!Array.isArray(userDoc.approvalHistory)) userDoc.approvalHistory = [];
  userDoc.auditHistory.push(record);
  userDoc.approvalHistory.push(record);
}

function sanitizeProfile(userDoc) {
  if (!userDoc) return null;
  return {
    id: userDoc._id,
    name: userDoc.name,
    societalId: userDoc.societalId || null,
    passportStatus: userDoc.passportStatus,
    passportIssuedAt: userDoc.passportIssuedAt || null,
    avatarUrl: userDoc.avatarUrl || '',
    bio: userDoc.bio || '',
    location: userDoc.location || '',
    governanceToken: Boolean(userDoc.governanceToken),
    citizenRole: userDoc.citizenRole || 'citizen',
    committees: Array.isArray(userDoc.committees) ? userDoc.committees : [],
    proposalsSubmitted: Number(userDoc.proposalsSubmitted || 0),
    votesCast: Number(userDoc.votesCast || 0),
    joinedCivilizationAt: userDoc.joinedCivilizationAt || null,
    pvaReputation: Number(userDoc.pvaReputation || 0),
    verificationStatus: userDoc.verificationStatus || 'none',
    walletBindingStatus: userDoc.walletBindingStatus || 'unbound',
    didSubject: userDoc.didSubject || buildDidSubject(userDoc.societalId),
    credentialId: userDoc.credentialId || '',
    credentialIssuedAt: userDoc.credentialIssuedAt || null,
    credentialVersion: Number(userDoc.credentialVersion || 0),
    claims: Array.isArray(userDoc.claims) ? userDoc.claims : [],
    eligibility: deriveEligibility(userDoc),
  };
}

function sanitizePrivateProfile(userDoc) {
  return {
    ...sanitizeProfile(userDoc),
    email: userDoc.email || '',
    username: userDoc.username || '',
    walletAddress: userDoc.walletAddress || '',
    bazBalance: Number(userDoc.bazBalance || 0),
    walletBindingChallenge: userDoc.walletBindingChallenge || null,
  };
}

router.get('/citizens', async (req, res) => {
  try {
    const role = String(req.query.role || '').trim();
    const q = String(req.query.q || '').trim();

    const query = { passportStatus: 'verified' };
    if (role) query.citizenRole = role;
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { societalId: { $regex: q, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select(PUBLIC_FIELDS)
      .sort({ pvaReputation: -1, createdAt: -1 })
      .limit(250);

    res.json({ ok: true, items: users.map(sanitizeProfile) });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Authenticated full profile for current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(PRIVATE_FIELDS);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    return res.json({
      ok: true,
      item: sanitizePrivateProfile(user),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Update own passport profile fields
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const update = { updatedAt: new Date() };
    const bio = req.body?.bio;
    const location = req.body?.location;
    const avatarUrl = req.body?.avatarUrl;

    if (bio !== undefined) {
      const nextBio = String(bio || '').trim();
      if (nextBio.length > 500) {
        return res.status(400).json({ ok: false, message: 'Bio must be 500 characters or less' });
      }
      update.bio = nextBio;
    }

    if (location !== undefined) update.location = String(location || '').trim().slice(0, 120);
    if (avatarUrl !== undefined) update.avatarUrl = String(avatarUrl || '').trim().slice(0, 500);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true },
    ).select(PRIVATE_FIELDS);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    pushAuditEvent(user, 'passport_profile_updated', {
      actorId: req.user.id,
      actorRole: req.user.role || 'citizen',
      metadata: {
        updated: {
          bio: bio !== undefined,
          location: location !== undefined,
          avatarUrl: avatarUrl !== undefined,
        },
      },
    });
    await user.save();

    return res.json({ ok: true, item: sanitizePrivateProfile(user) });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Request passport verification
router.post('/verify-request', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('passportStatus verificationStatus updatedAt auditHistory approvalHistory');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (user.passportStatus === 'verified') {
      return res.status(400).json({ ok: false, message: 'Passport is already verified' });
    }

    if (user.passportStatus === 'suspended') {
      return res.status(403).json({ ok: false, message: 'Passport is suspended and cannot request verification' });
    }

    user.passportStatus = 'pending';
    user.verificationStatus = 'pending';
    user.updatedAt = new Date();
    pushAuditEvent(user, 'passport_verification_requested', {
      actorId: req.user.id,
      actorRole: req.user.role || 'citizen',
      note: 'Citizen requested verification review.',
    });
    await user.save();

    return res.json({ ok: true, status: user.passportStatus });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin: list pending passport verification requests
router.get('/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ passportStatus: 'pending' })
      .select(PRIVATE_FIELDS)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(500);

    return res.json({
      ok: true,
      items: users.map((user) => ({
        ...sanitizePrivateProfile(user),
      })),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin: approve passport verification
router.post('/approve/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(PRIVATE_FIELDS);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    user.passportStatus = 'verified';
    user.verificationStatus = 'approved';
    user.governanceToken = true;
    if (!user.passportIssuedAt) user.passportIssuedAt = new Date();
    if (!user.societalId) {
      // societalId auto-generation occurs in model pre-save hook
      user.societalId = undefined;
    }
    if (!user.didSubject && user.societalId) {
      user.didSubject = buildDidSubject(user.societalId);
    }
    if (!Array.isArray(user.claims) || user.claims.length === 0) {
      user.claims = toClaimsForRole(user.citizenRole);
    }
    user.updatedAt = new Date();

    pushAuditEvent(user, 'passport_verified', {
      actorId: req.user.id,
      actorRole: req.user.role || 'admin',
      note: 'Passport approved by admin review.',
    });

    await user.save();

    return res.json({
      ok: true,
      item: sanitizePrivateProfile(user),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Authenticated: request wallet-binding challenge
router.post('/challenge/request', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(PRIVATE_FIELDS);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const nonce = crypto.randomBytes(12).toString('hex');
    const message = `PVA Passport Wallet Binding\nSocietal ID: ${user.societalId || 'PENDING'}\nNonce: ${nonce}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.walletBindingStatus = 'challenge_issued';
    user.walletBindingChallenge = {
      nonce,
      message,
      expiresAt,
      requestedAt: new Date(),
      simulated: true,
    };

    pushAuditEvent(user, 'wallet_challenge_requested', {
      actorId: req.user.id,
      actorRole: req.user.role || 'citizen',
      note: 'Wallet binding challenge requested.',
      metadata: { simulated: true },
    });

    await user.save();

    return res.json({
      ok: true,
      challenge: {
        message,
        nonce,
        expiresAt,
        verificationMode: 'simulated/dev',
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Authenticated: submit wallet binding proof (simulated verification rail)
router.post('/challenge/verify', authenticateToken, async (req, res) => {
  try {
    const walletAddress = String(req.body?.walletAddress || '').trim();
    const signature = String(req.body?.signature || '').trim();
    const nonce = String(req.body?.nonce || '').trim();

    if (!walletAddress || !signature || !nonce) {
      return res.status(400).json({ ok: false, message: 'walletAddress, signature, and nonce are required' });
    }

    const user = await User.findById(req.user.id).select(PRIVATE_FIELDS);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const challenge = user.walletBindingChallenge || {};
    if (!challenge.nonce || challenge.nonce !== nonce) {
      user.walletBindingStatus = 'failed';
      await user.save();
      return res.status(400).json({ ok: false, message: 'Challenge nonce mismatch' });
    }

    if (challenge.expiresAt && new Date(challenge.expiresAt).getTime() < Date.now()) {
      user.walletBindingStatus = 'failed';
      await user.save();
      return res.status(400).json({ ok: false, message: 'Challenge expired' });
    }

    // C2 rail: verification intentionally labeled simulated/dev until full cryptographic recovery flow.
    user.walletAddress = walletAddress;
    user.walletBindingStatus = 'bound';
    user.walletBindingChallenge = {
      ...challenge,
      verifiedAt: new Date(),
      simulated: true,
    };

    pushAuditEvent(user, 'wallet_bound', {
      actorId: req.user.id,
      actorRole: req.user.role || 'citizen',
      note: 'Wallet binding proof submitted and recorded (simulated verification mode).',
      metadata: {
        walletAddress,
        signaturePreview: signature.slice(0, 16),
        verificationMode: 'simulated/dev',
      },
    });

    await user.save();

    return res.json({ ok: true, item: sanitizePrivateProfile(user), verificationMode: 'simulated/dev' });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Public verifier panel endpoint
router.get('/verify', async (req, res) => {
  try {
    const societalId = String(req.query.societalId || '').trim();
    const credentialId = String(req.query.credentialId || '').trim();

    if (!societalId && !credentialId) {
      return res.status(400).json({ ok: false, message: 'societalId or credentialId query is required' });
    }

    const query = societalId ? { societalId } : { credentialId };
    const user = await User.findOne(query).select(PRIVATE_FIELDS);
    if (!user) {
      return res.status(404).json({ ok: false, state: 'invalid', message: 'No matching passport credential found' });
    }

    const state =
      user.passportStatus === 'suspended'
        ? 'revoked'
        : user.credentialId
          ? 'valid'
          : user.passportStatus === 'pending'
            ? 'pending'
            : 'invalid';

    return res.json({
      ok: true,
      state,
      verifier: {
        societalId: user.societalId || null,
        credentialId: user.credentialId || null,
        didSubject: user.didSubject || buildDidSubject(user.societalId),
        roleClaims: Array.isArray(user.claims) ? user.claims : [],
        issuedAt: user.credentialIssuedAt || null,
        issuer: user.auditHistory?.filter((item) => item.event === 'credential_issued').slice(-1)[0]?.actorRole || 'system',
        walletBindingState: user.walletBindingStatus || 'unbound',
        passportStatus: user.passportStatus,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Authenticated: fetch audit history (self or admin)
router.get('/audit/:userId', authenticateToken, async (req, res) => {
  try {
    const targetId = String(req.params.userId || '');
    const isSelf = String(req.user.id) === targetId;
    const requester = await User.findById(req.user.id).select('role citizenRole');
    const isAdmin = requester?.role === 'admin' || requester?.citizenRole === 'admin' || requester?.citizenRole === 'secretariat';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ ok: false, message: 'Not authorized to view this audit history' });
    }

    const user = await User.findById(targetId).select('auditHistory approvalHistory societalId name');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    return res.json({
      ok: true,
      item: {
        userId: user._id,
        name: user.name,
        societalId: user.societalId || null,
        auditHistory: Array.isArray(user.auditHistory) ? user.auditHistory : [],
        approvalHistory: Array.isArray(user.approvalHistory) ? user.approvalHistory : [],
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin/secretariat: issue credential record
router.post('/credential/issue/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const target = await User.findById(req.params.userId).select(PRIVATE_FIELDS);
    if (!target) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (!target.societalId) {
      return res.status(400).json({ ok: false, message: 'Societal ID is required before issuing credential' });
    }

    const claims = Array.isArray(req.body?.claims) && req.body.claims.length
      ? req.body.claims.filter((value) => CLAIMS.has(value))
      : toClaimsForRole(target.citizenRole);

    target.didSubject = target.didSubject || buildDidSubject(target.societalId);
    target.credentialId = makeCredentialId();
    target.credentialVersion = Number(target.credentialVersion || 0) + 1;
    target.credentialIssuedAt = new Date();
    target.claims = Array.from(new Set(claims));
    target.verificationStatus = target.passportStatus === 'verified' ? 'approved' : target.verificationStatus;

    pushAuditEvent(target, 'credential_issued', {
      actorId: req.user.id,
      actorRole: req.user.role || 'admin',
      metadata: {
        credentialId: target.credentialId,
        credentialVersion: target.credentialVersion,
        claims: target.claims,
      },
    });

    await target.save();

    return res.json({ ok: true, item: sanitizePrivateProfile(target) });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin/secretariat: refresh existing credential version
router.post('/credential/refresh/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const target = await User.findById(req.params.userId).select(PRIVATE_FIELDS);
    if (!target) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (!target.credentialId) {
      return res.status(400).json({ ok: false, message: 'Credential has not been issued yet' });
    }

    target.credentialVersion = Number(target.credentialVersion || 0) + 1;
    target.credentialIssuedAt = new Date();

    pushAuditEvent(target, 'credential_refreshed', {
      actorId: req.user.id,
      actorRole: req.user.role || 'admin',
      metadata: {
        credentialId: target.credentialId,
        credentialVersion: target.credentialVersion,
      },
    });

    await target.save();
    return res.json({ ok: true, item: sanitizePrivateProfile(target) });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Admin/secretariat: assign/revoke claims
router.post('/claims/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const target = await User.findById(req.params.userId).select(PRIVATE_FIELDS);
    if (!target) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const assign = Array.isArray(req.body?.assign) ? req.body.assign.filter((c) => CLAIMS.has(c)) : [];
    const revoke = Array.isArray(req.body?.revoke) ? req.body.revoke.filter((c) => CLAIMS.has(c)) : [];
    const current = new Set(Array.isArray(target.claims) ? target.claims : []);

    assign.forEach((claim) => current.add(claim));
    revoke.forEach((claim) => current.delete(claim));
    if (!current.size) current.add('visitor');

    target.claims = Array.from(current);

    pushAuditEvent(target, 'claims_updated', {
      actorId: req.user.id,
      actorRole: req.user.role || 'admin',
      metadata: {
        assign,
        revoke,
        resultingClaims: target.claims,
      },
    });

    await target.save();
    return res.json({ ok: true, item: sanitizePrivateProfile(target) });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Public passport profile for any user
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(PUBLIC_FIELDS);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'Passport profile not found' });
    }

    return res.json({ ok: true, item: sanitizeProfile(user) });
  } catch (err) {
    return res.status(400).json({ ok: false, message: 'Invalid user id' });
  }
});

module.exports = router;
