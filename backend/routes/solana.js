const express = require('express');
const axios = require('axios');
const router = express.Router();
const SolanaPayout = require('../models/SolanaPayout');
const AdminRuntimeConfig = require('../models/AdminRuntimeConfig');
const adminSession = require('../middleware/adminSession');
const { createSystemEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

function getSolanaRpcUrl() {
  if (process.env.SOLANA_RPC_URL) {
    return process.env.SOLANA_RPC_URL;
  }

  const cluster = process.env.SOLANA_CLUSTER || 'devnet';
  if (cluster === 'mainnet-beta') {
    return 'https://api.mainnet-beta.solana.com';
  }
  if (cluster === 'testnet') {
    return 'https://api.testnet.solana.com';
  }
  return 'https://api.devnet.solana.com';
}

function isLikelySolanaAddress(value) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value || '').trim());
}

function getWalletAllowlist() {
  const raw = process.env.SOLANA_TEST_WALLET_ALLOWLIST || '';
  return raw
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function getTestPolicy() {
  return {
    maxUsd: Math.max(parseFloat(process.env.SOLANA_TEST_MAX_USD || '5'), 0.01),
    maxSol: Math.max(parseFloat(process.env.SOLANA_TEST_MAX_SOL || '0.05'), 0.000001),
    requireAllowlist: process.env.SOLANA_TEST_REQUIRE_ALLOWLIST === 'true',
    walletAllowlist: getWalletAllowlist(),
  };
}

async function getEffectiveTestPolicy() {
  const fromEnv = getTestPolicy();
  try {
    const runtime = await AdminRuntimeConfig.findOne({ key: 'default' }).lean();
    const configured = runtime?.payoutPolicy;
    if (!configured) return fromEnv;

    const maxUsd = Math.max(Number(configured.maxUsd ?? fromEnv.maxUsd), 0.01);
    const maxSol = Math.max(Number(configured.maxSol ?? fromEnv.maxSol), 0.000001);
    const minUsd = Math.max(Number(configured.minUsd ?? 0), 0);
    const minSol = Math.max(Number(configured.minSol ?? 0), 0);

    return {
      maxUsd,
      maxSol,
      minUsd,
      minSol,
      requireAllowlist: configured.requireAllowlist === true,
      walletAllowlist: Array.isArray(configured.walletAllowlist)
        ? configured.walletAllowlist.map(v => String(v).trim()).filter(Boolean)
        : fromEnv.walletAllowlist,
      network: String(configured.network || process.env.SOLANA_CLUSTER || 'devnet').trim() || 'devnet',
      treasuryWallet: String(configured.treasuryWallet || '').trim(),
    };
  } catch (_err) {
    return fromEnv;
  }
}

async function fetchSignatureStatus(signature) {
  const rpcUrl = getSolanaRpcUrl();
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignatureStatuses',
    params: [[signature], { searchTransactionHistory: true }],
  };

  const response = await axios.post(rpcUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 12000,
  });

  const status = response?.data?.result?.value?.[0] || null;
  return {
    rpcUrl,
    status,
  };
}

