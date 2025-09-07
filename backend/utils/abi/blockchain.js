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
      contract.methods.baseURI().call().catch(() => null) // baseURI might not exist
    ]);

    return {
      currentOwner: owner,
      tokenURI: uri,
      baseURI: baseURI,
      verified: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Blockchain verification error:', error);
    throw new Error(`Blockchain verification failed: ${error.message}`);
  }
}

module.exports = {
  web3,
  verifyOnChain
};