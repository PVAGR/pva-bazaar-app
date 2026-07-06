const { Web3 } = require('web3');
const path = require('path');
const fs = require('fs');

function getRpcUrl() {
  return String(process.env.ETHEREUM_RPC_URL || process.env.RPC_URL || '').trim();
}

let web3 = null;

function getWeb3() {
  if (web3) return web3;
  const rpcUrl = getRpcUrl();
  if (!rpcUrl) return null;

  try {
    web3 = new Web3(rpcUrl);
    return web3;
  } catch (error) {
    console.warn('Web3 initialization failed:', error.message);
    return null;
  }
}

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
    const web3Client = getWeb3();
    if (!web3Client) {
      throw new Error('Blockchain RPC is not configured. Set ETHEREUM_RPC_URL or RPC_URL');
    }

    if (!web3Client.utils.isAddress(contractAddress)) {
      throw new Error('Invalid contract address');
    }

    const contract = new web3Client.eth.Contract(ABI, contractAddress);

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
      baseURI,
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
  const normalized = String(network || 'base')
    .trim()
    .toLowerCase();
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

function withTimeout(promise, timeoutMs, timeoutError = 'rpc_timeout') {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs);
    }),
  ]);
}

async function getRpcDiagnostics(options = {}) {
  const timeoutMs = Number(options.timeoutMs || 3000);
  const rpcUrl = getRpcUrl();
  const configured = Boolean(rpcUrl);

  if (!configured) {
    return {
      configured: false,
      reachable: false,
      chainId: null,
      blockNumber: null,
      latencyMs: null,
      error: 'rpc_not_configured',
    };
  }

  const web3Client = getWeb3();
  if (!web3Client) {
    return {
      configured: true,
      reachable: false,
      chainId: null,
      blockNumber: null,
      latencyMs: null,
      error: 'rpc_init_failed',
    };
  }

  const startedAt = Date.now();

  try {
    const [chainIdRaw, blockNumberRaw] = await withTimeout(
      Promise.all([web3Client.eth.getChainId(), web3Client.eth.getBlockNumber()]),
      timeoutMs,
      'rpc_timeout',
    );

    return {
      configured: true,
      reachable: true,
      chainId: Number(chainIdRaw),
      blockNumber: Number(blockNumberRaw),
      latencyMs: Date.now() - startedAt,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      chainId: null,
      blockNumber: null,
      latencyMs: Date.now() - startedAt,
      error: String(error?.message || 'rpc_check_failed'),
    };
  }
}

async function inspectTransaction(txHash) {
  const hash = String(txHash || '').trim();
  if (!isValidTxHash(hash)) {
    throw new Error('Invalid transaction hash format');
  }

  const web3Client = getWeb3();
  if (!web3Client) {
    return {
      found: false,
      status: 'rpc_not_configured',
      txHash: hash,
      rawError: 'Blockchain RPC is not configured. Set ETHEREUM_RPC_URL or RPC_URL',
    };
  }

  const [tx, receipt] = await Promise.all([
    web3Client.eth.getTransaction(hash),
    web3Client.eth.getTransactionReceipt(hash),
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

  const block = await web3Client.eth.getBlock(receipt.blockNumber).catch(() => null);
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
  web3: getWeb3(),
  getWeb3,
  getRpcUrl,
  getRpcDiagnostics,
  verifyOnChain,
  normalizeNetwork,
  getExplorerTxUrl,
  isValidTxHash,
  inspectTransaction,
};
