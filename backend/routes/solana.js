const express = require('express');
const axios = require('axios');
const router = express.Router();
const SolanaPayout = require('../models/SolanaPayout');
const AdminRuntimeConfig = require('../models/AdminRuntimeConfig');
const adminSession = require('../middleware/adminSession');
const { createSystemEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

function getSolanaRpcUrl(preferredNetwork) {
  const network = String(preferredNetwork || process.env.SOLANA_CLUSTER || 'devnet').trim() || 'devnet';
  const hasExplicitNetwork = typeof preferredNetwork === 'string' && preferredNetwork.trim().length > 0;

  if (network === 'mainnet-beta' && process.env.SOLANA_RPC_URL_MAINNET) {
    return process.env.SOLANA_RPC_URL_MAINNET;
  }
  if (network === 'testnet' && process.env.SOLANA_RPC_URL_TESTNET) {
    return process.env.SOLANA_RPC_URL_TESTNET;
  }
  if (network === 'devnet' && process.env.SOLANA_RPC_URL_DEVNET) {
    return process.env.SOLANA_RPC_URL_DEVNET;
  }

  // Legacy fallback only when no explicit runtime network was requested.
  // This prevents a stale generic env var from pinning the app to devnet
  // after the operator switches the payout policy to mainnet/testnet.
  if (!hasExplicitNetwork && process.env.SOLANA_RPC_URL) {
    return process.env.SOLANA_RPC_URL;
  }

  if (network === 'mainnet-beta') {
    return 'https://api.mainnet-beta.solana.com';
  }
  if (network === 'testnet') {
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
    minUsd: Math.max(parseFloat(process.env.SOLANA_TEST_MIN_USD || '5'), 0.01),
    maxUsd: Math.max(parseFloat(process.env.SOLANA_TEST_MAX_USD || '50000'), 0.01),
    minSol: Math.max(parseFloat(process.env.SOLANA_TEST_MIN_SOL || '0.001'), 0.000001),
    maxSol: Math.max(parseFloat(process.env.SOLANA_TEST_MAX_SOL || '50'), 0.000001),
    requireAllowlist: process.env.SOLANA_TEST_REQUIRE_ALLOWLIST === 'true',
    walletAllowlist: getWalletAllowlist(),
    network: String(process.env.SOLANA_CLUSTER || 'devnet').trim() || 'devnet',
    treasuryWallet: String(process.env.SOLANA_TREASURY_WALLET || '').trim(),
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
    const minUsd = Math.max(Number(configured.minUsd ?? fromEnv.minUsd), 0.01);
    const minSol = Math.max(Number(configured.minSol ?? fromEnv.minSol), 0.000001);

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
  const policy = await getEffectiveTestPolicy();
  const network = policy.network || process.env.SOLANA_CLUSTER || 'devnet';
  const rpcUrl = getSolanaRpcUrl(network);
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

function isRetryableSendError(err) {
  const text = String(err?.message || '').toLowerCase();
  return text.includes('blockhash not found')
    || text.includes('node is behind')
    || text.includes('timed out')
    || text.includes('429')
    || text.includes('too many requests');
}

async function sendSolTransferWithRetry({ connection, keypair, recipientAddress, lamports, maxAttempts = 2 }) {
  const { Transaction, SystemProgram, PublicKey } = require('@solana/web3.js');
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: keypair.publicKey,
      }).add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: new PublicKey(recipientAddress),
          lamports,
        })
      );
      tx.sign(keypair);
      const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      return { signature, attempts: attempt };
    } catch (err) {
      lastErr = err;
      if (attempt >= maxAttempts || !isRetryableSendError(err)) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
  }

  throw lastErr || new Error('Failed to send transfer');
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
    dispatchToOpenClaw(event, console.log).catch(err => console.warn('[Solana] Operation failed:', err?.message || err));

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
    dispatchToOpenClaw(event, console.log).catch(err => console.warn('[Solana] Operation failed:', err?.message || err));

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
    dispatchToOpenClaw(event, console.log).catch(err => console.warn('[Solana] Operation failed:', err?.message || err));

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

// ---------------------------------------------------------------------------
// Hot-wallet helpers – private key stays in env, never in DB or responses
// ---------------------------------------------------------------------------