// POST /api/solana/test-payout
// Creates an admin-approved test payout request with strict limits.
router.post('/test-payout', adminSession, async (req, res) => {
  try {
    const {
      walletAddress,
      amountSol,
      amountUsd,
      artifactId = '',
      artifactTitle = '',
      ritualId = '',
      metadata = {},
    } = req.body || {};

    const policy = await getEffectiveTestPolicy();
    const trimmedWallet = String(walletAddress || '').trim();
    const numericAmountSol = Number(amountSol);
    const numericAmountUsd = Number(amountUsd);

    if (!isLikelySolanaAddress(trimmedWallet)) {
      return res.status(400).json({ ok: false, error: 'walletAddress must be a valid Solana address' });
    }
    if (!Number.isFinite(numericAmountSol) || numericAmountSol <= 0) {
      return res.status(400).json({ ok: false, error: 'amountSol must be a positive number' });
    }

    const hasUsd = Number.isFinite(numericAmountUsd) && numericAmountUsd > 0;
    if (hasUsd && Number.isFinite(policy.minUsd) && numericAmountUsd < policy.minUsd) {
      return res.status(400).json({ ok: false, error: `amountUsd is below minimum of ${policy.minUsd}` });
    }
    if (hasUsd && numericAmountUsd > policy.maxUsd) {
      return res.status(400).json({ ok: false, error: `amountUsd exceeds max test limit of ${policy.maxUsd}` });
    }
    if (Number.isFinite(policy.minSol) && numericAmountSol < policy.minSol) {
      return res.status(400).json({ ok: false, error: `amountSol is below minimum of ${policy.minSol}` });
    }
    if (numericAmountSol > policy.maxSol) {
      return res.status(400).json({ ok: false, error: `amountSol exceeds max test limit of ${policy.maxSol}` });
    }

    const inAllowlist = policy.walletAllowlist.length === 0 || policy.walletAllowlist.includes(trimmedWallet);
    if (policy.requireAllowlist && !inAllowlist) {
      return res.status(403).json({ ok: false, error: 'walletAddress is not in SOLANA_TEST_WALLET_ALLOWLIST' });
    }

    const network = policy.network || process.env.SOLANA_CLUSTER || 'devnet';
    const payout = new SolanaPayout({
      walletAddress: trimmedWallet,
      amountSol: numericAmountSol,
      artifactId: String(artifactId || ''),
      artifactTitle: String(artifactTitle || ''),
      ritualId: String(ritualId || ''),
      network,
      status: 'pending',
      txSignature: '',
      metadata: {
        ...metadata,
        isTest: true,
        requestedByAdmin: req.admin?.email || 'unknown-admin',
        amountUsd: hasUsd ? numericAmountUsd : null,
        policySnapshot: {
          minUsd: Number.isFinite(policy.minUsd) ? policy.minUsd : null,
          maxUsd: policy.maxUsd,
          minSol: Number.isFinite(policy.minSol) ? policy.minSol : null,
          maxSol: policy.maxSol,
          requireAllowlist: policy.requireAllowlist,
          allowlistSize: policy.walletAllowlist.length,
          treasuryWallet: policy.treasuryWallet || null,
        },
      },
    });

    await payout.save();

    const event = createSystemEvent('info', 'OpenClaw payout.requested', {
      payoutId: payout._id.toString(),
      walletAddress: payout.walletAddress,
      amountSol: payout.amountSol,
      amountUsd: hasUsd ? numericAmountUsd : null,
      network: payout.network,
      requestedByAdmin: req.admin?.email || 'unknown-admin',
      flow: 'solana-test-payout',
    });
    dispatchToOpenClaw(event, console.log).catch(() => {});

    res.status(201).json({
      ok: true,
      payout: {
        id: payout._id.toString(),
        walletAddress: payout.walletAddress,
        amountSol: payout.amountSol,
        amountUsd: hasUsd ? numericAmountUsd : null,
        network: payout.network,
        status: payout.status,
        createdAt: payout.createdAt,
      },
      nextAction: 'Sign and submit transfer from funded treasury wallet, then call /api/solana/confirm-test-payout',
    });
  } catch (err) {
    console.error('Solana test-payout error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
  }
});

// POST /api/solana/confirm-test-payout
// Confirms an existing test payout using on-chain signature status from Solana RPC.
router.post('/confirm-test-payout', adminSession, async (req, res) => {
  try {
    const { payoutId, txSignature } = req.body || {};
    const trimmedSignature = String(txSignature || '').trim();

    if (!payoutId || !String(payoutId).trim()) {
      return res.status(400).json({ ok: false, error: 'payoutId is required' });
    }
    if (!trimmedSignature) {
      return res.status(400).json({ ok: false, error: 'txSignature is required' });
    }

    const payout = await SolanaPayout.findById(String(payoutId).trim());
    if (!payout) {
      return res.status(404).json({ ok: false, error: 'Payout not found' });
    }

    const isTest = Boolean(payout.metadata && payout.metadata.isTest === true);
    if (!isTest) {
      return res.status(400).json({ ok: false, error: 'Payout is not a test payout' });
    }

    const { rpcUrl, status } = await fetchSignatureStatus(trimmedSignature);
    const confirmation = status?.confirmationStatus || null;
    const rpcError = status?.err || null;
    const confirmed = !rpcError && (confirmation === 'confirmed' || confirmation === 'finalized');

    payout.txSignature = trimmedSignature;
    payout.status = confirmed ? 'confirmed' : (rpcError ? 'failed' : 'pending');
    payout.error = rpcError ? JSON.stringify(rpcError).slice(0, 300) : '';
    payout.metadata = {
      ...(payout.metadata || {}),
      confirmedByAdmin: req.admin?.email || 'unknown-admin',
      rpcConfirmationStatus: confirmation,
      rpcUrl,
      confirmedAt: new Date().toISOString(),
    };

    await payout.save();

    const eventName = confirmed ? 'OpenClaw payout.confirmed' : (rpcError ? 'OpenClaw payout.failed' : 'OpenClaw payout.pending');
    const level = confirmed ? 'info' : (rpcError ? 'error' : 'warning');
    const event = createSystemEvent(level, eventName, {
      payoutId: payout._id.toString(),
      txSignature: payout.txSignature,
      status: payout.status,
      confirmationStatus: confirmation,
      rpcError,
      confirmedByAdmin: req.admin?.email || 'unknown-admin',
      flow: 'solana-test-payout',
    });
    dispatchToOpenClaw(event, console.log).catch(() => {});

    res.json({
      ok: true,
      payout: {
        id: payout._id.toString(),
        walletAddress: payout.walletAddress,
        amountSol: payout.amountSol,
        network: payout.network,
        status: payout.status,
        txSignature: payout.txSignature,
        error: payout.error,
        updatedAt: payout.updatedAt,
      },
      rpc: {
        confirmationStatus: confirmation,
        url: rpcUrl,
      },
    });
  } catch (err) {
    console.error('Solana confirm-test-payout error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
  }
});

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

