/**
 * IPFS Service
 * Handles decentralized storage via IPFS (Pinata, Web3.Storage, or local IPFS node)
 * Enables users to store recordings, journals, and database backups autonomously
 */

const axios = require('axios');
const FormData = require('form-data');

class IPFSService {
  constructor() {
    // Pinata API (preferred for v1 - managed IPFS with free tier)
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_API_SECRET;
    this.pinataBaseUrl = 'https://api.pinata.cloud';
    this.pinataGateway = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';

    // Web3.Storage (alternative)
    this.web3StorageToken = process.env.WEB3_STORAGE_TOKEN;

    // Cloud IPFS API endpoint (fallback)
    this.ipfsNodeUrl = process.env.IPFS_NODE_URL || 'https://ipfs.infura.io:5001';
  }

  /**
   * Upload file buffer to IPFS via Pinata
   * @param {Buffer} fileBuffer - File data as buffer
   * @param {string} fileName - Original filename
   * @param {object} metadata - Optional metadata (tags, etc.)
   * @returns {Promise<{hash: string, url: string}>}
   */
  async uploadToPinata(fileBuffer, fileName, metadata = {}) {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new Error(
        'Pinata API credentials not configured. Set PINATA_API_KEY and PINATA_API_SECRET.',
      );
    }

    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, { filename: fileName });

      // Add metadata
      const pinataMetadata = JSON.stringify({
        name: fileName,
        keyvalues: metadata,
      });
      formData.append('pinataMetadata', pinataMetadata);

      // Pin options (make it permanent)
      const pinataOptions = JSON.stringify({
        cidVersion: 1, // Use CIDv1 for better compatibility
      });
      formData.append('pinataOptions', pinataOptions);

      const response = await axios.post(`${this.pinataBaseUrl}/pinning/pinFileToIPFS`, formData, {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: this.pinataApiKey,
          pinata_secret_api_key: this.pinataSecretKey,
        },
        maxBodyLength: Infinity,
      });

      const ipfsHash = response.data.IpfsHash;
      const gatewayUrl = `${this.pinataGateway}/${ipfsHash}`;

      return { hash: ipfsHash, url: gatewayUrl };
    } catch (error) {
      console.error('Pinata upload error:', error.response?.data || error.message);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload JSON data to IPFS (for journals, DID documents, database exports)
   * @param {object} jsonData - Data to upload
   * @param {string} name - Name for the data
   * @returns {Promise<{hash: string, url: string}>}
   */
  async uploadJSON(jsonData, name) {
    const jsonString = JSON.stringify(jsonData, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');
    return this.uploadToPinata(buffer, `${name}.json`, { type: 'json' });
  }

  /**
   * Pin existing IPFS hash (if already on IPFS network)
   * @param {string} ipfsHash - Existing IPFS hash to pin
   * @param {string} name - Name for pinned content
   * @returns {Promise<boolean>}
   */
  async pinByHash(ipfsHash, name) {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new Error('Pinata API credentials not configured.');
    }

    try {
      await axios.post(
        `${this.pinataBaseUrl}/pinning/pinByHash`,
        {
          hashToPin: ipfsHash,
          pinataMetadata: { name },
        },
        {
          headers: {
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
        },
      );

      return true;
    } catch (error) {
      console.error('Pin by hash error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Unpin content from IPFS (free up storage)
   * @param {string} ipfsHash - Hash to unpin
   * @returns {Promise<boolean>}
   */
  async unpin(ipfsHash) {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new Error('Pinata API credentials not configured.');
    }

    try {
      await axios.delete(`${this.pinataBaseUrl}/pinning/unpin/${ipfsHash}`, {
        headers: {
          pinata_api_key: this.pinataApiKey,
          pinata_secret_api_key: this.pinataSecretKey,
        },
      });

      return true;
    } catch (error) {
      console.error('Unpin error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get file from IPFS via gateway
   * @param {string} ipfsHash - IPFS hash
   * @returns {Promise<Buffer>}
   */
  async getFile(ipfsHash) {
    try {
      const response = await axios.get(`${this.pinataGateway}/${ipfsHash}`, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('IPFS fetch error:', error.message);
      throw new Error(`Failed to fetch from IPFS: ${error.message}`);
    }
  }

  /**
   * Get gateway URL for IPFS hash
   * @param {string} ipfsHash - IPFS hash
   * @returns {string}
   */
  getGatewayUrl(ipfsHash) {
    return `${this.pinataGateway}/${ipfsHash}`;
  }
}

// Singleton instance
const ipfsService = new IPFSService();

module.exports = ipfsService;
