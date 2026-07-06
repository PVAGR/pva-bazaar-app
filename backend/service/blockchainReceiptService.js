const { JsonRpcProvider, Wallet, Contract, keccak256, toUtf8Bytes, isAddress } = require('ethers');

const RECEIPT_ABI = [
  'function mintReceipt(address buyer, string itemHash) public returns (uint256)',
];

function buildItemHash(payload) {
  const normalized = JSON.stringify({
    itemId: String(payload.itemId || ''),
    title: String(payload.title || ''),
    amountCents: Number(payload.amountCents || 0),
    currency: String(payload.currency || 'usd').toLowerCase(),
    saleSource: String(payload.saleSource || 'pva'),
    soldAt: String(payload.soldAt || new Date().toISOString()),
    saleRef: String(payload.saleRef || ''),
  });
  return keccak256(toUtf8Bytes(normalized));
}

async function mintReceiptOnChain({ buyerWallet, itemHash }) {
  const rpcUrl = process.env.RECEIPT_RPC_URL || process.env.ETHEREUM_RPC_URL || '';
  const privateKey = process.env.RECEIPT_MINTER_PRIVATE_KEY || process.env.PRIVATE_KEY || '';
  const contractAddress = process.env.RECEIPT_CONTRACT_ADDRESS || '';
  const networkName = process.env.RECEIPT_NETWORK || 'base-sepolia';

  if (!buyerWallet || !isAddress(buyerWallet)) {
    return {
      status: 'skipped',
      reason: 'Missing or invalid buyer wallet',
      network: networkName,
      contractAddress,
    };
  }

  if (!rpcUrl || !privateKey || !contractAddress) {
    return {
      status: 'skipped',
      reason: 'Missing receipt contract configuration',
      network: networkName,
      contractAddress,
    };
  }

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const signer = new Wallet(privateKey, provider);
    const contract = new Contract(contractAddress, RECEIPT_ABI, signer);

    const tx = await contract.mintReceipt(buyerWallet, itemHash);
    const receipt = await tx.wait();

    const transferLog = (receipt?.logs || []).find(
      (log) =>
        Array.isArray(log.topics) &&
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    );

    let tokenId = '';
    if (transferLog && typeof transferLog.topics?.[3] === 'string') {
      tokenId = BigInt(transferLog.topics[3]).toString(10);
    }

    return {
      status: 'minted',
      txHash: tx.hash,
      tokenId,
      network: networkName,
      contractAddress,
      mintedAt: new Date(),
    };
  } catch (error) {
    return {
      status: 'failed',
      reason: error?.message || 'Failed to mint receipt token',
      network: networkName,
      contractAddress,
    };
  }
}

module.exports = {
  buildItemHash,
  mintReceiptOnChain,
};
