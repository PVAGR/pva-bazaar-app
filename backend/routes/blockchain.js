const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BlockchainTransfer = require('../models/BlockchainTransfer');
const {
  verifyOnChain,
  normalizeNetwork,
  getExplorerTxUrl,
  isValidTxHash,
  inspectTransaction,
} = require('../utils/blockchain');

function toPublicTransfer(transfer) {
  const item = transfer.toObject ? transfer.toObject() : transfer;
  return {
    id: item._id,
    network: item.network,
    txHash: item.txHash,
    chainId: item.chainId,
    blockNumber: item.blockNumber,
    status: item.status,
    fromAddress: item.fromAddress,
    toAddress: item.toAddress,
    tokenSymbol: item.tokenSymbol,
    tokenAmount: item.tokenAmount,
    amountUsd: item.amountUsd,
    note: item.note,
    mediaUrl: item.mediaUrl,
    referenceUrl: item.referenceUrl,
    explorerUrl: item.explorerUrl,
    txTimestamp: item.txTimestamp,
    lastCheckedAt: item.lastCheckedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function parseOptionalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

// GET /api/blockchain/verify - Verify on blockchain
router.get('/verify', async (req, res) => {
  try {
    const { contract, tokenId } = req.query;
    if (!contract || !tokenId) {
      return res
        .status(400)
        .json({ ok: false, message: 'Contract address and token ID are required' });
    }
    const data = await verifyOnChain(contract, tokenId);
    res.json({ ok: true, message: 'Blockchain verification successful', data });
  } catch (error) {
    console.error('Blockchain verification error:', error);
    res
      .status(500)
      .json({ ok: false, message: 'Failed to verify on blockchain', error: error.message });
  }
});

// GET /api/blockchain/health - Blockchain health check
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    message: 'Blockchain service is operational',
    network: 'base',
    rpc: !!process.env.ETHEREUM_RPC_URL,
  });
});

// GET /api/blockchain/transfers - list tracked transfer records
router.get('/transfers', auth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
    const query = {};

    if (req.query.status) {
      query.status = String(req.query.status);
    }

    if (req.query.network) {
      query.network = normalizeNetwork(req.query.network);
    }

    const items = await BlockchainTransfer.find(query).sort({ createdAt: -1 }).limit(limit);
    res.json({ ok: true, items: items.map(toPublicTransfer) });
  } catch (error) {
    console.error('Blockchain transfers list error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load blockchain transfers' });
  }
});

// POST /api/blockchain/transfers/record - record and verify an on-chain transfer
router.post('/transfers/record', auth, async (req, res) => {
  try {
    const txHash = String(req.body?.txHash || '').trim();
    if (!isValidTxHash(txHash)) {
      return res.status(400).json({ ok: false, message: 'Valid txHash is required' });
    }

    const amountUsd = Number(req.body?.amountUsd || 0);
    const note = String(req.body?.note || '').trim().slice(0, 800);
    const tokenSymbol = String(req.body?.tokenSymbol || 'USDC').trim().slice(0, 16).toUpperCase();
    const tokenAmount = String(req.body?.tokenAmount || '').trim().slice(0, 64);
    const requestedNetwork = normalizeNetwork(req.body?.network || 'base');
    const mediaUrl = parseOptionalUrl(req.body?.mediaUrl);
    const referenceUrl = parseOptionalUrl(req.body?.referenceUrl);

    const chainResult = await inspectTransaction(txHash);
    const network = requestedNetwork;
    const explorerUrl = getExplorerTxUrl(network, txHash);

    const updateDoc = {
      submittedBy: req.user.id,
      network,
      txHash,
      status: chainResult.status,
      chainId: chainResult.chainId || null,
      blockNumber: chainResult.blockNumber || null,
      fromAddress: String(req.body?.fromAddress || chainResult.fromAddress || '').trim(),
      toAddress: String(req.body?.toAddress || chainResult.toAddress || '').trim(),
      tokenSymbol,
      tokenAmount,
      amountUsd: Number.isFinite(amountUsd) ? amountUsd : 0,
      note,
      mediaUrl,
      referenceUrl,
      explorerUrl,
      txTimestamp: chainResult.txTimestamp || null,
      lastCheckedAt: new Date(),
      rawError: chainResult.found ? '' : 'Transaction not found on configured RPC',
    };

    const item = await BlockchainTransfer.findOneAndUpdate(
      { txHash },
      { $set: updateDoc, $setOnInsert: { submittedBy: req.user.id } },
      { upsert: true, new: true }
    );

    res.json({
      ok: true,
      message: 'Blockchain transfer record saved',
      item: toPublicTransfer(item),
    });
  } catch (error) {
    console.error('Blockchain transfer record error:', error);
    res.status(500).json({ ok: false, message: 'Failed to record blockchain transfer', error: error.message });
  }
});

// POST /api/blockchain/transfers/:id/reverify - refresh tx status from chain
router.post('/transfers/:id/reverify', auth, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }

    const chainResult = await inspectTransaction(item.txHash);
    item.status = chainResult.status;
    item.chainId = chainResult.chainId || item.chainId || null;
    item.blockNumber = chainResult.blockNumber || null;
    item.fromAddress = chainResult.fromAddress || item.fromAddress || '';
    item.toAddress = chainResult.toAddress || item.toAddress || '';
    item.txTimestamp = chainResult.txTimestamp || item.txTimestamp || null;
    item.explorerUrl = getExplorerTxUrl(item.network, item.txHash);
    item.lastCheckedAt = new Date();
    item.rawError = chainResult.found ? '' : 'Transaction not found on configured RPC';
    await item.save();

    res.json({ ok: true, message: 'Transfer status refreshed', item: toPublicTransfer(item) });
  } catch (error) {
    console.error('Blockchain transfer reverify error:', error);
    res.status(500).json({ ok: false, message: 'Failed to re-verify transfer', error: error.message });
  }
});

module.exports = router;
