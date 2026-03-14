const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BlockchainTransfer = require('../models/BlockchainTransfer');
const Artifact = require('../models/Artifact');
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
    artifactId: item.artifactId || null,
    artifactSlug: item.artifactSlug || '',
    artifactTitle: item.artifactTitle || '',
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
    contractTerms: item.contractTerms || {
      partyOneName: '',
      partyOneRole: 'Operator',
      partyTwoName: '',
      partyTwoRole: 'Counterparty',
      additionalClauses: '',
    },
    signatures: item.signatures || {
      partyOneSignerName: '',
      partyOneSignedAt: null,
      partyTwoSignerName: '',
      partyTwoSignedAt: null,
      witnessName: '',
      witnessSignedAt: null,
    },
    finalizationNote: item.finalizationNote || '',
    finalizedAt: item.finalizedAt || null,
    isFinalized: !!item.finalizedAt,
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

function isObjectIdHex(v) {
  return typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
}

function parseOptionalDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getBaseUrl(req) {
  const host = req.get('host') || '';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${proto}://${host}`;
}

function toQrUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  return `https://quickchart.io/qr?size=180&text=${encodeURIComponent(value)}`;
}

function buildContractPayload(record, req) {
  const baseUrl = getBaseUrl(req);
  const publicRecordUrl = `${baseUrl}/api/blockchain/transfers/public/${record._id}`;
  const contractPayloadUrl = `${baseUrl}/api/blockchain/transfers/${record._id}/contract`;
  const contractRenderUrl = `${baseUrl}/api/blockchain/transfers/${record._id}/contract/render`;

  return {
    contractType: 'Blockchain Settlement Receipt',
    version: record.contractVersion || 'v1',
    generatedAt: new Date().toISOString(),
    transferId: String(record._id),
    txHash: record.txHash,
    explorerUrl: record.explorerUrl,
    network: record.network,
    chainId: record.chainId || null,
    status: record.status,
    parties: {
      from: record.fromAddress || 'N/A',
      to: record.toAddress || 'N/A',
    },
    value: {
      usd: record.amountUsd || 0,
      tokenSymbol: record.tokenSymbol || 'USDC',
      tokenAmount: record.tokenAmount || '',
    },
    artifact: {
      id: record.artifactId || null,
      slug: record.artifactSlug || '',
      title: record.artifactTitle || '',
    },
    context: {
      note: record.note || '',
      mediaUrl: record.mediaUrl || '',
      referenceUrl: record.referenceUrl || '',
      txTimestamp: record.txTimestamp || null,
      blockNumber: record.blockNumber || null,
    },
    declaration:
      'This receipt links web records and blockchain transaction data. Parties should validate tx hash and explorer details before final settlement acknowledgement.',
    contractTerms: {
      partyOneName: record.contractTerms?.partyOneName || '',
      partyOneRole: record.contractTerms?.partyOneRole || 'Operator',
      partyTwoName: record.contractTerms?.partyTwoName || '',
      partyTwoRole: record.contractTerms?.partyTwoRole || 'Counterparty',
      additionalClauses: record.contractTerms?.additionalClauses || '',
    },
    signatures: {
      partyOneSignerName: record.signatures?.partyOneSignerName || '',
      partyOneSignedAt: record.signatures?.partyOneSignedAt || null,
      partyTwoSignerName: record.signatures?.partyTwoSignerName || '',
      partyTwoSignedAt: record.signatures?.partyTwoSignedAt || null,
      witnessName: record.signatures?.witnessName || '',
      witnessSignedAt: record.signatures?.witnessSignedAt || null,
    },
    finalization: {
      finalizedAt: record.finalizedAt || null,
      finalizationNote: record.finalizationNote || '',
      isFinalized: !!record.finalizedAt,
    },
    traceUrls: {
      explorer: record.explorerUrl || '',
      publicRecord: publicRecordUrl,
      contractPayload: contractPayloadUrl,
      contractRender: contractRenderUrl,
    },
    qrUrls: {
      explorer: toQrUrl(record.explorerUrl || ''),
      publicRecord: toQrUrl(publicRecordUrl),
    },
  };
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildContractHtml(payload) {
  const artifactTitle = payload.artifact?.title || 'Not linked';
  const mediaLink = payload.context?.mediaUrl
    ? `<a href="${escapeHtml(payload.context.mediaUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.context.mediaUrl)}</a>`
    : 'N/A';
  const refLink = payload.context?.referenceUrl
    ? `<a href="${escapeHtml(payload.context.referenceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.context.referenceUrl)}</a>`
    : 'N/A';
  const explorerLink = payload.explorerUrl
    ? `<a href="${escapeHtml(payload.explorerUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.explorerUrl)}</a>`
    : 'N/A';
  const partyOneName = payload.contractTerms?.partyOneName || '________________';
  const partyOneRole = payload.contractTerms?.partyOneRole || 'Operator';
  const partyTwoName = payload.contractTerms?.partyTwoName || '________________';
  const partyTwoRole = payload.contractTerms?.partyTwoRole || 'Counterparty';
  const additionalClauses = payload.contractTerms?.additionalClauses
    ? `<h2>Additional Clauses</h2><div class="declaration">${escapeHtml(payload.contractTerms.additionalClauses)}</div>`
    : '';
  const finalizedBanner = payload.finalization?.isFinalized
    ? `<div class="finalized">Finalized at ${escapeHtml(payload.finalization.finalizedAt || 'N/A')}</div>`
    : '<div class="pending">Draft contract: not finalized</div>';
  const finalizationNote = payload.finalization?.finalizationNote
    ? `<h2>Finalization Note</h2><div class="declaration">${escapeHtml(payload.finalization.finalizationNote)}</div>`
    : '';
  const partyOneSigner = payload.signatures?.partyOneSignerName || partyOneName;
  const partyOneSignedAt = payload.signatures?.partyOneSignedAt || '';
  const partyTwoSigner = payload.signatures?.partyTwoSignerName || partyTwoName;
  const partyTwoSignedAt = payload.signatures?.partyTwoSignedAt || '';
  const witnessName = payload.signatures?.witnessName || '________________';
  const witnessSignedAt = payload.signatures?.witnessSignedAt || '';
  const qrExplorer = payload.qrUrls?.explorer
    ? `<div class="qr-card"><div>Explorer QR</div><img src="${escapeHtml(payload.qrUrls.explorer)}" alt="Explorer QR" /></div>`
    : '';
  const qrRecord = payload.qrUrls?.publicRecord
    ? `<div class="qr-card"><div>Record QR</div><img src="${escapeHtml(payload.qrUrls.publicRecord)}" alt="Record QR" /></div>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Settlement Receipt ${escapeHtml(payload.transferId)}</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; padding: 28px; color: #102028; }
      h1 { margin: 0 0 6px; font-size: 24px; }
      h2 { margin: 20px 0 8px; font-size: 16px; border-bottom: 1px solid #cad5df; padding-bottom: 6px; }
      .meta { color: #455a64; font-size: 13px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #cfd8dc; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f2f7fa; width: 26%; }
      .declaration { margin-top: 16px; border: 1px solid #cfd8dc; border-radius: 8px; padding: 12px; background: #f8fbfd; font-size: 13px; white-space: pre-wrap; }
      .finalized { margin-top: 12px; border: 1px solid #8da890; border-radius: 8px; padding: 10px; background: #eef7ef; color: #1f4b25; font-size: 13px; }
      .pending { margin-top: 12px; border: 1px solid #ccb87a; border-radius: 8px; padding: 10px; background: #fff7e2; color: #5a450e; font-size: 13px; }
      .signatures { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .sig-box { border-top: 1px solid #6d7d87; padding-top: 8px; font-size: 12px; color: #455a64; }
      .trace { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      .qr-card { border: 1px solid #cfd8dc; border-radius: 8px; padding: 10px; text-align: center; font-size: 12px; color: #455a64; }
      .qr-card img { width: 160px; height: 160px; margin-top: 8px; }
      @media print { a { color: inherit; text-decoration: none; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(payload.contractType)}</h1>
    <div class="meta">Version ${escapeHtml(payload.version)} | Generated ${escapeHtml(payload.generatedAt)}</div>

    <h2>Transfer Record</h2>
    <table>
      <tr><th>Transfer ID</th><td>${escapeHtml(payload.transferId)}</td></tr>
      <tr><th>Status</th><td>${escapeHtml(payload.status)}</td></tr>
      <tr><th>Network / Chain</th><td>${escapeHtml(payload.network)} / ${escapeHtml(payload.chainId || 'N/A')}</td></tr>
      <tr><th>Transaction Hash</th><td>${escapeHtml(payload.txHash)}</td></tr>
      <tr><th>Explorer</th><td>${explorerLink}</td></tr>
      <tr><th>From</th><td>${escapeHtml(payload.parties.from)}</td></tr>
      <tr><th>To</th><td>${escapeHtml(payload.parties.to)}</td></tr>
      <tr><th>Value</th><td>$${escapeHtml(Number(payload.value.usd || 0).toFixed(2))} ${escapeHtml(payload.value.tokenSymbol)} ${escapeHtml(payload.value.tokenAmount || '')}</td></tr>
      <tr><th>Block</th><td>${escapeHtml(payload.context.blockNumber || 'N/A')}</td></tr>
      <tr><th>On-chain Timestamp</th><td>${escapeHtml(payload.context.txTimestamp || 'N/A')}</td></tr>
    </table>

    <h2>Artifact & Evidence Context</h2>
    <table>
      <tr><th>Artifact</th><td>${escapeHtml(artifactTitle)}</td></tr>
      <tr><th>Artifact Slug</th><td>${escapeHtml(payload.artifact?.slug || 'N/A')}</td></tr>
      <tr><th>Media Link</th><td>${mediaLink}</td></tr>
      <tr><th>Reference Link</th><td>${refLink}</td></tr>
      <tr><th>Settlement Note</th><td>${escapeHtml(payload.context.note || 'N/A')}</td></tr>
    </table>

    <div class="declaration">${escapeHtml(payload.declaration)}</div>
    ${finalizedBanner}
    ${finalizationNote}
    ${additionalClauses}
    <h2>Traceability</h2>
    <table>
      <tr><th>Public Record</th><td>${escapeHtml(payload.traceUrls?.publicRecord || 'N/A')}</td></tr>
      <tr><th>Explorer URL</th><td>${escapeHtml(payload.traceUrls?.explorer || 'N/A')}</td></tr>
    </table>
    <div class="trace">
      ${qrExplorer}
      ${qrRecord}
    </div>
    <div class="signatures">
      <div class="sig-box">${escapeHtml(partyOneRole)}: ${escapeHtml(partyOneSigner)}<br/>Signed At: ${escapeHtml(partyOneSignedAt || '________________')}<br/>Signature</div>
      <div class="sig-box">${escapeHtml(partyTwoRole)}: ${escapeHtml(partyTwoSigner)}<br/>Signed At: ${escapeHtml(partyTwoSignedAt || '________________')}<br/>Signature</div>
      <div class="sig-box">Witness: ${escapeHtml(witnessName)}<br/>Signed At: ${escapeHtml(witnessSignedAt || '________________')}<br/>Signature</div>
    </div>
  </body>
</html>`;
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

// GET /api/blockchain/transfers/public/:id - public transfer trace payload for QR links
router.get('/transfers/public/:id', async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }

    const payload = buildContractPayload(item, req);
    res.json({
      ok: true,
      trace: {
        transferId: payload.transferId,
        txHash: payload.txHash,
        status: payload.status,
        network: payload.network,
        chainId: payload.chainId,
        artifact: payload.artifact,
        traceUrls: payload.traceUrls,
        finalization: payload.finalization,
        generatedAt: payload.generatedAt,
      },
    });
  } catch (error) {
    console.error('Blockchain public transfer trace error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load public transfer trace' });
  }
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

    if (req.query.artifactId && isObjectIdHex(req.query.artifactId)) {
      query.artifactId = req.query.artifactId;
    }

    const items = await BlockchainTransfer.find(query).sort({ createdAt: -1 }).limit(limit);
    res.json({ ok: true, items: items.map(toPublicTransfer) });
  } catch (error) {
    console.error('Blockchain transfers list error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load blockchain transfers' });
  }
});

