const express = require('express');
const crypto = require('crypto');
const { verifyMessage, getAddress, isAddress } = require('ethers');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const BlockchainTransfer = require('../models/BlockchainTransfer');
const Artifact = require('../models/Artifact');
const {
  verifyOnChain,
  normalizeNetwork,
  getExplorerTxUrl,
  isValidTxHash,
  inspectTransaction,
  getRpcDiagnostics,
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
      partyOneSignerWallet: '',
      partyOneSignedAt: null,
      partyTwoSignerName: '',
      partyTwoSignerWallet: '',
      partyTwoSignedAt: null,
      witnessName: '',
      witnessWallet: '',
      witnessSignedAt: null,
    },
    attestation: item.attestation || {
      message: '',
      partyOneSignature: '',
      partyTwoSignature: '',
      witnessSignature: '',
      partyOneValid: false,
      partyTwoValid: false,
      witnessValid: false,
      verifiedAt: null,
    },
    finalizationNote: item.finalizationNote || '',
    finalizedAt: item.finalizedAt || null,
    finalizationDigest: item.finalizationDigest || '',
    auditEvents: Array.isArray(item.auditEvents) ? item.auditEvents.slice(-30) : [],
    auditEventCount: Array.isArray(item.auditEvents) ? item.auditEvents.length : 0,
    lastAuditAt:
      Array.isArray(item.auditEvents) && item.auditEvents.length
        ? item.auditEvents[item.auditEvents.length - 1].eventAt
        : null,
    isFinalized: !!item.finalizedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function appendAuditEvent(record, { eventType, actorId, actorRole, details }) {
  if (!record || !eventType) return;
  const cleanType = String(eventType).trim().slice(0, 80);
  if (!cleanType) return;

  const event = {
    eventType: cleanType,
    eventAt: new Date(),
    actorId: actorId || null,
    actorRole: String(actorRole || '')
      .trim()
      .slice(0, 60),
    details: details || null,
  };
  const prior = Array.isArray(record.auditEvents) ? record.auditEvents : [];
  record.auditEvents = [...prior, event].slice(-150);
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

function normalizeAddress(value) {
  const raw = String(value || '').trim();
  if (!raw || !isAddress(raw)) return '';
  return getAddress(raw);
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

function buildFinalizationSnapshot(record) {
  return {
    transferId: String(record._id),
    txHash: record.txHash,
    network: record.network,
    chainId: record.chainId || null,
    amountUsd: Number(record.amountUsd || 0),
    tokenSymbol: record.tokenSymbol || 'USDC',
    tokenAmount: record.tokenAmount || '',
    artifactId: record.artifactId ? String(record.artifactId) : null,
    artifactSlug: record.artifactSlug || '',
    artifactTitle: record.artifactTitle || '',
    contractTerms: {
      partyOneName: record.contractTerms?.partyOneName || '',
      partyOneRole: record.contractTerms?.partyOneRole || 'Operator',
      partyTwoName: record.contractTerms?.partyTwoName || '',
      partyTwoRole: record.contractTerms?.partyTwoRole || 'Counterparty',
      additionalClauses: record.contractTerms?.additionalClauses || '',
    },
    signatures: {
      partyOneSignerName: record.signatures?.partyOneSignerName || '',
      partyOneSignerWallet: record.signatures?.partyOneSignerWallet || '',
      partyOneSignedAt: record.signatures?.partyOneSignedAt || null,
      partyTwoSignerName: record.signatures?.partyTwoSignerName || '',
      partyTwoSignerWallet: record.signatures?.partyTwoSignerWallet || '',
      partyTwoSignedAt: record.signatures?.partyTwoSignedAt || null,
      witnessName: record.signatures?.witnessName || '',
      witnessWallet: record.signatures?.witnessWallet || '',
      witnessSignedAt: record.signatures?.witnessSignedAt || null,
    },
    attestation: {
      message: record.attestation?.message || '',
      partyOneSignature: record.attestation?.partyOneSignature || '',
      partyTwoSignature: record.attestation?.partyTwoSignature || '',
      witnessSignature: record.attestation?.witnessSignature || '',
      partyOneValid: !!record.attestation?.partyOneValid,
      partyTwoValid: !!record.attestation?.partyTwoValid,
      witnessValid: !!record.attestation?.witnessValid,
      verifiedAt: record.attestation?.verifiedAt || null,
    },
    finalizationNote: record.finalizationNote || '',
    finalizedAt: record.finalizedAt || null,
  };
}

function computeFinalizationDigest(snapshot) {
  return crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

function buildAttestationMessage(record) {
  return [
    'PVA Bazaar Settlement Attestation',
    `Transfer: ${String(record._id)}`,
    `TxHash: ${record.txHash}`,
    `Network: ${record.network}`,
    `ChainId: ${record.chainId || 'N/A'}`,
  ].join('\n');
}

function verifyAttestationSignature(message, signature, wallet) {
  const cleanMessage = String(message || '').trim();
  const cleanSignature = String(signature || '').trim();
  const expectedWallet = normalizeAddress(wallet);
  if (!cleanMessage || !cleanSignature || !expectedWallet) return false;
  try {
    const recovered = verifyMessage(cleanMessage, cleanSignature);
    return normalizeAddress(recovered) === expectedWallet;
  } catch {
    return false;
  }
}

function buildIntegrityCheck(record) {
  const hasSnapshot = !!record.finalizationSnapshot;
  const storedDigest = String(record.finalizationDigest || '').trim();
  const recomputedFromSnapshot = hasSnapshot
    ? computeFinalizationDigest(record.finalizationSnapshot)
    : '';
  const digestMatchesSnapshot =
    !!storedDigest && !!recomputedFromSnapshot && storedDigest === recomputedFromSnapshot;
  const currentSnapshot = buildFinalizationSnapshot(record);
  const currentDigest = computeFinalizationDigest(currentSnapshot);
  const currentMatchesStored = !!storedDigest && storedDigest === currentDigest;

  return {
    isFinalized: !!record.finalizedAt,
    hasSnapshot,
    storedDigest,
    recomputedFromSnapshot,
    digestMatchesSnapshot,
    currentDigest,
    currentMatchesStored,
    status: !record.finalizedAt
      ? 'not-finalized'
      : digestMatchesSnapshot && currentMatchesStored
        ? 'verified'
        : 'mismatch',
  };
}

function buildVerificationReport(record, req) {
  const payload = buildContractPayload(record, req);
  const integrity = buildIntegrityCheck(record);
  return {
    reportType: 'Settlement Verification Report',
    generatedAt: new Date().toISOString(),
    transferId: String(record._id),
    txHash: record.txHash,
    network: record.network,
    status: record.status,
    finalizedAt: record.finalizedAt || null,
    integrity,
    attestation: {
      message: payload.attestation?.message || '',
      partyOneWallet: payload.signatures?.partyOneSignerWallet || '',
      partyTwoWallet: payload.signatures?.partyTwoSignerWallet || '',
      witnessWallet: payload.signatures?.witnessWallet || '',
      partyOneValid: !!payload.attestation?.partyOneValid,
      partyTwoValid: !!payload.attestation?.partyTwoValid,
      witnessValid: !!payload.attestation?.witnessValid,
      verifiedAt: payload.attestation?.verifiedAt || null,
    },
    traceUrls: payload.traceUrls,
    qrUrls: payload.qrUrls,
    contractDigest: payload.finalization?.digest || '',
  };
}

function buildVerificationReportHtml(report) {
  const statusClass =
    report.integrity.status === 'verified'
      ? 'ok'
      : report.integrity.status === 'mismatch'
        ? 'bad'
        : 'warn';
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Verification Report ${escapeHtml(report.transferId)}</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; color: #14212a; padding: 28px; }
      h1 { margin: 0 0 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #cfd8dc; padding: 8px; text-align: left; vertical-align: top; }
      th { width: 32%; background: #f2f7fa; }
      .chip { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 12px; border: 1px solid #cfd8dc; }
      .chip.ok { background: #e8f5e9; color: #1b5e20; }
      .chip.bad { background: #ffebee; color: #b71c1c; }
      .chip.warn { background: #fff8e1; color: #7a5a00; }
      .mono { font-family: Consolas, 'Courier New', monospace; font-size: 12px; word-break: break-all; }
      .block { margin-top: 16px; }
      @media print { a { color: inherit; text-decoration: none; } }
    </style>
  </head>
  <body>
    <h1>Settlement Verification Report</h1>
    <div>Generated: ${escapeHtml(report.generatedAt)}</div>

    <div class="block">
      <span class="chip ${statusClass}">${escapeHtml(report.integrity.status)}</span>
    </div>

    <table>
      <tr><th>Transfer ID</th><td>${escapeHtml(report.transferId)}</td></tr>
      <tr><th>Tx Hash</th><td class="mono">${escapeHtml(report.txHash)}</td></tr>
      <tr><th>Network</th><td>${escapeHtml(report.network)}</td></tr>
      <tr><th>Finalized At</th><td>${escapeHtml(report.finalizedAt || 'N/A')}</td></tr>
      <tr><th>Stored Digest</th><td class="mono">${escapeHtml(report.integrity.storedDigest || '')}</td></tr>
      <tr><th>Recomputed Digest</th><td class="mono">${escapeHtml(report.integrity.recomputedFromSnapshot || '')}</td></tr>
      <tr><th>Current Digest</th><td class="mono">${escapeHtml(report.integrity.currentDigest || '')}</td></tr>
      <tr><th>Party One Signature Valid</th><td>${escapeHtml(String(!!report.attestation.partyOneValid))}</td></tr>
      <tr><th>Party Two Signature Valid</th><td>${escapeHtml(String(!!report.attestation.partyTwoValid))}</td></tr>
      <tr><th>Witness Signature Valid</th><td>${escapeHtml(String(!!report.attestation.witnessValid))}</td></tr>
      <tr><th>Public Trace URL</th><td class="mono">${escapeHtml(report.traceUrls?.publicRecord || '')}</td></tr>
    </table>
  </body>
</html>`;
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
      partyOneSignerWallet: record.signatures?.partyOneSignerWallet || '',
      partyOneSignedAt: record.signatures?.partyOneSignedAt || null,
      partyTwoSignerName: record.signatures?.partyTwoSignerName || '',
      partyTwoSignerWallet: record.signatures?.partyTwoSignerWallet || '',
      partyTwoSignedAt: record.signatures?.partyTwoSignedAt || null,
      witnessName: record.signatures?.witnessName || '',
      witnessWallet: record.signatures?.witnessWallet || '',
      witnessSignedAt: record.signatures?.witnessSignedAt || null,
    },
    attestation: {
      message: record.attestation?.message || '',
      partyOneSignature: record.attestation?.partyOneSignature || '',
      partyTwoSignature: record.attestation?.partyTwoSignature || '',
      witnessSignature: record.attestation?.witnessSignature || '',
      partyOneValid: !!record.attestation?.partyOneValid,
      partyTwoValid: !!record.attestation?.partyTwoValid,
      witnessValid: !!record.attestation?.witnessValid,
      verifiedAt: record.attestation?.verifiedAt || null,
    },
    finalization: {
      finalizedAt: record.finalizedAt || null,
      finalizationNote: record.finalizationNote || '',
      digest: record.finalizationDigest || '',
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
  const finalizationDigest = payload.finalization?.digest
    ? `<h2>Integrity Digest (SHA-256)</h2><div class="declaration">${escapeHtml(payload.finalization.digest)}</div>`
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
    ${finalizationDigest}
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
router.get('/health', async (_req, res) => {
  const rpcDiagnostics = await getRpcDiagnostics({ timeoutMs: 3000 });

  res.json({
    ok: true,
    message: 'Blockchain service is operational',
    network: 'base',
    rpc: rpcDiagnostics.configured,
    rpcReachable: rpcDiagnostics.reachable,
    chainId: rpcDiagnostics.chainId,
    blockNumber: rpcDiagnostics.blockNumber,
    latencyMs: rpcDiagnostics.latencyMs,
    rpcError: rpcDiagnostics.error,
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
        finalizationDigest: payload.finalization?.digest || '',
        integrity: buildIntegrityCheck(item),
        attestation: {
          partyOneValid: !!payload.attestation?.partyOneValid,
          partyTwoValid: !!payload.attestation?.partyTwoValid,
          witnessValid: !!payload.attestation?.witnessValid,
        },
        audit: {
          eventCount: Array.isArray(item.auditEvents) ? item.auditEvents.length : 0,
          lastEventAt:
            Array.isArray(item.auditEvents) && item.auditEvents.length
              ? item.auditEvents[item.auditEvents.length - 1].eventAt
              : null,
        },
        generatedAt: payload.generatedAt,
      },
    });
  } catch (error) {
    console.error('Blockchain public transfer trace error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load public transfer trace' });
  }
});

// GET /api/blockchain/transfers - list tracked transfer records
router.get('/transfers', authenticateToken, async (req, res) => {
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

// GET /api/blockchain/transfers/:id/audit-log - persistent audit events for a transfer
router.get('/transfers/:id/audit-log', authenticateToken, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id).select(
      'auditEvents txHash finalizedAt status createdAt updatedAt',
    );
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }
    const events = Array.isArray(item.auditEvents) ? item.auditEvents.slice(-100) : [];
    res.json({
      ok: true,
      transferId: String(item._id),
      txHash: item.txHash,
      status: item.status,
      finalizedAt: item.finalizedAt || null,
      events,
    });
  } catch (error) {
    console.error('Blockchain transfer audit log error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load audit log', error: error.message });
  }
});

// POST /api/blockchain/transfers/:id/audit-log - append operational audit event
router.post('/transfers/:id/audit-log', authenticateToken, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }
    const eventType = String(req.body?.eventType || '').trim();
    if (!eventType) {
      return res.status(400).json({ ok: false, message: 'eventType is required' });
    }

    appendAuditEvent(item, {
      eventType,
      actorId: req.user.id,
      actorRole: String(req.body?.actorRole || 'operator'),
      details: req.body?.details || null,
    });
    await item.save();

    res.json({
      ok: true,
      message: 'Audit event recorded',
      events: Array.isArray(item.auditEvents) ? item.auditEvents.slice(-100) : [],
    });
  } catch (error) {
    console.error('Blockchain transfer audit append error:', error);
    res
      .status(500)
      .json({ ok: false, message: 'Failed to append audit event', error: error.message });
  }
});

// GET /api/blockchain/settlement-templates - reusable terms from recent records
router.get('/settlement-templates', authenticateToken, async (req, res) => {
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
router.post('/transfers/record', authenticateToken, async (req, res) => {
  try {
    const txHash = String(req.body?.txHash || '').trim();
    if (!isValidTxHash(txHash)) {
      return res.status(400).json({ ok: false, message: 'Valid txHash is required' });
    }

    const amountUsd = Number(req.body?.amountUsd || 0);
    const note = String(req.body?.note || '')
      .trim()
      .slice(0, 800);
    const tokenSymbol = String(req.body?.tokenSymbol || 'USDC')
      .trim()
      .slice(0, 16)
      .toUpperCase();
    const tokenAmount = String(req.body?.tokenAmount || '')
      .trim()
      .slice(0, 64);
    const requestedNetwork = normalizeNetwork(req.body?.network || 'base');
    const mediaUrl = parseOptionalUrl(req.body?.mediaUrl);
    const referenceUrl = parseOptionalUrl(req.body?.referenceUrl);
    const contractTerms = {
      partyOneName: String(req.body?.contractTerms?.partyOneName || '')
        .trim()
        .slice(0, 120),
      partyOneRole: String(req.body?.contractTerms?.partyOneRole || 'Operator')
        .trim()
        .slice(0, 80),
      partyTwoName: String(req.body?.contractTerms?.partyTwoName || '')
        .trim()
        .slice(0, 120),
      partyTwoRole: String(req.body?.contractTerms?.partyTwoRole || 'Counterparty')
        .trim()
        .slice(0, 80),
      additionalClauses: String(req.body?.contractTerms?.additionalClauses || '')
        .trim()
        .slice(0, 4000),
    };
    const signatures = {
      partyOneSignerName: String(req.body?.signatures?.partyOneSignerName || '')
        .trim()
        .slice(0, 120),
      partyOneSignerWallet: normalizeAddress(req.body?.signatures?.partyOneSignerWallet),
      partyOneSignedAt: parseOptionalDate(req.body?.signatures?.partyOneSignedAt),
      partyTwoSignerName: String(req.body?.signatures?.partyTwoSignerName || '')
        .trim()
        .slice(0, 120),
      partyTwoSignerWallet: normalizeAddress(req.body?.signatures?.partyTwoSignerWallet),
      partyTwoSignedAt: parseOptionalDate(req.body?.signatures?.partyTwoSignedAt),
      witnessName: String(req.body?.signatures?.witnessName || '')
        .trim()
        .slice(0, 120),
      witnessWallet: normalizeAddress(req.body?.signatures?.witnessWallet),
      witnessSignedAt: parseOptionalDate(req.body?.signatures?.witnessSignedAt),
    };
    const attestation = {
      message: String(req.body?.attestation?.message || '')
        .trim()
        .slice(0, 2000),
      partyOneSignature: String(req.body?.attestation?.partyOneSignature || '')
        .trim()
        .slice(0, 800),
      partyTwoSignature: String(req.body?.attestation?.partyTwoSignature || '')
        .trim()
        .slice(0, 800),
      witnessSignature: String(req.body?.attestation?.witnessSignature || '')
        .trim()
        .slice(0, 800),
      partyOneValid: false,
      partyTwoValid: false,
      witnessValid: false,
      verifiedAt: null,
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
        message:
          'Transfer is finalized and cannot be modified. Create a new transfer for amendments.',
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
      attestation,
      rawError: chainResult.found ? '' : 'Transaction not found on configured RPC',
    };

    const item = await BlockchainTransfer.findOneAndUpdate(
      { txHash },
      { $set: updateDoc, $setOnInsert: { submittedBy: req.user.id } },
      { upsert: true, new: true },
    );

    appendAuditEvent(item, {
      eventType: existing ? 'transfer-record-updated' : 'transfer-recorded',
      actorId: req.user.id,
      actorRole: 'operator',
      details: {
        status: item.status,
        amountUsd: item.amountUsd,
        artifactId: item.artifactId || null,
      },
    });
    await item.save();

    res.json({
      ok: true,
      message: 'Blockchain transfer record saved',
      item: toPublicTransfer(item),
    });
  } catch (error) {
    console.error('Blockchain transfer record error:', error);
    res
      .status(500)
      .json({ ok: false, message: 'Failed to record blockchain transfer', error: error.message });
  }
});

// POST /api/blockchain/transfers/:id/finalize - lock settlement terms/signatures
router.post('/transfers/:id/finalize', authenticateToken, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }
    if (item.finalizedAt) {
      return res.status(409).json({ ok: false, message: 'Transfer is already finalized' });
    }

    const partyOneSignerName = String(req.body?.signatures?.partyOneSignerName || '')
      .trim()
      .slice(0, 120);
    const partyTwoSignerName = String(req.body?.signatures?.partyTwoSignerName || '')
      .trim()
      .slice(0, 120);
    if (!partyOneSignerName || !partyTwoSignerName) {
      return res.status(400).json({
        ok: false,
        message: 'Both party signer names are required to finalize settlement',
      });
    }

    item.signatures = {
      partyOneSignerName,
      partyOneSignerWallet: normalizeAddress(req.body?.signatures?.partyOneSignerWallet),
      partyOneSignedAt: parseOptionalDate(req.body?.signatures?.partyOneSignedAt) || new Date(),
      partyTwoSignerName,
      partyTwoSignerWallet: normalizeAddress(req.body?.signatures?.partyTwoSignerWallet),
      partyTwoSignedAt: parseOptionalDate(req.body?.signatures?.partyTwoSignedAt) || new Date(),
      witnessName: String(req.body?.signatures?.witnessName || '')
        .trim()
        .slice(0, 120),
      witnessWallet: normalizeAddress(req.body?.signatures?.witnessWallet),
      witnessSignedAt: parseOptionalDate(req.body?.signatures?.witnessSignedAt),
    };
    const attestationMessage =
      String(req.body?.attestation?.message || '')
        .trim()
        .slice(0, 2000) || buildAttestationMessage(item);
    const partyOneSignature = String(req.body?.attestation?.partyOneSignature || '')
      .trim()
      .slice(0, 800);
    const partyTwoSignature = String(req.body?.attestation?.partyTwoSignature || '')
      .trim()
      .slice(0, 800);
    const witnessSignature = String(req.body?.attestation?.witnessSignature || '')
      .trim()
      .slice(0, 800);
    item.attestation = {
      message: attestationMessage,
      partyOneSignature,
      partyTwoSignature,
      witnessSignature,
      partyOneValid: verifyAttestationSignature(
        attestationMessage,
        partyOneSignature,
        item.signatures.partyOneSignerWallet,
      ),
      partyTwoValid: verifyAttestationSignature(
        attestationMessage,
        partyTwoSignature,
        item.signatures.partyTwoSignerWallet,
      ),
      witnessValid: verifyAttestationSignature(
        attestationMessage,
        witnessSignature,
        item.signatures.witnessWallet,
      ),
      verifiedAt: new Date(),
    };
    item.finalizationNote = String(req.body?.finalizationNote || '')
      .trim()
      .slice(0, 2000);
    item.finalizedAt = new Date();
    item.finalizedBy = req.user.id;
    item.contractVersion = item.contractVersion || 'v3';
    item.finalizationSnapshot = buildFinalizationSnapshot(item);
    item.finalizationDigest = computeFinalizationDigest(item.finalizationSnapshot);
    appendAuditEvent(item, {
      eventType: 'transfer-finalized',
      actorId: req.user.id,
      actorRole: 'operator',
      details: {
        digest: item.finalizationDigest,
        partyOneSignerName: item.signatures.partyOneSignerName,
        partyTwoSignerName: item.signatures.partyTwoSignerName,
      },
    });
    await item.save();

    res.json({
      ok: true,
      message: 'Settlement finalized and locked',
      item: toPublicTransfer(item),
    });
  } catch (error) {
    console.error('Blockchain transfer finalize error:', error);
    res
      .status(500)
      .json({ ok: false, message: 'Failed to finalize transfer', error: error.message });
  }
});

// GET /api/blockchain/transfers/:id/verify-integrity - recompute digest and verify lock integrity
router.get('/transfers/:id/verify-integrity', authenticateToken, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }
    const integrity = buildIntegrityCheck(item);
    appendAuditEvent(item, {
      eventType: 'integrity-verified',
      actorId: req.user.id,
      actorRole: 'reviewer',
      details: { status: integrity.status },
    });
    await item.save();
    res.json({ ok: true, integrity, item: toPublicTransfer(item) });
  } catch (error) {
    console.error('Blockchain transfer integrity verify error:', error);
    res
      .status(500)
      .json({ ok: false, message: 'Failed to verify integrity', error: error.message });
  }
});

// GET /api/blockchain/transfers/:id/verification-report - audit report JSON
router.get('/transfers/:id/verification-report', authenticateToken, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }
    const report = buildVerificationReport(item, req);
    appendAuditEvent(item, {
      eventType: 'verification-report-exported',
      actorId: req.user.id,
      actorRole: 'reviewer',
      details: { format: 'json' },
    });
    await item.save();
    res.json({ ok: true, report });
  } catch (error) {
    console.error('Blockchain transfer verification report error:', error);
    res
      .status(500)
      .json({ ok: false, message: 'Failed to generate verification report', error: error.message });
  }
});

// GET /api/blockchain/transfers/:id/verification-report/render - printable audit report HTML
router.get('/transfers/:id/verification-report/render', authenticateToken, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }
    const report = buildVerificationReport(item, req);
    const html = buildVerificationReportHtml(report);
    appendAuditEvent(item, {
      eventType: 'verification-report-rendered',
      actorId: req.user.id,
      actorRole: 'reviewer',
      details: { format: 'html' },
    });
    await item.save();
    res.json({ ok: true, report, html });
  } catch (error) {
    console.error('Blockchain transfer verification render error:', error);
    res
      .status(500)
      .json({ ok: false, message: 'Failed to render verification report', error: error.message });
  }
});

// POST /api/blockchain/transfers/:id/reverify - refresh tx status from chain
router.post('/transfers/:id/reverify', authenticateToken, async (req, res) => {
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
    appendAuditEvent(item, {
      eventType: 'transfer-reverified',
      actorId: req.user.id,
      actorRole: 'reviewer',
      details: { status: item.status, blockNumber: item.blockNumber || null },
    });
    await item.save();

    res.json({ ok: true, message: 'Transfer status refreshed', item: toPublicTransfer(item) });
  } catch (error) {
    console.error('Blockchain transfer reverify error:', error);
    res
      .status(500)
      .json({ ok: false, message: 'Failed to re-verify transfer', error: error.message });
  }
});

// GET /api/blockchain/transfers/:id/contract - settlement contract payload
router.get('/transfers/:id/contract', authenticateToken, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }

    const payload = buildContractPayload(item, req);
    appendAuditEvent(item, {
      eventType: 'contract-exported',
      actorId: req.user.id,
      actorRole: 'operator',
      details: { format: 'json' },
    });
    await item.save();
    res.json({ ok: true, contract: payload });
  } catch (error) {
    console.error('Blockchain transfer contract payload error:', error);
    res
      .status(500)
      .json({ ok: false, message: 'Failed to build contract payload', error: error.message });
  }
});

// GET /api/blockchain/transfers/:id/contract/render - settlement contract HTML for print/PDF
router.get('/transfers/:id/contract/render', authenticateToken, async (req, res) => {
  try {
    const item = await BlockchainTransfer.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Transfer record not found' });
    }

    const payload = buildContractPayload(item, req);
    const html = buildContractHtml(payload);
    appendAuditEvent(item, {
      eventType: 'contract-rendered',
      actorId: req.user.id,
      actorRole: 'operator',
      details: { format: 'html' },
    });
    await item.save();
    res.json({ ok: true, html, contract: payload });
  } catch (error) {
    console.error('Blockchain transfer contract render error:', error);
    res.status(500).json({ ok: false, message: 'Failed to render contract', error: error.message });
  }
});

module.exports = router;
