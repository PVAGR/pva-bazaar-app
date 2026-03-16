const { Web3 } = require('web3');
const path = require('path');
const fs = require('fs');

// Initialize Web3
const web3 = new Web3(process.env.ETHEREUM_RPC_URL);

// Load ABI
const ABI_PATH = path.join(__dirname, 'abi', 'PVAUniversal721.min.abi.json');
let ABI = [];

try {
  if (fs.existsSync(ABI_PATH)) {
    ABI = JSON.parse(fs.readFileSync(ABI_PATH, 'utf8'));
  } else {
    console.warn('ABI file not found at:', ABI_PATH);
  }
} catch (error) {
  console.error('Error loading ABI:', error);
}

/**
 * Verify artifact ownership on blockchain
 * @param {string} contractAddress - The contract address
 * @param {string} tokenId - The token ID
 * @returns {Promise<Object>} Verification results
 */
async function verifyOnChain(contractAddress, tokenId) {
  try {
    if (!web3.utils.isAddress(contractAddress)) {
      throw new Error('Invalid contract address');
    }

    const contract = new web3.eth.Contract(ABI, contractAddress);

    const [owner, uri, baseURI] = await Promise.all([
      contract.methods.ownerOf(tokenId).call(),
      contract.methods.tokenURI(tokenId).call(),
      contract.methods
        .baseURI()
        .call()
        .catch(() => null), // baseURI might not exist
    ]);

    return {
      currentOwner: owner,
      tokenURI: uri,
      baseURI: baseURI,
      verified: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Blockchain verification error:', error);
    throw new Error(`Blockchain verification failed: ${error.message}`);
  }
}

const EXPLORER_BASE_BY_NETWORK = {
  base: 'https://basescan.org',
  'base-sepolia': 'https://sepolia.basescan.org',
  ethereum: 'https://etherscan.io',
  sepolia: 'https://sepolia.etherscan.io',
  polygon: 'https://polygonscan.com',
  arbitrum: 'https://arbiscan.io',
  optimism: 'https://optimistic.etherscan.io',
};

function normalizeNetwork(network) {
  const normalized = String(network || 'base').trim().toLowerCase();
  return EXPLORER_BASE_BY_NETWORK[normalized] ? normalized : 'base';
}

function getExplorerTxUrl(network, txHash) {
  const safeNetwork = normalizeNetwork(network);
  const baseUrl = EXPLORER_BASE_BY_NETWORK[safeNetwork];
  return `${baseUrl}/tx/${txHash}`;
}

function isValidTxHash(txHash) {
  return typeof txHash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(txHash.trim());
}

async function inspectTransaction(txHash) {
  const hash = String(txHash || '').trim();
  if (!isValidTxHash(hash)) {
    throw new Error('Invalid transaction hash format');
  }

  const [tx, receipt] = await Promise.all([
    web3.eth.getTransaction(hash),
    web3.eth.getTransactionReceipt(hash),
  ]);

  if (!tx) {
    return {
      found: false,
      status: 'unknown',
      txHash: hash,
    };
  }

  if (!receipt) {
    return {
      found: true,
      status: 'pending',
      txHash: hash,
      fromAddress: tx.from || '',
      toAddress: tx.to || '',
      valueWei: tx.value != null ? String(tx.value) : '0',
      blockNumber: null,
      chainId: tx.chainId ? Number(tx.chainId) : null,
      txTimestamp: null,
    };
  }

  const block = await web3.eth.getBlock(receipt.blockNumber).catch(() => null);
  const txStatus = receipt.status === true || receipt.status === '0x1' ? 'confirmed' : 'failed';

  return {
    found: true,
    status: txStatus,
    txHash: hash,
    fromAddress: tx.from || '',
    toAddress: tx.to || '',
    valueWei: tx.value != null ? String(tx.value) : '0',
    blockNumber: receipt.blockNumber || null,
    chainId: tx.chainId ? Number(tx.chainId) : null,
    txTimestamp: block?.timestamp ? new Date(Number(block.timestamp) * 1000) : null,
  };
}

module.exports = {
  web3,
  verifyOnChain,
  normalizeNetwork,
  getExplorerTxUrl,
  isValidTxHash,
  inspectTransaction,
};
