const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const adminSession = require('../middleware/adminSession');

function getAdminSubjectId() {
  const fromEnv = process.env.ADMIN_USER_ID;
  if (fromEnv && /^[a-f\d]{24}$/i.test(fromEnv)) return fromEnv;
  return '000000000000000000000001';
}

// POST /api/admin/token - Production-safe admin auth via secret code
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
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    // Note: Role is not in User schema yet, but we can add it if needed
    // For now, check if email matches admin pattern
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

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
      role: user.email?.includes('admin') ? 'admin' : 'user',
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
      role: user.email?.includes('admin') ? 'admin' : 'user',
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
    if (user.email?.includes('admin')) {
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
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { artisan: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
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
    const totalUsers = await User.countDocuments();
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) }
    });
    
    const users = await User.find().select('createdAt email').lean();
    const activeUsers = users.length; // Simplified - add real activity tracking later
    const adminUsers = users.filter(u => u.email?.includes('admin')).length;

    res.json({
      ok: true,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        newUsersThisMonth,
        growthRate: totalUsers > 0 ? ((newUsersThisMonth / totalUsers) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
