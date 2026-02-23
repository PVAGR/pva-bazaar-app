/**
 * EIP-712 typed data for PVA Bazaar deals (matches backend).
 * Wallets show readable payloads instead of hex strings.
 */

function getDomain(chainId) {
  const cid = Number(chainId) || 8453;
  return {
    name: 'PVA Bazaar',
    version: '1',
    chainId: cid,
  };
}

export function buildDealMessageTypedData(chainId, dealId, text, timestamp) {
  const domain = getDomain(chainId);
  const types = {
    DealMessage: [
      { name: 'dealId', type: 'string' },
      { name: 'text', type: 'string' },
      { name: 'timestamp', type: 'string' },
    ],
  };
  const message = {
    dealId: String(dealId),
    text: String(text),
    timestamp: String(timestamp || new Date().toISOString()),
  };
  return { domain, types, primaryType: 'DealMessage', message };
}

export function buildDealEvidenceTypedData(chainId, dealId, milestoneId, evidenceValue, timestamp) {
  const domain = getDomain(chainId);
  const types = {
    DealEvidence: [
      { name: 'dealId', type: 'string' },
      { name: 'milestoneId', type: 'string' },
      { name: 'evidenceValue', type: 'string' },
      { name: 'timestamp', type: 'string' },
    ],
  };
  const message = {
    dealId: String(dealId),
    milestoneId: String(milestoneId),
    evidenceValue: String(evidenceValue),
    timestamp: String(timestamp || new Date().toISOString()),
  };
  return { domain, types, primaryType: 'DealEvidence', message };
}

/** Sign EIP-712 typed data. Requires wallet address (account that will sign). */
export async function signTypedData(typedData, address) {
  if (!window?.ethereum) throw new Error('No wallet detected');
  if (!address) throw new Error('Wallet address required for signing');
  const sig = await window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [String(address), JSON.stringify(typedData)],
  });
  return String(sig || '');
}
