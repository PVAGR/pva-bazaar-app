const express = require('express');
const router = express.Router();
const Artifact = require('../backend/models/Artifact');
const auth = require('./backend/middleware/auth');

// POST /api/transactions/shares/buy - Buy shares
router.post('/shares/buy', auth, async (req, res) => {
  try {
    const { artifactId, wallet, amountUSD, shares } = req.body || {};
    
    if (!artifactId || !wallet || !shares) {
      return res.status(400).json({
        ok: false,
        message: 'Artifact ID, wallet, and shares are required'
      });
    }

    const artifact = await Artifact.findById(artifactId);
    if (!artifact) {
      return res.status(404).json({
        ok: false,
        message: 'Artifact not found'
      });
    }

    if (!artifact.fractionalization?.enabled) {
      return res.status(400).json({
        ok: false,
        message: 'Shares not enabled for this artifact'
      });
    }

    const current = artifact.fractionalization.soldShares || 0;
    const total = artifact.fractionalization.totalShares || 0;
    
    if (current + shares > total) {
      return res.status(400).json({
        ok: false,
        message: 'Not enough shares available'
      });
    }

    artifact.fractionalization.soldShares = current + shares;
    await artifact.save();

    res.json({
      ok: true,
      message: 'Shares purchased successfully',
      data: {
        artifactId,
        newSoldShares: artifact.fractionalization.soldShares,
        amountUSD: amountUSD || 0,
        buyer: wallet
      }
    });
  } catch (error) {
    console.error('Share purchase error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to purchase shares'
    });
  }
});

// GET /api/transactions/shares/status/:id - Get shares status
router.get('/shares/status/:id', async (req, res) => {
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
      data: {
        enabled: !!artifact.fractionalization?.enabled,
        totalShares: artifact.fractionalization?.totalShares || 0,
        soldShares: artifact.fractionalization?.soldShares || 0,
        sharePrice: artifact.fractionalization?.sharePrice || 0,
        majorityThreshold: artifact.fractionalization?.majorityThreshold || 0
      }
    });
  } catch (error) {
    console.error('Shares status error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to get shares status'
    });
  }
});

module.exports = router;