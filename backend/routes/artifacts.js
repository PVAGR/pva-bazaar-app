const express = require('express');
const router = express.Router();
const Artifact = require('../models/Artifact');
const auth = require('../middleware/auth');

// GET /api/artifacts - Get all artifacts
router.get('/', async (req, res) => {
  try {
    const artifacts = await Artifact.find().sort({ createdAt: -1 });
    res.json({
      ok: true,
      data: artifacts,
      count: artifacts.length
    });
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch artifacts'
    });
  }
});

// GET /api/artifacts/:id - Get single artifact
router.get('/:id', async (req, res) => {
  try {
    const artifact = await Artifact.findById(req.params.id);
    if (!artifact) {
      return res.status(404).json({
        ok: false,
        message: 'Artifact not found'
      });
    }
    res.json({
      ok: true,
      data: artifact
    });
  } catch (error) {
    console.error('Error fetching artifact:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch artifact'
    });
  }
});

// POST /api/artifacts - Create new artifact (admin only)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        ok: false,
        message: 'Admin access required'
      });
    }

    const artifact = new Artifact(req.body);
    await artifact.save();
    
    res.status(201).json({
      ok: true,
      message: 'Artifact created successfully',
      data: artifact
    });
  } catch (error) {
    console.error('Error creating artifact:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to create artifact'
    });
  }
});

// PUT /api/artifacts/:id - Update artifact (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        ok: false,
        message: 'Admin access required'
      });
    }

    const artifact = await Artifact.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!artifact) {
      return res.status(404).json({
        ok: false,
        message: 'Artifact not found'
      });
    }

    res.json({
      ok: true,
      message: 'Artifact updated successfully',
      data: artifact
    });
  } catch (error) {
    console.error('Error updating artifact:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to update artifact'
    });
  }
});

// DELETE /api/artifacts/:id - Delete artifact (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        ok: false,
        message: 'Admin access required'
      });
    }

    const artifact = await Artifact.findByIdAndDelete(req.params.id);
    if (!artifact) {
      return res.status(404).json({
        ok: false,
        message: 'Artifact not found'
      });
    }

    res.json({
      ok: true,
      message: 'Artifact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting artifact:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to delete artifact'
    });
  }
});

module.exports = router;