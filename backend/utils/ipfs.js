const pinataSDK = require('@pinata/sdk');

// Initialize Pinata
let pinata;
try {
  pinata = new pinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_SECRET_API_KEY
  );
} catch (error) {
  console.warn('Pinata initialization failed. IPFS functions will not work.');
  console.warn('Error:', error.message);
}

/**
 * Upload a buffer to IPFS
 * @param {Buffer} buffer - The file buffer
 * @param {string} fileName - The file name
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} IPFS hash
 */
async function pinBuffer(buffer, fileName, metadata = {}) {
  if (!pinata) {
    throw new Error('Pinata not configured');
  }

  try {
    const options = {
      pinataMetadata: {
        name: fileName,
        keyvalues: {
          ...metadata,
          uploadedBy: 'pvabazaar-api',
          timestamp: new Date().toISOString()
        }
      }
    };

    const result = await pinata.pinFileToIPFS(buffer, options);
    return result.IpfsHash;
  } catch (error) {
    console.error('IPFS pinBuffer error:', error);
    throw new Error(`Failed to upload to IPFS: ${error.message}`);
  }
}

/**
 * Upload JSON to IPFS
 * @param {Object} json - The JSON data
 * @param {string} name - The metadata name
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<string>} IPFS hash
 */
async function pinJSON(json, name = 'metadata.json', metadata = {}) {
  if (!pinata) {
    throw new Error('Pinata not configured');
  }

  try {
    const options = {
      pinataMetadata: {
        name: name,
        keyvalues: {
          ...metadata,
          uploadedBy: 'pvabazaar-api',
          timestamp: new Date().toISOString()
        }
      }
    };

    const result = await pinata.pinJSONToIPFS(json, options);
    return result.IpfsHash;
  } catch (error) {
    console.error('IPFS pinJSON error:', error);
    throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
  }
}

module.exports = {
  pinata,
  pinBuffer,
  pinJSON
};