function parseHotWalletKeypair() {
  const raw = (process.env.SOLANA_HOT_WALLET_PRIVATE_KEY || '').trim();
  if (!raw) {
    const err = new Error('SOLANA_HOT_WALLET_PRIVATE_KEY is not set. Add it to Vercel environment variables.');
    err.notConfigured = true;
    throw err;
  }
  const { Keypair } = require('@solana/web3.js');
  // Support Phantom JSON-array export: [1,2,...,64]
  if (raw.startsWith('[')) {
    const bytes = JSON.parse(raw);
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  }
  // Support base58-encoded 64-byte secret key
  const bs58 = require('bs58');
  return Keypair.fromSecretKey(bs58.decode(raw));
}

// GET /api/solana/hot-wallet-balance
// Returns public key + SOL balance of the configured server hot wallet.
router.get('/hot-wallet-balance', adminSession, async (req, res) => {
  try {
    const { Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
    const policy = await getEffectiveTestPolicy();
    const network = policy.network || process.env.SOLANA_CLUSTER || 'devnet';
    const keypair = parseHotWalletKeypair();
    const rpcUrl = getSolanaRpcUrl(network);
    const connection = new Connection(rpcUrl, 'confirmed');
    const balanceLamports = await connection.getBalance(keypair.publicKey);
    res.json({
      ok: true,
      publicKey: keypair.publicKey.toBase58(),
      balanceSol: balanceLamports / LAMPORTS_PER_SOL,
      balanceLamports,
      network,
      rpcUrl,
    });
  } catch (err) {
    res.status(err.notConfigured ? 400 : 500).json({
      ok: false,
      error: err.message || 'Failed to fetch hot wallet balance',
      notConfigured: Boolean(err.notConfigured),
    });
  }
});

// GET /api/solana/direct-transfer-readiness
// Returns a practical readiness report for one-click direct transfers.
router.get('/direct-transfer-readiness', adminSession, async (req, res) => {
  const checks = [];
  const notes = [];

  const policy = await getEffectiveTestPolicy();
  const network = policy.network || process.env.SOLANA_CLUSTER || 'devnet';
  const rpcUrl = getSolanaRpcUrl(network);

  const policyRangeOk = Number.isFinite(policy.minSol)
    && Number.isFinite(policy.maxSol)
    && Number.isFinite(policy.minUsd)
    && Number.isFinite(policy.maxUsd)
    && policy.minSol >= 0
    && policy.maxSol > 0
    && policy.minUsd >= 0
    && policy.maxUsd > 0
    && policy.minSol <= policy.maxSol
    && policy.minUsd <= policy.maxUsd;

  checks.push({
    key: 'policyRange',
    ok: policyRangeOk,
    label: 'Payout policy range is valid',
    detail: `USD ${policy.minUsd} - ${policy.maxUsd}; SOL ${policy.minSol} - ${policy.maxSol}`,
  });

  const allowlistReady = !policy.requireAllowlist || policy.walletAllowlist.length > 0;
  checks.push({
    key: 'allowlistReady',
    ok: allowlistReady,
    label: 'Allowlist settings are usable',
    detail: policy.requireAllowlist
      ? `Require allowlist is ON (${policy.walletAllowlist.length} entries)`
      : 'Require allowlist is OFF',
  });

  let hotWalletPublicKey = null;
  let balanceLamports = 0;

  try {
    const { Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
    const keypair = parseHotWalletKeypair();
    hotWalletPublicKey = keypair.publicKey.toBase58();

    checks.push({
      key: 'hotWalletKey',
      ok: true,
      label: 'Server hot wallet private key is configured',
      detail: hotWalletPublicKey,
    });

    const connection = new Connection(rpcUrl, 'confirmed');
    balanceLamports = await connection.getBalance(keypair.publicKey);
    const hasBalance = balanceLamports > 0;

    checks.push({
      key: 'hotWalletBalance',
      ok: hasBalance,
      label: 'Hot wallet has spendable SOL',
      detail: `${balanceLamports / LAMPORTS_PER_SOL} SOL`,
    });

    const latest = await connection.getLatestBlockhash('confirmed');
    checks.push({
      key: 'rpcReachable',
      ok: Boolean(latest?.blockhash),
      label: 'Solana RPC is reachable',
      detail: latest?.blockhash || rpcUrl,
    });
  } catch (err) {
    const notConfigured = Boolean(err?.notConfigured);
    checks.push({
      key: 'hotWalletKey',
      ok: false,
      label: 'Server hot wallet private key is configured',
      detail: notConfigured ? 'SOLANA_HOT_WALLET_PRIVATE_KEY is missing' : (err.message || 'Invalid key configuration'),
    });

    checks.push({
      key: 'rpcReachable',
      ok: false,
      label: 'Solana RPC is reachable',
      detail: notConfigured ? 'Skipped until hot wallet is configured' : (err.message || rpcUrl),
    });
  }

  const ready = checks.every((check) => check.ok === true);

  if (!ready) {
    notes.push('Complete failed checks before using one-click direct transfer.');
  }
  if (network !== 'devnet') {
    notes.push('You are not on devnet. Ensure real funds and policy are intentional before sending.');
  }

  return res.json({
    ok: true,
    ready,
    network,
    rpcUrl,
    policy: {
      minUsd: policy.minUsd,
      maxUsd: policy.maxUsd,
      minSol: policy.minSol,
      maxSol: policy.maxSol,
      requireAllowlist: policy.requireAllowlist,
      allowlistSize: policy.walletAllowlist.length,
    },
    hotWallet: {
      publicKey: hotWalletPublicKey,
      balanceLamports,
      balanceSol: balanceLamports / 1000000000,
    },
    checks,
    notes,
  });
});

// POST /api/solana/devnet-airdrop-hot-wallet
// Requests devnet airdrop directly to the configured hot wallet for quick testing.
router.post('/devnet-airdrop-hot-wallet', adminSession, async (req, res) => {
  try {
    const policy = await getEffectiveTestPolicy();
    const network = policy.network || process.env.SOLANA_CLUSTER || 'devnet';
    if (network !== 'devnet') {
      return res.status(400).json({
        ok: false,
        error: 'Airdrop endpoint is only available on devnet policy/network.',
      });
    }

    const requested = Number(req.body?.amountSol);
    const amountSol = Number.isFinite(requested) ? requested : 1;
    if (amountSol <= 0 || amountSol > 2) {
      return res.status(400).json({
        ok: false,
        error: 'amountSol must be between 0.000001 and 2 on devnet.',
      });
    }

    const { Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
    const keypair = parseHotWalletKeypair();
    const rpcUrl = getSolanaRpcUrl(network);
    const connection = new Connection(rpcUrl, 'confirmed');
    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

    const signature = await connection.requestAirdrop(keypair.publicKey, lamports);
    await connection.confirmTransaction(signature, 'confirmed');

    const balanceLamports = await connection.getBalance(keypair.publicKey);
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

    const event = createSystemEvent('info', 'OpenClaw payout.devnet-airdrop', {
      hotWalletPublicKey: keypair.publicKey.toBase58(),
      amountSol,
      signature,
      requestedByAdmin: req.admin?.email || 'unknown-admin',
      rpcUrl,
    });
    dispatchToOpenClaw(event, console.log).catch(err => console.warn('[Solana] Operation failed:', err?.message || err));

    return res.json({
      ok: true,
      network,
      hotWalletPublicKey: keypair.publicKey.toBase58(),
      airdropAmountSol: amountSol,
      signature,
      explorerUrl,
      balanceSol: balanceLamports / LAMPORTS_PER_SOL,
      balanceLamports,
    });
  } catch (err) {
    return res.status(err.notConfigured ? 400 : 500).json({
      ok: false,
      error: err.message || 'Devnet airdrop failed',
      notConfigured: Boolean(err.notConfigured),
    });
  }
});

// POST /api/solana/execute-test-flow
// One-click guided flow for admin UX:
// 1) Validate limits and wallet, 2) optional devnet top-up, 3) sign + send transfer.
router.post('/execute-test-flow', adminSession, async (req, res) => {
  try {
    const {
      recipientAddress,
      amountSol,
      amountUsd = null,
      memo = '',
      autoAirdropOnDevnet = true,
    } = req.body || {};

    const policy = await getEffectiveTestPolicy();
    const network = policy.network || process.env.SOLANA_CLUSTER || 'devnet';
    const trimmedRecipient = String(recipientAddress || '').trim();
    const numericSol = Number(amountSol);
    const numericUsd = Number(amountUsd);
    const hasUsd = Number.isFinite(numericUsd) && numericUsd > 0;

    if (!isLikelySolanaAddress(trimmedRecipient)) {
      return res.status(400).json({ ok: false, error: 'recipientAddress must be a valid Solana address' });
    }
    if (!Number.isFinite(numericSol) || numericSol <= 0) {
      return res.status(400).json({ ok: false, error: 'amountSol must be a positive number' });
    }
    if (hasUsd && Number.isFinite(policy.minUsd) && numericUsd < policy.minUsd) {
      return res.status(400).json({ ok: false, error: `amountUsd is below minimum of $${policy.minUsd}` });
    }
    if (hasUsd && Number.isFinite(policy.maxUsd) && numericUsd > policy.maxUsd) {
      return res.status(400).json({ ok: false, error: `amountUsd exceeds maximum of $${policy.maxUsd}` });
    }
    if (Number.isFinite(policy.minSol) && numericSol < policy.minSol) {
      return res.status(400).json({ ok: false, error: `amountSol is below minimum of ${policy.minSol} SOL` });
    }
    if (Number.isFinite(policy.maxSol) && numericSol > policy.maxSol) {
      return res.status(400).json({ ok: false, error: `amountSol exceeds maximum of ${policy.maxSol} SOL` });
    }
    const inAllowlist = policy.walletAllowlist.length === 0 || policy.walletAllowlist.includes(trimmedRecipient);
    if (policy.requireAllowlist && !inAllowlist) {
      return res.status(403).json({ ok: false, error: 'recipientAddress is not in the wallet allowlist' });
    }

    const {
      Connection, LAMPORTS_PER_SOL,
    } = require('@solana/web3.js');
    const keypair = parseHotWalletKeypair();
    const rpcUrl = getSolanaRpcUrl(network);
    const connection = new Connection(rpcUrl, 'confirmed');

    const lamports = Math.round(numericSol * LAMPORTS_PER_SOL);
    const feeBufferLamports = 20000; // conservative fee/headroom buffer

    const preBalanceLamports = await connection.getBalance(keypair.publicKey);
    let postAirdropBalanceLamports = preBalanceLamports;
    let airdrop = {
      attempted: false,
      ok: false,
      amountSol: 0,
      signature: '',
      explorerUrl: '',
      error: '',
    };

    const needsTopUp = preBalanceLamports < (lamports + feeBufferLamports);
    if (network === 'devnet' && autoAirdropOnDevnet && needsTopUp) {
      try {
        const targetLamports = lamports + feeBufferLamports;
        const deficit = Math.max(targetLamports - preBalanceLamports, 0);
        const requestedLamports = Math.min(Math.max(deficit, Math.round(0.2 * LAMPORTS_PER_SOL)), 2 * LAMPORTS_PER_SOL);
        const airdropSig = await connection.requestAirdrop(keypair.publicKey, requestedLamports);
        await connection.confirmTransaction(airdropSig, 'confirmed');
        postAirdropBalanceLamports = await connection.getBalance(keypair.publicKey);

        airdrop = {
          attempted: true,
          ok: true,
          amountSol: requestedLamports / LAMPORTS_PER_SOL,
          signature: airdropSig,
          explorerUrl: `https://explorer.solana.com/tx/${airdropSig}?cluster=devnet`,
          error: '',
        };
      } catch (airdropErr) {
        postAirdropBalanceLamports = await connection.getBalance(keypair.publicKey);
        airdrop = {
          attempted: true,
          ok: false,
          amountSol: 0,
          signature: '',
          explorerUrl: '',
          error: airdropErr.message || 'Airdrop attempt failed',
        };
      }
    }

    const effectiveBalanceLamports = postAirdropBalanceLamports;
    if (effectiveBalanceLamports < (lamports + feeBufferLamports)) {
      return res.status(400).json({
        ok: false,
        error: 'Insufficient hot wallet balance for transfer + fees',
        flow: {
          network,
          rpcUrl,
          hotWalletPublicKey: keypair.publicKey.toBase58(),
          preBalanceSol: preBalanceLamports / LAMPORTS_PER_SOL,
          postAirdropBalanceSol: postAirdropBalanceLamports / LAMPORTS_PER_SOL,
          requiredSolApprox: (lamports + feeBufferLamports) / LAMPORTS_PER_SOL,
          airdrop,
        },
      });
    }

    const sent = await sendSolTransferWithRetry({
      connection,
      keypair,
      recipientAddress: trimmedRecipient,
      lamports,
      maxAttempts: 2,
    });
    const signature = sent.signature;
    await new Promise((r) => setTimeout(r, 4000));
    const { status: sigStatus } = await fetchSignatureStatus(signature);
    const confirmationStatus = sigStatus?.confirmationStatus || 'submitted';
    const rpcError = sigStatus?.err || null;
    const confirmed = !rpcError && (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized');

    const explorerCluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    const explorerUrl = `https://explorer.solana.com/tx/${signature}${explorerCluster}`;

    const payout = new SolanaPayout({
      walletAddress: trimmedRecipient,
      amountSol: numericSol,
      network,
      txSignature: signature,
      status: confirmed ? 'confirmed' : 'pending',
      metadata: {
        isDirectTransfer: true,
        isGuidedFlow: true,
        requestedByAdmin: req.admin?.email || 'unknown-admin',
        memo: String(memo || '').slice(0, 200),
        amountUsd: hasUsd ? numericUsd : null,
        hotWalletPublicKey: keypair.publicKey.toBase58(),
        confirmationStatus,
        airdrop,
      },
    });
    await payout.save();

    const event = createSystemEvent('info', 'OpenClaw payout.execute-test-flow', {
      payoutId: payout._id.toString(),
      signature,
      recipientAddress: trimmedRecipient,
      amountSol: numericSol,
      amountUsd: hasUsd ? numericUsd : null,
      network,
      confirmationStatus,
      requestedByAdmin: req.admin?.email || 'unknown-admin',
      flow: {
        guided: true,
        autoAirdropOnDevnet: Boolean(autoAirdropOnDevnet),
      },
    });
    dispatchToOpenClaw(event, console.log).catch(err => console.warn('[Solana] Operation failed:', err?.message || err));

    return res.json({
      ok: true,
      message: 'Guided flow complete',
      flow: {
        network,
        rpcUrl,
        hotWalletPublicKey: keypair.publicKey.toBase58(),
        sendAttempts: sent.attempts,
        preBalanceSol: preBalanceLamports / LAMPORTS_PER_SOL,
        postAirdropBalanceSol: postAirdropBalanceLamports / LAMPORTS_PER_SOL,
        airdrop,
        transfer: {
          signature,
          explorerUrl,
          confirmationStatus,
          confirmed,
          amountSol: numericSol,
          recipientAddress: trimmedRecipient,
        },
      },
      payout: {
        id: payout._id.toString(),
        status: payout.status,
        txSignature: payout.txSignature,
      },
    });
  } catch (err) {
    return res.status(err.notConfigured ? 400 : 500).json({
      ok: false,
      error: err.message || 'Guided flow failed',
      notConfigured: Boolean(err.notConfigured),
    });
  }
});

// POST /api/solana/direct-transfer
// Signs and broadcasts a SOL transfer directly from the server hot wallet.
// Enforces all policy limits. Private key is read from env only — never stored.
router.post('/direct-transfer', adminSession, async (req, res) => {
  try {
    const { recipientAddress, amountSol, amountUsd = null, memo = '' } = req.body || {};

    const policy = await getEffectiveTestPolicy();
    const trimmedRecipient = String(recipientAddress || '').trim();
    const numericSol = Number(amountSol);
    const numericUsd = Number(amountUsd);
    const hasUsd = Number.isFinite(numericUsd) && numericUsd > 0;

    if (!isLikelySolanaAddress(trimmedRecipient)) {
      return res.status(400).json({ ok: false, error: 'recipientAddress must be a valid Solana address' });
    }
    if (!Number.isFinite(numericSol) || numericSol <= 0) {
      return res.status(400).json({ ok: false, error: 'amountSol must be a positive number' });
    }
    if (hasUsd && Number.isFinite(policy.minUsd) && numericUsd < policy.minUsd) {
      return res.status(400).json({ ok: false, error: `amountUsd is below minimum of $${policy.minUsd}` });
    }
    if (hasUsd && numericUsd > policy.maxUsd) {
      return res.status(400).json({ ok: false, error: `amountUsd exceeds maximum of $${policy.maxUsd}` });
    }
    if (Number.isFinite(policy.minSol) && numericSol < policy.minSol) {
      return res.status(400).json({ ok: false, error: `amountSol is below minimum of ${policy.minSol} SOL` });
    }
    if (numericSol > policy.maxSol) {
      return res.status(400).json({ ok: false, error: `amountSol exceeds maximum of ${policy.maxSol} SOL` });
    }
    const inAllowlist = policy.walletAllowlist.length === 0 || policy.walletAllowlist.includes(trimmedRecipient);
    if (policy.requireAllowlist && !inAllowlist) {
      return res.status(403).json({ ok: false, error: 'recipientAddress is not in the wallet allowlist' });
    }

    const {
      Connection, LAMPORTS_PER_SOL,
    } = require('@solana/web3.js');
    const keypair = parseHotWalletKeypair();
    const rpcUrl = getSolanaRpcUrl(network);
    const connection = new Connection(rpcUrl, 'confirmed');

    const lamports = Math.round(numericSol * LAMPORTS_PER_SOL);
    const sent = await sendSolTransferWithRetry({
      connection,
      keypair,
      recipientAddress: trimmedRecipient,
      lamports,
      maxAttempts: 2,
    });
    const signature = sent.signature;

    // Wait briefly then check status (non-blocking: return sig even if not yet confirmed)
    await new Promise((r) => setTimeout(r, 4000));
    const { status: sigStatus } = await fetchSignatureStatus(signature);
    const confirmationStatus = sigStatus?.confirmationStatus || 'submitted';
    const rpcError = sigStatus?.err || null;
    const confirmed = !rpcError && (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized');

    const network = policy.network || process.env.SOLANA_CLUSTER || 'devnet';
    const explorerCluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    const explorerUrl = `https://explorer.solana.com/tx/${signature}${explorerCluster}`;

    const payout = new SolanaPayout({
      walletAddress: trimmedRecipient,
      amountSol: numericSol,
      network,
      txSignature: signature,
      status: confirmed ? 'confirmed' : 'pending',
      metadata: {
        isDirectTransfer: true,
        requestedByAdmin: req.admin?.email || 'unknown-admin',
        memo: String(memo || '').slice(0, 200),
        amountUsd: hasUsd ? numericUsd : null,
        hotWalletPublicKey: keypair.publicKey.toBase58(),
        confirmationStatus,
        policySnapshot: {
          minUsd: Number.isFinite(policy.minUsd) ? policy.minUsd : null,
          maxUsd: policy.maxUsd,
          minSol: Number.isFinite(policy.minSol) ? policy.minSol : null,
          maxSol: policy.maxSol,
        },
      },
    });
    await payout.save();

    const event = createSystemEvent('info', 'OpenClaw payout.direct-transfer', {
      payoutId: payout._id.toString(),
      signature,
      recipientAddress: trimmedRecipient,
      amountSol: numericSol,
      amountUsd: hasUsd ? numericUsd : null,
      network,
      confirmationStatus,
      requestedByAdmin: req.admin?.email || 'unknown-admin',
    });
    dispatchToOpenClaw(event, console.log).catch(err => console.warn('[Solana] Operation failed:', err?.message || err));

    res.json({
      ok: true,
      signature,
      explorerUrl,
      confirmationStatus,
      confirmed,
      sendAttempts: sent.attempts,
      payout: {
        id: payout._id.toString(),
        walletAddress: trimmedRecipient,
        amountSol: numericSol,
        amountUsd: hasUsd ? numericUsd : null,
        network,
        status: payout.status,
      },
    });
  } catch (err) {
    console.error('Solana direct-transfer error:', err);
    res.status(err.notConfigured ? 400 : 500).json({
      ok: false,
      error: err.message || 'Transfer failed',
      notConfigured: Boolean(err.notConfigured),
    });
  }
});

// GET /api/solana/autopilot-runs
// Lists recent guided/autopilot transfer runs for admin audit visibility.
router.get('/autopilot-runs', adminSession, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10), 1), 100);
    const docs = await SolanaPayout.find({
      'metadata.isGuidedFlow': true,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const runs = docs.map((p) => {
      const network = p.network || 'devnet';
      const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
      const explorerUrl = p.txSignature
        ? `https://explorer.solana.com/tx/${p.txSignature}${cluster}`
        : '';

      return {
        id: p._id.toString(),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        status: p.status,
        network,
        walletAddress: p.walletAddress,
        amountSol: p.amountSol,
        amountUsd: p.metadata?.amountUsd ?? null,
        txSignature: p.txSignature || '',
        explorerUrl,
        requestedByAdmin: p.metadata?.requestedByAdmin || 'unknown-admin',
        memo: p.metadata?.memo || '',
        confirmationStatus: p.metadata?.confirmationStatus || null,
        airdrop: p.metadata?.airdrop || null,
      };
    });

    return res.json({
      ok: true,
      runs,
      count: runs.length,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Failed to load autopilot runs',
    });
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

