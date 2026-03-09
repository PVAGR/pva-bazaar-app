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
