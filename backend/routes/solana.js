const express = require('express');
const router = express.Router();
const SolanaPayout = require('../models/SolanaPayout');
const { createSystemEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

// POST /api/solana/ritual
// Records a payout ritual and dispatches an OpenClaw event.
router.post('/ritual', async (req, res) => {
  try {
    const {
      walletAddress,
      amountSol,
      artifactId = '',
      artifactTitle = '',
      ritualId = '',
      metadata = {},
      txSignature = '',
    } = req.body || {};

    const trimmedWallet = String(walletAddress || '').trim();
    const numericAmount = Number(amountSol);

    if (!trimmedWallet) {
      return res.status(400).json({ ok: false, error: 'walletAddress is required' });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ ok: false, error: 'amountSol must be a positive number' });
    }

    const network = process.env.SOLANA_CLUSTER || 'devnet';
    const hasSignature = typeof txSignature === 'string' && txSignature.trim().length > 0;

    const payout = new SolanaPayout({
      walletAddress: trimmedWallet,
      amountSol: numericAmount,
      artifactId: String(artifactId || ''),
      artifactTitle: String(artifactTitle || ''),
      ritualId: String(ritualId || ''),
      network,
      status: hasSignature ? 'confirmed' : 'simulated',
      txSignature: hasSignature ? txSignature.trim() : '',
      metadata: {
        ...metadata,
        origin: 'pva-bazaar-frontend',
      },
    });

    await payout.save();

    // Dispatch non-blocking OpenClaw system event for observability
    const event = createSystemEvent('info', 'Solana payout ritual scheduled (simulated)', {
      payoutId: payout._id.toString(),
      artifactId: payout.artifactId,
      artifactTitle: payout.artifactTitle,
      amountSol: payout.amountSol,
      walletAddress: payout.walletAddress,
      network: payout.network,
      ritualId: payout.ritualId,
    });
    dispatchToOpenClaw(event, console.log).catch(() => {});

    res.status(201).json({
      ok: true,
      payout: {
        id: payout._id.toString(),
        walletAddress: payout.walletAddress,
        amountSol: payout.amountSol,
        network: payout.network,
        status: payout.status,
        txSignature: payout.txSignature,
        artifactId: payout.artifactId,
        artifactTitle: payout.artifactTitle,
        ritualId: payout.ritualId,
        createdAt: payout.createdAt,
      },
    });
  } catch (err) {
    console.error('Solana ritual error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
  }
});

// GET /api/solana/payouts - list payouts (optionally filtered by artifactId)
router.get('/payouts', async (req, res) => {
  try {
    const { artifactId } = req.query;
    const filter = {};
    if (artifactId) {
      filter.artifactId = String(artifactId);
    }

    const docs = await SolanaPayout.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({
      ok: true,
      payouts: docs.map((p) => ({
        id: p._id.toString(),
        walletAddress: p.walletAddress,
        amountSol: p.amountSol,
        network: p.network,
        status: p.status,
        txSignature: p.txSignature,
        artifactId: p.artifactId,
        artifactTitle: p.artifactTitle,
        ritualId: p.ritualId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
  }
});

module.exports = router;

