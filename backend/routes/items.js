// backend/routes/items.js
const express = require('express');
const router = express.Router();
const Artifact = require('../models/Artifact');
const User = require('../models/User');
const { sendConsignmentEmail, sendAdminNotification } = require('../service/emailService');
const { normalizeItemInput, toPublicItem } = require('../lib/itemNormalize');
const { encodeCursor, decodeCursor } = require('../lib/cursor');
const { authMiddleware } = require('../middleware/auth');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createArtifactEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

function hasAdminAccess(req) {
  const adminCode = req.headers['x-admin-code'];
  if (adminCode && adminCode === process.env.ADMIN_SECRET_CODE) {
    return true;
  }

  const cookieToken = req.cookies && req.cookies.admin_token;
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
      if (decoded && decoded.role === 'admin') return true;
    } catch (_) {
    }
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (bearerToken) {
    try {
      const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
      if (decoded && decoded.role === 'admin') return true;
    } catch (_) {
    }
  }

  return false;
}

// GET /api/items
router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 12, 50));
    const { cursor, category, tag, q, sort = 'new', includeDrafts } = req.query;
    const isAdmin = hasAdminAccess(req);
    const filter = {};
    if (!isAdmin || includeDrafts !== 'true') {
      filter.status = 'published';
    }
    if (category) filter.category = String(category);
    if (tag) filter.tags = tag;
    // Search
    if (q) {
      filter.$text = { $search: q };
    }
    // Cursor-based pagination
    let cursorQuery = {};
    if (cursor) {
      const c = decodeCursor(cursor);
      if (c && c.createdAt && c.id) {
        if (sort === 'new') {
          cursorQuery = {
            $or: [
              { createdAt: { $lt: new Date(c.createdAt) } },
              { createdAt: new Date(c.createdAt), _id: { $lt: mongoose.Types.ObjectId(c.id) } },
            ],
          };
        } else {
          cursorQuery = {
            $or: [
              { createdAt: { $gt: new Date(c.createdAt) } },
              { createdAt: new Date(c.createdAt), _id: { $gt: mongoose.Types.ObjectId(c.id) } },
            ],
          };
        }
      }
    }
    const sortOrder = sort === 'old' ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };
    const query = Artifact.find({ ...filter, ...cursorQuery })
      .sort(sortOrder)
      .limit(limit + 1);
    const docs = await query.exec();
    const items = docs.slice(0, limit).map(toPublicItem);
    let nextCursor = null;
    if (docs.length > limit) {
      const last = docs[limit - 1];
      nextCursor = encodeCursor({ createdAt: last.createdAt, id: last._id });
    }
    res.json({ ok: true, items, nextCursor });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/items/:slugOrId
