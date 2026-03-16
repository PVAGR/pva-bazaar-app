const pinataSDK = require('@pinata/sdk');
const stream = require('stream');

function hasPinataCredentials() {
  return Boolean(process.env.PINATA_JWT || (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY));
}

function buildPinataClient() {
  if (!hasPinataCredentials()) {
    return null;
  }

  if (process.env.PINATA_JWT) {
    return new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });
  }

  return new pinataSDK({
    pinataApiKey: process.env.PINATA_API_KEY,
    pinataSecretApiKey: process.env.PINATA_SECRET_KEY,
  });
}

class IPFSService {
  constructor() {
    this.pinata = buildPinataClient();
  }

  refreshClient() {
    this.pinata = buildPinataClient();
  }

  isConfigured() {
    return Boolean(this.pinata);
  }

  async pinJSON(metadata, name) {
    if (!this.pinata) throw new Error('Pinata is not configured');

    const result = await this.pinata.pinJSONToIPFS(metadata, {
      pinataMetadata: {
        name,
        keyvalues: {
          type: 'Modern Artifact',
          year: '2026',
          category: 'Historical Documentation',
        },
      },
    });

    return {
      ipfsHash: result.IpfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
    };
  }

  async pinFile(fileBuffer, fileName) {
    if (!this.pinata) throw new Error('Pinata is not configured');

    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const result = await this.pinata.pinFileToIPFS(bufferStream, {
      pinataMetadata: {
        name: fileName,
      },
    });

    return {
      ipfsHash: result.IpfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
    };
  }

  generateHistoricalRecord(artifact, ipfsImageHash, blockchainTx) {
    return {
      name: artifact.name,
      description: artifact.description,
      blockchain: 'Ethereum/Polygon Testnet',
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      tokenId: artifact.blockchain_token_id || null,
      transactionHash: blockchainTx || null,
      mintDate: new Date().toISOString(),
      image: ipfsImageHash ? `https://gateway.pinata.cloud/ipfs/${ipfsImageHash}` : '',
      perceptualHash: artifact.perceptual_hash,
      uniqueHash: artifact.unique_hash,
      provenance: [
        {
          event: 'Minted',
          from: '0x0000000000000000000000000000000000000000',
          to: artifact.creator_address || '',
          date: new Date().toISOString(),
          price: null,
          platform: 'Modern Artifact Marketplace',
          transactionHash: blockchainTx || null,
        },
      ],
      royalties: {
        percentage: 10,
        recipient: artifact.creator_address || '',
        standard: 'ERC-2981',
        totalPaid: 0,
        enforceable: true,
      },
      classification: '2026 Modern Artifact',
      era: 'Web3 Integration Period',
      historicalSignificance: 'Early blockchain-verified physical item with perpetual provenance',
      authenticationStatus: 'Blockchain Verified',
      attributes: [
        { trait_type: 'Era', value: '2026' },
        { trait_type: 'Verification', value: 'Blockchain' },
        { trait_type: 'Royalty', value: '10%' },
        { trait_type: 'Type', value: 'Physical-Digital Hybrid' },
      ],
      external_url: `${process.env.SERVER_BASE_URL || 'https://api.pvabazaar.org'}/artifact/${artifact.id || ''}`,
      documentation_version: '1.0',
    };
  }
}

module.exports = new IPFSService();