// GET /api/blockchain/settlement-templates - reusable terms from recent records
router.get('/settlement-templates', auth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const items = await BlockchainTransfer.find({ submittedBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(250)
      .select('contractTerms createdAt txHash artifactTitle finalizedAt signatures');

    const seen = new Set();
    const templates = [];
    for (const item of items) {
      const terms = item.contractTerms || {};
      const fingerprint = JSON.stringify({
        partyOneName: terms.partyOneName || '',
        partyOneRole: terms.partyOneRole || 'Operator',
        partyTwoName: terms.partyTwoName || '',
        partyTwoRole: terms.partyTwoRole || 'Counterparty',
        additionalClauses: terms.additionalClauses || '',
      });
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);

      templates.push({
        id: String(item._id),
        label: `${item.artifactTitle || 'Settlement'} · ${String(item.txHash || '').slice(0, 10)}...`,
        createdAt: item.createdAt,
        finalizedAt: item.finalizedAt || null,
        terms,
      });

      if (templates.length >= limit) break;
    }

    res.json({ ok: true, templates });
  } catch (error) {
    console.error('Blockchain settlement templates error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load settlement templates' });
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
    const contractTerms = {
      partyOneName: String(req.body?.contractTerms?.partyOneName || '').trim().slice(0, 120),
      partyOneRole: String(req.body?.contractTerms?.partyOneRole || 'Operator').trim().slice(0, 80),
      partyTwoName: String(req.body?.contractTerms?.partyTwoName || '').trim().slice(0, 120),
      partyTwoRole: String(req.body?.contractTerms?.partyTwoRole || 'Counterparty').trim().slice(0, 80),
      additionalClauses: String(req.body?.contractTerms?.additionalClauses || '').trim().slice(0, 4000),
    };
    const signatures = {
      partyOneSignerName: String(req.body?.signatures?.partyOneSignerName || '').trim().slice(0, 120),
      partyOneSignedAt: parseOptionalDate(req.body?.signatures?.partyOneSignedAt),
      partyTwoSignerName: String(req.body?.signatures?.partyTwoSignerName || '').trim().slice(0, 120),
      partyTwoSignedAt: parseOptionalDate(req.body?.signatures?.partyTwoSignedAt),
      witnessName: String(req.body?.signatures?.witnessName || '').trim().slice(0, 120),
      witnessSignedAt: parseOptionalDate(req.body?.signatures?.witnessSignedAt),
    };
    const artifactId = isObjectIdHex(req.body?.artifactId) ? String(req.body.artifactId) : '';
    let artifact = null;
    if (artifactId) {
      artifact = await Artifact.findById(artifactId).select('_id slug title name');
      if (!artifact) {
        return res.status(404).json({ ok: false, message: 'Artifact not found for artifactId' });
      }
    }

    const chainResult = await inspectTransaction(txHash);
    const network = requestedNetwork;
    const explorerUrl = getExplorerTxUrl(network, txHash);
    const existing = await BlockchainTransfer.findOne({ txHash }).select('_id finalizedAt');
    if (existing?.finalizedAt) {
      return res.status(409).json({
        ok: false,
        message: 'Transfer is finalized and cannot be modified. Create a new transfer for amendments.',
      });
    }

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
      artifactId: artifact ? artifact._id : null,
      artifactSlug: artifact?.slug || '',
      artifactTitle: artifact?.title || artifact?.name || '',
      explorerUrl,
      txTimestamp: chainResult.txTimestamp || null,
      lastCheckedAt: new Date(),
      contractVersion: 'v3',
      contractTerms,
      signatures,
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

// POST /api/blockchain/transfers/:id/finalize - lock settlement terms/signatures
router.post('/transfers/:id/finalize', auth, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }
    if (item.finalizedAt) {
      return res.status(409).json({ ok: false, message: 'Transfer is already finalized' });
    }

    const partyOneSignerName = String(req.body?.signatures?.partyOneSignerName || '').trim().slice(0, 120);
    const partyTwoSignerName = String(req.body?.signatures?.partyTwoSignerName || '').trim().slice(0, 120);
    if (!partyOneSignerName || !partyTwoSignerName) {
      return res.status(400).json({
        ok: false,
        message: 'Both party signer names are required to finalize settlement',
      });
    }

    item.signatures = {
      partyOneSignerName,
      partyOneSignedAt: parseOptionalDate(req.body?.signatures?.partyOneSignedAt) || new Date(),
      partyTwoSignerName,
      partyTwoSignedAt: parseOptionalDate(req.body?.signatures?.partyTwoSignedAt) || new Date(),
      witnessName: String(req.body?.signatures?.witnessName || '').trim().slice(0, 120),
      witnessSignedAt: parseOptionalDate(req.body?.signatures?.witnessSignedAt),
    };
    item.finalizationNote = String(req.body?.finalizationNote || '').trim().slice(0, 2000);
    item.finalizedAt = new Date();
    item.finalizedBy = req.user.id;
    item.contractVersion = item.contractVersion || 'v3';
    await item.save();

    res.json({ ok: true, message: 'Settlement finalized and locked', item: toPublicTransfer(item) });
  } catch (error) {
    console.error('Blockchain transfer finalize error:', error);
    res.status(500).json({ ok: false, message: 'Failed to finalize transfer', error: error.message });
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

// GET /api/blockchain/transfers/:id/contract - settlement contract payload
router.get('/transfers/:id/contract', auth, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }

    const payload = buildContractPayload(item, req);
    res.json({ ok: true, contract: payload });
  } catch (error) {
    console.error('Blockchain transfer contract payload error:', error);
    res.status(500).json({ ok: false, message: 'Failed to build contract payload', error: error.message });
  }
});

// GET /api/blockchain/transfers/:id/contract/render - settlement contract HTML for print/PDF
router.get('/transfers/:id/contract/render', auth, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }

    const payload = buildContractPayload(item, req);
    const html = buildContractHtml(payload);
    res.json({ ok: true, html, contract: payload });
  } catch (error) {
    console.error('Blockchain transfer contract render error:', error);
    res.status(500).json({ ok: false, message: 'Failed to render contract', error: error.message });
  }
});

module.exports = router;
