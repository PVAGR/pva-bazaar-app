const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const adminSession = require('../middleware/adminSession');
const AdminRuntimeConfig = require('../models/AdminRuntimeConfig');
const Order = require('../models/Order');
const { createSystemEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');
const { getBuildInfo } = require('../lib/buildInfo');
const { getRpcDiagnostics } = require('../utils/blockchain');

const ALLOWED_USER_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'name', 'email', 'username', 'role']);

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAdminSubjectId() {
  const fromEnv = process.env.ADMIN_USER_ID;
  if (fromEnv && /^[a-f\d]{24}$/i.test(fromEnv)) return fromEnv;
  return '000000000000000000000001';
}

// GET /api/admin/panel-report - lightweight, public readiness snapshot for the Archive Admin Panel shell.
router.get('/panel-report', async (_req, res) => {
  try {
    const build = getBuildInfo();
    const rpc = await getRpcDiagnostics({ timeoutMs: 3000 });

    const report = {
      ok: true,
      app: {
        name: 'Archive Admin Panel',
        mode: process.env.NODE_ENV || 'development',
        cloudOnlyMode: process.env.CLOUD_ONLY_MODE !== 'false',
        legacyMode: process.env.LEGACY_MODE === 'true',
      },
      build: {
        shortSha: build.shortSha,
        sha: build.sha,
        version: build.version,
      },
      decentralized: {
        rpcConfigured: rpc.configured,
        rpcReachable: rpc.reachable,
        chainId: rpc.chainId,
        blockNumber: rpc.blockNumber,
        latencyMs: rpc.latencyMs,
        rpcError: rpc.error,
      },
      integrations: {
        openclawBridgeConfigured: Boolean(
          process.env.OPENCLAW_WEBHOOK_URL || process.env.OPENCLAW_GATEWAY_URL
        ),
        cloudinaryConfigured: Boolean(
          process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        ),
        ipfsConfigured: Boolean(
          process.env.PINATA_API_KEY || process.env.WEB3_STORAGE_TOKEN || process.env.IPFS_NODE_URL
        ),
        adminSelfSignupEnabled: String(process.env.ADMIN_SELF_SIGNUP_ENABLED || 'true').trim().toLowerCase() !== 'false',
        bootstrapCodeConfigured: Boolean(
          process.env.ADMIN_BOOTSTRAP_CODE || process.env.ADMIN_SECRET_CODE
        ),
      },
      links: {
        adminUi: 'https://pvabazaar.org/#/admin',
        adminOrdersUi: 'https://pvabazaar.org/#/admin/orders',
        apiHealth: '/api/health',
        decentralizedReport: '/api/decentralized/report',
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(report);
  } catch (error) {
    console.error('Admin panel-report error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/admin/token - Production-safe admin authenticateToken via secret code
router.post('/token', (req, res) => {
  const { secret } = req.body;
  
  if (!secret) {
    return res.status(400).json({ ok: false, message: 'Secret required' });
  }
  
  // Compare with environment variable (set in Vercel/production)
  const adminSecret = process.env.ADMIN_SECRET_CODE;
  
  if (!adminSecret) {
    return res.status(503).json({ 
      ok: false, 
      message: 'Admin authentication not configured on server' 
    });
  }
  
  // Constant-time comparison to prevent timing attacks
  const secretsMatch = secret.length === adminSecret.length && 
    Buffer.compare(Buffer.from(secret), Buffer.from(adminSecret)) === 0;
  
  if (!secretsMatch) {
    return res.status(401).json({ ok: false, message: 'Invalid secret' });
  }
  
  // Generate JWT with 12-hour expiration
  const token = jwt.sign(
    { id: getAdminSubjectId(), role: 'admin' }, 
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
  
  res.json({ ok: true, token });
});

// POST /api/admin/token-refresh - Refresh authenticated admin token
router.post('/token-refresh', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ ok: false, message: 'JWT secret is not configured' });
    }

    const token = jwt.sign(
      { id: getAdminSubjectId(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({ ok: true, token, refreshed: true, mode: 'development' });
  }

  return auth(req, res, (err) => {
    if (err) return next(err);
    return adminOnly(req, res, () => {
      if (!process.env.JWT_SECRET) {
        return res.status(503).json({ ok: false, message: 'JWT secret is not configured' });
      }

      const token = jwt.sign(
        { id: req.user?.id || getAdminSubjectId(), role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
      );

      return res.json({ ok: true, token, refreshed: true });
    });
  });
});

// GET /api/admin/status - Check if user is authenticated admin
router.get('/status', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.json({ ok: true, status: 'admin-ok-dev', user: { id: 'dev', role: 'admin' }, timestamp: new Date().toISOString() });
  }
  return auth(req, res, (err) => {
    if (err) return next(err);
    return adminOnly(req, res, () => {
      res.json({ ok: true, status: 'admin-ok', user: req.user, timestamp: new Date().toISOString() });
    });
  });
});

// GET /api/admin/secure-status - Check admin session via cookie
router.get('/secure-status', adminSession, (req, res) => {
  res.json({ ok: true, status: 'admin-ok', user: req.admin, timestamp: new Date().toISOString() });
});

function buildDigest(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function sanitizeRuntimeConfig(doc) {
  if (!doc) return null;
  return {
    key: doc.key,
    openclaw: {
      gatewayUrl: doc.openclaw?.gatewayUrl || '',
      webhookUrl: doc.openclaw?.webhookUrl || '',
      healthUrl: doc.openclaw?.healthUrl || '',
      ollamaBaseUrl: doc.openclaw?.ollamaBaseUrl || '',
      ollamaModel: doc.openclaw?.ollamaModel || '',
      apiKeySet: Boolean(doc.openclaw?.apiKey),
      bridgeSecretSet: Boolean(doc.openclaw?.bridgeSecret),
      autonomousEnabled: doc.openclaw?.autonomousEnabled !== false,
      autonomousBountyScanMinutes: doc.openclaw?.autonomousBountyScanMinutes || 30,
      autonomousKeepaliveMinutes: doc.openclaw?.autonomousKeepaliveMinutes || 10,
      autonomousMoneyRunEnabled: doc.openclaw?.autonomousMoneyRunEnabled === true,
      workerName: doc.openclaw?.workerName || 'openclaw-queue-dispatcher',
      workerPollMs: doc.openclaw?.workerPollMs || 10000,
      workerBatchSize: doc.openclaw?.workerBatchSize || 15,
    },
    payoutPolicy: {
      minUsd: doc.payoutPolicy?.minUsd ?? 5,
      maxUsd: doc.payoutPolicy?.maxUsd ?? 50000,
      minSol: doc.payoutPolicy?.minSol ?? 0.001,
      maxSol: doc.payoutPolicy?.maxSol ?? 50,
      requireAllowlist: Boolean(doc.payoutPolicy?.requireAllowlist),
      walletAllowlist: Array.isArray(doc.payoutPolicy?.walletAllowlist)
        ? doc.payoutPolicy.walletAllowlist
        : [],
      network: doc.payoutPolicy?.network || 'devnet',
      treasuryWallet: doc.payoutPolicy?.treasuryWallet || '',
      notes: doc.payoutPolicy?.notes || '',
    },
    auditTrail: Array.isArray(doc.auditTrail) ? doc.auditTrail.slice(-20) : [],
    updatedAt: doc.updatedAt || null,
    createdAt: doc.createdAt || null,
  };
}

async function getOrCreateRuntimeConfig() {
  let doc = await AdminRuntimeConfig.findOne({ key: 'default' });
  if (!doc) {
    doc = await AdminRuntimeConfig.create({ key: 'default' });
  }
  return doc;
}

router.get('/runtime-config', adminSession, async (req, res) => {
  try {
    const doc = await getOrCreateRuntimeConfig();
    return res.json({ ok: true, config: sanitizeRuntimeConfig(doc) });
  } catch (error) {
    console.error('Admin runtime-config GET error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/runtime-config/openclaw', adminSession, async (req, res) => {
  try {
    const doc = await getOrCreateRuntimeConfig();
    const body = req.body || {};
    const nextOpenclaw = {
      ...doc.openclaw?.toObject?.(),
      gatewayUrl: String(body.gatewayUrl || '').trim(),
      webhookUrl: String(body.webhookUrl || '').trim(),
      healthUrl: String(body.healthUrl || '').trim(),
      ollamaBaseUrl: String(body.ollamaBaseUrl || '').trim(),
      ollamaModel: String(body.ollamaModel || '').trim(),
      autonomousEnabled: body.autonomousEnabled !== false,
      autonomousBountyScanMinutes: Math.min(Math.max(parseInt(body.autonomousBountyScanMinutes ?? '30', 10), 5), 1440),
      autonomousKeepaliveMinutes: Math.min(Math.max(parseInt(body.autonomousKeepaliveMinutes ?? '10', 10), 1), 240),
      autonomousMoneyRunEnabled: body.autonomousMoneyRunEnabled === true,
      workerName: String(body.workerName || 'openclaw-queue-dispatcher').trim() || 'openclaw-queue-dispatcher',
      workerPollMs: Math.max(parseInt(body.workerPollMs || '10000', 10), 2000),
      workerBatchSize: Math.min(Math.max(parseInt(body.workerBatchSize || '15', 10), 1), 100),
      apiKey: typeof body.apiKey === 'string' ? body.apiKey.trim() : (doc.openclaw?.apiKey || ''),
      bridgeSecret: typeof body.bridgeSecret === 'string' ? body.bridgeSecret.trim() : (doc.openclaw?.bridgeSecret || ''),
    };

    doc.openclaw = nextOpenclaw;
    const digest = buildDigest({ openclaw: { ...nextOpenclaw, apiKey: Boolean(nextOpenclaw.apiKey), bridgeSecret: Boolean(nextOpenclaw.bridgeSecret) } });
    doc.auditTrail.push({
      at: new Date(),
      actor: req.admin?.email || req.admin?.id || 'unknown-admin',
      action: 'openclaw-config-update',
      digest,
    });
    await doc.save();

    // Apply runtime overrides immediately for this process.
    process.env.OPENCLAW_GATEWAY_URL = nextOpenclaw.gatewayUrl || '';
    process.env.OPENCLAW_WEBHOOK_URL = nextOpenclaw.webhookUrl || '';
    process.env.OPENCLAW_HEALTH_URL = nextOpenclaw.healthUrl || '';
    process.env.OPENCLAW_OLLAMA_BASE_URL = nextOpenclaw.ollamaBaseUrl || '';
    process.env.OLLAMA_BASE_URL = nextOpenclaw.ollamaBaseUrl || '';
    process.env.OPENCLAW_OLLAMA_MODEL = nextOpenclaw.ollamaModel || '';
    process.env.OLLAMA_MODEL = nextOpenclaw.ollamaModel || '';
    process.env.OPENCLAW_API_KEY = nextOpenclaw.apiKey || '';
    process.env.OPENCLAW_BRIDGE_SECRET = nextOpenclaw.bridgeSecret || '';
    process.env.OPENCLAW_AUTONOMOUS_ENABLED = nextOpenclaw.autonomousEnabled ? 'true' : 'false';
    process.env.OPENCLAW_AUTONOMOUS_BOUNTY_SCAN_MINUTES = String(nextOpenclaw.autonomousBountyScanMinutes || 30);
    process.env.OPENCLAW_AUTONOMOUS_KEEPALIVE_MINUTES = String(nextOpenclaw.autonomousKeepaliveMinutes || 10);
    process.env.OPENCLAW_AUTONOMOUS_MONEY_RUN_ENABLED = nextOpenclaw.autonomousMoneyRunEnabled ? 'true' : 'false';
    process.env.OPENCLAW_WORKER_NAME = nextOpenclaw.workerName || 'openclaw-queue-dispatcher';
    process.env.OPENCLAW_WORKER_POLL_MS = String(nextOpenclaw.workerPollMs || 10000);
    process.env.OPENCLAW_WORKER_BATCH_SIZE = String(nextOpenclaw.workerBatchSize || 15);

    const event = createSystemEvent('info', 'OpenClaw config updated in admin runtime-config', {
      actor: req.admin?.email || req.admin?.id || 'unknown-admin',
      digest,
      workerName: nextOpenclaw.workerName,
      workerPollMs: nextOpenclaw.workerPollMs,
      workerBatchSize: nextOpenclaw.workerBatchSize,
      ollamaConfigured: Boolean(nextOpenclaw.ollamaBaseUrl),
      ollamaModel: nextOpenclaw.ollamaModel || null,
      autonomousEnabled: nextOpenclaw.autonomousEnabled,
      autonomousBountyScanMinutes: nextOpenclaw.autonomousBountyScanMinutes,
      autonomousKeepaliveMinutes: nextOpenclaw.autonomousKeepaliveMinutes,
      autonomousMoneyRunEnabled: nextOpenclaw.autonomousMoneyRunEnabled,
    });
    dispatchToOpenClaw(event, console.log).catch(() => {});

    return res.json({ ok: true, config: sanitizeRuntimeConfig(doc) });
  } catch (error) {
    console.error('Admin runtime-config openclaw PUT error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/runtime-config/payout-policy', adminSession, async (req, res) => {
  try {
    const doc = await getOrCreateRuntimeConfig();
    const body = req.body || {};
    const wallets = Array.isArray(body.walletAllowlist)
      ? body.walletAllowlist.map(v => String(v || '').trim()).filter(Boolean)
      : [];

    const minUsd = Math.max(parseFloat(body.minUsd ?? 5), 0.01);
    const maxUsd = Math.max(parseFloat(body.maxUsd ?? 50000), minUsd);
    const minSol = Math.max(parseFloat(body.minSol ?? 0.001), 0.000001);
    const maxSol = Math.max(parseFloat(body.maxSol ?? 50), minSol);

    doc.payoutPolicy = {
      minUsd,
      maxUsd,
      minSol,
      maxSol,
      requireAllowlist: body.requireAllowlist === true,
      walletAllowlist: wallets,
      network: String(body.network || 'devnet').trim() || 'devnet',
      treasuryWallet: String(body.treasuryWallet || '').trim(),
      notes: String(body.notes || '').trim(),
    };

    const digest = buildDigest({ payoutPolicy: doc.payoutPolicy });
    doc.auditTrail.push({
      at: new Date(),
      actor: req.admin?.email || req.admin?.id || 'unknown-admin',
      action: 'payout-policy-update',
      digest,
    });
    await doc.save();

    // Apply compatible runtime overrides immediately for this process.
    process.env.SOLANA_TEST_MAX_USD = String(maxUsd);
    process.env.SOLANA_TEST_MAX_SOL = String(maxSol);
    process.env.SOLANA_CLUSTER = doc.payoutPolicy.network || process.env.SOLANA_CLUSTER || 'devnet';
    process.env.SOLANA_TEST_REQUIRE_ALLOWLIST = doc.payoutPolicy.requireAllowlist ? 'true' : 'false';
    process.env.SOLANA_TEST_WALLET_ALLOWLIST = (doc.payoutPolicy.walletAllowlist || []).join(',');

    const event = createSystemEvent('info', 'OpenClaw payout policy updated in admin runtime-config', {
      actor: req.admin?.email || req.admin?.id || 'unknown-admin',
      digest,
      minUsd,
      maxUsd,
      minSol,
      maxSol,
      allowlistSize: wallets.length,
    });
    dispatchToOpenClaw(event, console.log).catch(() => {});

    return res.json({ ok: true, config: sanitizeRuntimeConfig(doc) });
  } catch (error) {
    console.error('Admin runtime-config payout-policy PUT error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ========================================
// USER MANAGEMENT ENDPOINTS
// ========================================

const User = require('../models/User');

/**
 * GET /api/admin/users
 * Fetch all users with pagination and filtering
 */
router.get('/users', adminSession, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      role = '', 
      sortBy = 'createdAt', 
      order = 'desc' 
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (search) {
      const searchSafe = escapeRegExp(String(search).slice(0, 100));
      filter.$or = [
        { name: { $regex: searchSafe, $options: 'i' } },
        { email: { $regex: searchSafe, $options: 'i' } },
        { username: { $regex: searchSafe, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;
    const safeSortBy = ALLOWED_USER_SORT_FIELDS.has(sortBy) ? sortBy : 'createdAt';
    const sortOptions = { [safeSortBy]: sortOrder };

    // Fetch users (exclude password)
    const users = await User.find(filter)
      .select('-password -oauthTokens')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Add computed fields
    const enrichedUsers = users.map(user => ({
      ...user,
      role: user.role || 'user',
      status: 'active' // Add status logic later if needed
    }));

    res.json({
      ok: true,
      users: enrichedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/admin/users/:id
 * Get detailed user information
 */
router.get('/users/:id', adminSession, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -oauthTokens')
      .lean();

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Add computed fields
    const enrichedUser = {
      ...user,
      role: user.role || 'user',
      status: 'active'
    };

    res.json({ ok: true, user: enrichedUser });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user information
 */
router.put('/users/:id', adminSession, async (req, res) => {
  try {
    const { name, email, username, profilePicture } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (username !== undefined) updates.username = username;
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
    updates.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -oauthTokens');

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    res.json({ ok: true, user, message: 'User updated successfully' });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user account
 */
router.delete('/users/:id', adminSession, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return res.status(403).json({ ok: false, error: 'Cannot delete admin users' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ ok: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
// ========================================
// ARTIFACT MANAGEMENT ENDPOINTS
// ========================================

const Artifact = require('../models/Artifact');

/**
 * GET /api/admin/artifacts
 * List all artifacts (admin only)
 */
router.get('/artifacts', adminSession, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = '' } = req.query;
    const filter = {};
    if (search) {
      const searchSafe = escapeRegExp(String(search).slice(0, 100));
      filter.$or = [
        { name: { $regex: searchSafe, $options: 'i' } },
        { title: { $regex: searchSafe, $options: 'i' } },
        { artisan: { $regex: searchSafe, $options: 'i' } },
        { category: { $regex: searchSafe, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [artifacts, total] = await Promise.all([
      Artifact.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Artifact.countDocuments(filter),
    ]);
    res.json({ ok: true, artifacts, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Admin list artifacts error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/admin/artifacts
 * Create a new artifact (JSON body, imageUrls as array)
 */
router.post('/artifacts', adminSession, async (req, res) => {
  try {
    const adminSubjectId = getAdminSubjectId();
    const {
      name, title, description, price, salePrice,
      category, artisan, status = 'published',
      imageUrls = [], materials = [],
      stockQty = 0, isUnlimited = false,
      tags = [],
    } = req.body;
    if (!name || !title || !description || !price || !category || !artisan) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: name, title, description, price, category, artisan' });
    }
    const artifact = new Artifact({
      name, title, description,
      price: Number(price),
      salePrice: salePrice ? Number(salePrice) : undefined,
      category, artisan, status,
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [imageUrls].filter(Boolean),
      materials: Array.isArray(materials) ? materials : [materials].filter(Boolean),
      stockQty: Number(stockQty),
      isUnlimited,
      tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
      creator: adminSubjectId,
      physicalSerial: `PVA-ADM-${Date.now()}`,
    });
    await artifact.save();
    res.status(201).json({ ok: true, artifact });
  } catch (error) {
    console.error('Admin create artifact error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PUT /api/admin/artifacts/:id
 * Update an artifact
 */
router.put('/artifacts/:id', adminSession, async (req, res) => {
  try {
    const allowed = [
      'name', 'title', 'description', 'price', 'salePrice',
      'category', 'artisan', 'status', 'imageUrls', 'materials',
      'stockQty', 'isUnlimited', 'tags',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updatedAt = new Date();
    const artifact = await Artifact.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    if (!artifact) return res.status(404).json({ ok: false, error: 'Artifact not found' });
    res.json({ ok: true, artifact });
  } catch (error) {
    console.error('Admin update artifact error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/artifacts/:id
 * Permanently delete an artifact
 */
router.delete('/artifacts/:id', adminSession, async (req, res) => {
  try {
    const artifact = await Artifact.findByIdAndDelete(req.params.id);
    if (!artifact) return res.status(404).json({ ok: false, error: 'Artifact not found' });
    res.json({ ok: true, message: 'Artifact deleted', id: req.params.id });
  } catch (error) {
    console.error('Admin delete artifact error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 */
router.get('/stats', adminSession, async (req, res) => {
  try {
    const [
      totalUsers,
      newUsersThisMonth,
      adminUsers,
      totalArtifacts,
      publishedArtifacts,
      draftArtifacts,
      totalOrders,
      paidOrders,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setDate(1)) } }),
      User.countDocuments({ role: 'admin' }),
      Artifact.countDocuments(),
      Artifact.countDocuments({ status: 'published' }),
      Artifact.countDocuments({ status: 'draft' }),
      Order.countDocuments(),
      Order.countDocuments({ paymentStatus: 'paid' }),
    ]);

    // Active = registered in the last 30 days (proxy for activity until event tracking is built)
    const activeUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    res.json({
      ok: true,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        newUsersThisMonth,
        growthRate: totalUsers > 0 ? ((newUsersThisMonth / totalUsers) * 100).toFixed(1) : 0,
        totalArtifacts,
        publishedArtifacts,
        draftArtifacts,
        totalOrders,
        paidOrders,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/admin/cloud-storage
 * Summary of configured cloud storage providers for the dashboard widget.
 */
router.get('/cloud-storage', adminSession, async (req, res) => {
  try {
    const providers = [
      {
        name: 'Cloudinary',
        key: 'cloudinary',
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
        status: (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) ? 'connected' : 'disconnected',
      },
      {
        name: 'Pinata IPFS',
        key: 'pinata',
        configured: !!(process.env.PINATA_API_KEY && process.env.PINATA_API_SECRET),
        status: process.env.PINATA_API_KEY ? 'connected' : 'disconnected',
      },
      {
        name: 'AWS S3',
        key: 'aws',
        configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_BUCKET_NAME),
        status: process.env.AWS_BUCKET_NAME ? 'connected' : 'disconnected',
      },
    ];

    const configuredCount = providers.filter(p => p.configured).length;

    res.json({
      ok: true,
      files: 0,       // live file counts require per-provider API calls; use CloudStorageTab for detail
      totalSize: 0,
      configuredProviders: configuredCount,
      providers,
    });
  } catch (error) {
    console.error('Admin cloud-storage error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/admin/transactions/recent
 * Admin-only recent transaction feed for dashboard and transactions tab.
 */
router.get('/transactions/recent', adminSession, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 25, 100));

    const orders = await Order.find({})
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .select('_id itemSnapshot amountTotal currency createdAt paymentStatus customerEmail customerName buyerId attribution.creatorId')
      .lean();

    const items = orders.map((order) => ({
      id: String(order._id),
      type: order.attribution?.creatorId ? 'sale' : 'order',
      title: order.itemSnapshot?.name || 'Order',
      amountCents: Number(order.amountTotal || 0),
      amount: Number(order.amountTotal || 0) / 100,
      currency: order.currency || 'USD',
      paymentStatus: order.paymentStatus || 'pending',
      user: order.customerName || order.customerEmail || 'Unknown',
      userEmail: order.customerEmail || '',
      date: order.createdAt,
      time: order.createdAt,
      buyerId: order.buyerId ? String(order.buyerId) : null,
      sellerId: order.attribution?.creatorId ? String(order.attribution.creatorId) : null,
    }));

    return res.json({ ok: true, items });
  } catch (error) {
    console.error('Admin recent transactions error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
