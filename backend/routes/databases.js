const express = require('express');
const router = express.Router();
const CustomDatabase = require('../models/CustomDatabase');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   GET /api/databases
 * @desc    Get all custom databases for authenticated user
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const databases = await CustomDatabase.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json({ ok: true, items: databases });
  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch databases' });
  }
});

/**
 * @route   GET /api/databases/:id
 * @desc    Get single custom database
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const database = await CustomDatabase.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!database) {
      return res.status(404).json({ ok: false, error: 'Database not found' });
    }
    
    res.json({ ok: true, item: database });
  } catch (error) {
    console.error('Error fetching database:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch database' });
  }
});

/**
 * @route   POST /api/databases
 * @desc    Create new custom database
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, type, isPublic } = req.body;
    
    if (!name) {
      return res.status(400).json({ ok: false, error: 'Database name is required' });
    }
    
    const database = new CustomDatabase({
      userId: req.user.id,
      name,
      description: description || '',
      type: type || 'mixed',
      isPublic: isPublic || false,
    });
    
    await database.save();
    
    res.status(201).json({ ok: true, item: database });
  } catch (error) {
    console.error('Error creating database:', error);
    res.status(500).json({ ok: false, error: 'Failed to create database' });
  }
});

/**
 * @route   PUT /api/databases/:id
 * @desc    Update custom database
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const database = await CustomDatabase.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!database) {
      return res.status(404).json({ ok: false, error: 'Database not found' });
    }
    
    const allowedUpdates = ['name', 'description', 'type', 'isPublic'];
    
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        database[field] = req.body[field];
      }
    });
    
    await database.save();
    
    res.json({ ok: true, item: database });
  } catch (error) {
    console.error('Error updating database:', error);
    res.status(500).json({ ok: false, error: 'Failed to update database' });
  }
});

/**
 * @route   DELETE /api/databases/:id
 * @desc    Delete custom database
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const database = await CustomDatabase.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!database) {
      return res.status(404).json({ ok: false, error: 'Database not found' });
    }
    
    res.json({ ok: true, message: 'Database deleted' });
  } catch (error) {
    console.error('Error deleting database:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete database' });
  }
});

/**
 * @route   POST /api/databases/:id/entries
 * @desc    Add entry to custom database
 * @access  Private
 */
router.post('/:id/entries', authMiddleware, async (req, res) => {
  try {
    const database = await CustomDatabase.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!database) {
      return res.status(404).json({ ok: false, error: 'Database not found' });
    }
    
    const {
      title,
      description,
      url,
      ipfsHash,
      fileType,
      fileSize,
      thumbnailIpfsHash,
      tags,
      metadata,
    } = req.body;
    
    if (!title) {
      return res.status(400).json({ ok: false, error: 'Entry title is required' });
    }
    
    database.entries.push({
      title,
      description,
      url,
      ipfsHash,
      fileType,
      fileSize,
      thumbnailIpfsHash,
      tags: tags || [],
      metadata,
      addedAt: new Date(),
    });
    
    database.updateStats();
    await database.save();
    
    res.status(201).json({ ok: true, item: database });
  } catch (error) {
    console.error('Error adding entry:', error);
    res.status(500).json({ ok: false, error: 'Failed to add entry' });
  }
});

/**
 * @route   DELETE /api/databases/:id/entries/:entryId
 * @desc    Remove entry from custom database
 * @access  Private
 */
router.delete('/:id/entries/:entryId', authMiddleware, async (req, res) => {
  try {
    const database = await CustomDatabase.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!database) {
      return res.status(404).json({ ok: false, error: 'Database not found' });
    }
    
    database.entries = database.entries.filter(
      (entry) => entry._id.toString() !== req.params.entryId
    );
    
    database.updateStats();
    await database.save();
    
    res.json({ ok: true, item: database });
  } catch (error) {
    console.error('Error removing entry:', error);
    res.status(500).json({ ok: false, error: 'Failed to remove entry' });
  }
});

/**
 * @route   GET /api/databases/public/feed
 * @desc    Get public custom databases (community showcase)
 * @access  Public
 */
router.get('/public/feed', async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    
    const databases = await CustomDatabase.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'name profilePicture');
    
    res.json({ ok: true, items: databases });
  } catch (error) {
    console.error('Error fetching public databases:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch public databases' });
  }
});

module.exports = router;
