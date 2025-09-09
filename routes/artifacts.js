const express = require('express');
const router = express.Router();
const Artifact = require('../backend/models/Artifact'); // Fixed path - capital A
const auth = require('../backend/middleware/auth');

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
    const { name, title, description, imageUrl, price, category, materials, artisan } = req.body;
    const artifact = new Artifact({
      name,
      title,
      description,
      imageUrl,
      price,
      category,
      materials,
      artisan,
      creator: req.user.id,
      physicalSerial: `PVA-${Date.now()}` // Auto-generate serial
    });
    await artifact.save();
    res.status(201).json({ ok: true, artifact });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

module.exports = router;