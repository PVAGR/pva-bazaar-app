/**
 * EIP-712 typed data for PVA Bazaar deals.
 * Used for message and evidence signing - wallets show readable payloads.
 */
const { verifyTypedData, getAddress } = require('ethers');

const DOMAIN_NAME = 'PVA Bazaar';
const DOMAIN_VERSION = '1';
const DEAL_MESSAGE_TYPE = {
  DealMessage: [
    { name: 'dealId', type: 'string' },
    { name: 'text', type: 'string' },
    { name: 'timestamp', type: 'string' },
  ],
};
const DEAL_EVIDENCE_TYPE = {
  DealEvidence: [
    { name: 'dealId', type: 'string' },
    { name: 'milestoneId', type: 'string' },
    { name: 'evidenceValue', type: 'string' },
    { name: 'timestamp', type: 'string' },
  ],
};

function getDomain(chainId) {
  const cid = Number(chainId) || 8453; // Base default
  return {
    name: DOMAIN_NAME,
    version: DOMAIN_VERSION,
    chainId: cid,
  };
}

/** Build typed data for deal message (frontend + backend) */
function buildDealMessageTypedData(chainId, dealId, text, timestamp) {
  const domain = getDomain(chainId);
  const message = {
    dealId: String(dealId),
    text: String(text),
    timestamp: String(timestamp || new Date().toISOString()),
  };
  return {
    domain,
    types: DEAL_MESSAGE_TYPE,
    primaryType: 'DealMessage',
    message,
  };
}

/** Build typed data for deal evidence (frontend + backend) */
function buildDealEvidenceTypedData(chainId, dealId, milestoneId, evidenceValue, timestamp) {
  const domain = getDomain(chainId);
  const message = {
    dealId: String(dealId),
    milestoneId: String(milestoneId),
    evidenceValue: String(evidenceValue),
    timestamp: String(timestamp || new Date().toISOString()),
  };
  return {
    domain,
    types: DEAL_EVIDENCE_TYPE,
    primaryType: 'DealEvidence',
    message,
  };
}

/** Verify EIP-712 signature and return recovered address (checksummed) */
function verifyDealSignature(typedData, signature) {
  const types =
    typeof typedData.types === 'object'
      ? typedData.types
      : { [typedData.primaryType]: typedData.types };
  const recovered = verifyTypedData(typedData.domain, types, typedData.message, signature);
  return getAddress(recovered);
}

/** Normalize address for comparison (checksummed) */
function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'string') return '';
  try {
    return getAddress(addr);
  } catch {
    return String(addr).toLowerCase();
  }
}

module.exports = {
  getDomain,
  buildDealMessageTypedData,
  buildDealEvidenceTypedData,
  verifyDealSignature,
  normalizeAddress,
  DEAL_MESSAGE_TYPE,
  DEAL_EVIDENCE_TYPE,
};
