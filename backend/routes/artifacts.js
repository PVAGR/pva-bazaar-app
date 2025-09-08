const express = require('express');
const router = express.Router();
const Artifact = require('../models/artifact');
const auth = require('../middleware/auth');

// Get all artifacts
router.get('/', async (req, res) => {
  try {
    const artifacts = await Artifact.find().populate('creator', 'name email');
    res.json({ ok: true, artifacts });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Get artifact by ID
router.get('/:id', async (req, res) => {
  try {
    const artifact = await Artifact.findById(req.params.id).populate('creator', 'name email');
    if (!artifact) {
      return res.status(404).json({ ok: false, message: 'Artifact not found' });
    }
    res.json({ ok: true, artifact });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Create new artifact (requires authentication)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, imageUrl, price, category } = req.body;
    const artifact = new Artifact({
      title,
      description,
      imageUrl,
      price,
      category,
      creator: req.user.id
    });
    await artifact.save();
    res.status(201).json({ ok: true, artifact });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// Update artifact (requires authentication)
router.put('/:id', auth, async (req, res) => {
  try {
    const artifact = await Artifact.findById(req.params.id);
    if (!artifact) {
      return res.status(404).json({ ok: false, message: 'Artifact not found' });
    }
    
    // Check if user is the creator
    if (artifact.creator.toString() !== req.user.id) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }
    
    const { title, description, imageUrl, price, category } = req.body;
    artifact.title = title || artifact.title;
    artifact.description = description || artifact.description;
    artifact.imageUrl = imageUrl || artifact.imageUrl;
    artifact.price = price || artifact.price;
    artifact.category = category || artifact.category;
    artifact.updatedAt = Date.now();
    
    await artifact.save();
    res.json({ ok: true, artifact });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// Delete artifact (requires authentication)
router.delete('/:id', auth, async (req, res) => {
  try {
    const artifact = await Artifact.findById(req.params.id);
    if (!artifact) {
      return res.status(404).json({ ok: false, message: 'Artifact not found' });
    }
    
    // Check if user is the creator
    if (artifact.creator.toString() !== req.user.id) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }
    
    // Fixed: .remove() is deprecated, use deleteOne() instead
    await Artifact.deleteOne({ _id: req.params.id });
    res.json({ ok: true, message: 'Artifact deleted' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;