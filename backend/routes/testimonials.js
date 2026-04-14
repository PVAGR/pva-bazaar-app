// backend/routes/testimonials.js - Seller testimonials and case studies
const express = require('express');
const Testimonial = require('../models/Testimonial');

const router = express.Router();

/**
 * Middleware: Require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * POST /api/testimonials - Create testimonial
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { shopId, authorName, title, text, rating, orderId, productId, category } = req.body;

    if (!shopId || !authorName || !text) {
      return res.status(400).json({ error: 'shopId, authorName, text required' });
    }

    const Shop = require('../models/Shop');
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const testimonial = new Testimonial({
      sellerId: shop.userId,
      shopId,
      authorId: req.user._id,
      authorName,
      title,
      text,
      rating: rating || 5,
      orderId,
      productId,
      category: category || 'general',
      verified: req.body.verified || false,
      consentGiven: true,
    });

    await testimonial.save();
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/testimonials/shop/:shopId - Get shop testimonials
 */
router.get('/shop/:shopId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const testimonials = await Testimonial.find({
      shopId: req.params.shopId,
      published: true,
      approved: true,
    })
      .sort({ featured: -1, pinnedOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name avatar');

    const total = await Testimonial.countDocuments({
      shopId: req.params.shopId,
      published: true,
      approved: true,
    });

    res.json({
      testimonials,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/testimonials/:testimonialId - Update testimonial (owner only)
 */
router.put('/:testimonialId', requireAuth, async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.testimonialId);
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    if (testimonial.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    Object.assign(testimonial, req.body);
    await testimonial.save();

    res.json(testimonial);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/testimonials/:testimonialId - Delete testimonial
 */
router.delete('/:testimonialId', requireAuth, async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.testimonialId);
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    if (testimonial.authorId?.toString() !== req.user._id.toString() && testimonial.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Testimonial.deleteOne({ _id: req.params.testimonialId });
    res.json({ message: 'Testimonial deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/testimonials/seller/me - My testimonials (authenticated seller)
 */
router.get('/seller/me', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const testimonials = await Testimonial.find({
      sellerId: req.user._id,
    })
      .sort({ featured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Testimonial.countDocuments({ sellerId: req.user._id });

    res.json({
      testimonials,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