router.get('/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const isAdmin = hasAdminAccess(req);
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      doc = await Artifact.findById(slugOrId);
    }
    if (!doc) {
      doc = await Artifact.findOne({ slug: slugOrId });
    }
    if (!doc || (!isAdmin && doc.status !== 'published')) {
      return res.status(404).json({ ok: false, error: 'Item not found' });
    }
    res.json({ ok: true, item: toPublicItem(doc) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/items/register - User-facing item registration
// Requires authentication via JWT token
router.post('/register', authMiddleware, async (req, res) => {
  try {
    const { title, name, description, price, category, condition, materials, images, imageUrls, brand, measurements } = req.body;

    // Validation
    if (!title && !name) {
      return res.status(400).json({ ok: false, error: 'Title or name is required' });
    }
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'Description is required' });
    }
    if (!price || isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ ok: false, error: 'Valid price greater than 0 is required' });
    }
    if (!category || category.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'Category is required' });
    }

    // Sanitize inputs (basic XSS prevention)
    const sanitize = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    };

    // Guard rails for payload size/shape to avoid hitting body limits with inline images.
    const submittedImages = Array.isArray(imageUrls) ? imageUrls : (Array.isArray(images) ? images : []);
    if (submittedImages.length > 6) {
      return res.status(400).json({ ok: false, error: 'Maximum 6 images allowed' });
    }
    if (submittedImages.some(img => typeof img === 'string' && img.length > 350000)) {
      return res.status(400).json({ ok: false, error: 'One or more images are too large. Please upload smaller files.' });
    }

    const user = await User.findById(req.user.id).select('name email');

    // Prepare artifact data
    const artifactData = {
      name: sanitize(name || title),
      title: sanitize(title || name),
      description: sanitize(description),
      price: Number(price),
      category: sanitize(category),
      imageUrls: submittedImages,
      materials: Array.isArray(materials) ? materials : [],
      artisan: sanitize(brand || user?.name || 'User'),
      creator: req.user.id, // Set creator from authenticated user
      status: 'draft', // Start as draft, admin approves before publishing
      tags: condition ? [condition] : [],
    };

    // Add optional fields if provided
    if (measurements) {
      artifactData.description += `\n\nMeasurements: ${sanitize(measurements)}`;
    }

    // Initialize consignment status
    artifactData.consignment = {
      artisanShare: 50,
      pvaFee: 35,
      promoterShare: 15,
      agreed: false,
    };

    // Create artifact
    const artifact = new Artifact(artifactData);
    await artifact.save();

    // Send confirmation email to user (non-blocking)
    try {
      if (user && user.email) {
        // Send confirmation to user
        await sendConsignmentEmail({
          to: user.email,
          subject: 'Item Registration Confirmation',
          itemData: artifact,
          status: 'pending_review',
        });

        // Send admin notification (optional, won't fail if it errors)
        try {
          await sendAdminNotification({
            itemData: artifact,
            userEmail: user.email,
          });
        } catch (adminEmailErr) {
          console.warn('Admin notification email failed (non-critical):', adminEmailErr.message);
        }
      }
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
      // Don't fail the request if email fails - email is a nice-to-have, not critical
    }

    res.status(201).json({
      ok: true,
      item: toPublicItem(artifact),
      message: 'Item registered successfully. It will be reviewed before publishing.',
    });
  } catch (err) {
    console.error('Item registration error:', err);
    
    // Handle duplicate key errors (e.g., duplicate slug)
    if (err.code === 11000) {
      return res.status(400).json({
        ok: false,
        error: 'An item with this name already exists. Please use a different title.',
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ ok: false, error: `Validation error: ${errors}` });
    }

    res.status(500).json({
      ok: false,
      error: 'Failed to register item',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// POST /api/items (admin only)
router.post('/', async (req, res) => {
  const isAdmin = hasAdminAccess(req);
  if (!isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const input = normalizeItemInput(req.body);
    const artifact = new Artifact(input);
    await artifact.save();

    dispatchToOpenClaw(createArtifactEvent('created', artifact, null, {
      route: 'items',
      actor: 'admin',
    }));

    res.status(201).json({ ok: true, item: toPublicItem(artifact) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// PUT /api/items/:id (admin only)
router.put('/:id', async (req, res) => {
  const isAdmin = hasAdminAccess(req);
  if (!isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const { id } = req.params;
    const input = normalizeItemInput(req.body);
    const artifact = await Artifact.findByIdAndUpdate(id, input, { new: true });
    if (!artifact) return res.status(404).json({ ok: false, error: 'Item not found' });

    dispatchToOpenClaw(createArtifactEvent('updated', artifact, null, {
      route: 'items',
      actor: 'admin',
    }));

    res.json({ ok: true, item: toPublicItem(artifact) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// DELETE /api/items/:id (admin only)
router.delete('/:id', async (req, res) => {
  const isAdmin = hasAdminAccess(req);
  if (!isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const { id } = req.params;
    const artifact = await Artifact.findByIdAndDelete(id);
    if (!artifact) return res.status(404).json({ ok: false, error: 'Item not found' });

    dispatchToOpenClaw(createArtifactEvent('deleted', artifact, null, {
      route: 'items',
      actor: 'admin',
    }));

    res.json({ ok: true, item: toPublicItem(artifact) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
