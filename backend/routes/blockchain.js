const express = require('express');
const router = express.Router();
const { verifyOnChain } = require('../utils/blockchain');

// GET /api/blockchain/verify - Verify on blockchain
router.get('/verify', async (req, res) => {
  try {
    const { contract, tokenId } = req.query;
    
    if (!contract || !tokenId) {
      return res.status(400).json({
        ok: false,
        message: 'Contract address and token ID are required'
      });
    }

    const data = await verifyOnChain(contract, tokenId);
    
    res.json({
      ok: true,
      message: 'Blockchain verification successful',
      data: data
    });
  } catch (error) {
    console.error('Blockchain verification error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to verify on blockchain',
      error: error.message
    });
  }
});

// GET /api/blockchain/health - Blockchain health check
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    message: 'Blockchain service is operational',
    network: 'base',
    rpc: !!process.env.ETHEREUM_RPC_URL
  });
});

module.exports = router;