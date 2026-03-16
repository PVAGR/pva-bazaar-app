/**
 * IPFS upload helpers via Pinata Cloud REST API.
 *
 * Requires PINATA_JWT in environment.  Get a free key at:
 *   https://app.pinata.cloud/keys
 *
 * Both endpoints use Node 18+ native fetch + FormData / Blob — no extra deps.
 */

const fs = require('fs');
const path = require('path');

const PINATA_PIN_FILE_URL  = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_PIN_JSON_URL  = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const PINATA_TEST_AUTH_URL = 'https://api.pinata.cloud/data/testAuthentication';

function isPinataConfigured() {
  return !!(process.env.PINATA_JWT);
}

/**
 * Upload a local image file to IPFS via Pinata.
 * @param {string} imagePath  Absolute path to the image file.
 * @param {string} label      Human-readable label for Pinata metadata.
 * @returns {Promise<string>} IPFS CID (v1, "bafy…" or "Qm…" depending on Pinata version).
 */
async function uploadImageToIPFS(imagePath, label = 'artifact-image') {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error('PINATA_JWT is not set in environment');

  const buffer = fs.readFileSync(imagePath);
  const blob   = new Blob([buffer], { type: guessMime(imagePath) });

  const form = new FormData();
  form.append('file', blob, path.basename(imagePath));
  form.append('pinataMetadata', JSON.stringify({ name: `${label}-image` }));
  form.append('pinataOptions',  JSON.stringify({ cidVersion: 1 }));

  const res = await fetch(PINATA_PIN_FILE_URL, {
    method:  'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body:    form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata image upload failed (HTTP ${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.IpfsHash;   // CID string
}

/**
 * Upload an ERC-721 metadata JSON object to IPFS via Pinata.
 * @param {object} metadata   Standard NFT metadata object (name, description, image, attributes…).
 * @param {string} label      Human-readable label for Pinata metadata.
 * @returns {Promise<string>} IPFS CID of the pinned JSON.
 */
async function uploadMetadataToIPFS(metadata, label = 'artifact-metadata') {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error('PINATA_JWT is not set in environment');

  const res = await fetch(PINATA_PIN_JSON_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent:  metadata,
      pinataMetadata: { name: `${label}-metadata.json` },
      pinataOptions:  { cidVersion: 1 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata metadata upload failed (HTTP ${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.IpfsHash;   // CID string
}

/**
 * Quick connectivity + auth check against Pinata.
 */
async function testPinataAuth() {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return { ok: false, reason: 'PINATA_JWT not set' };

  try {
    const res = await fetch(PINATA_TEST_AUTH_URL, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.ok) return { ok: true };
    const text = await res.text();
    return { ok: false, reason: `HTTP ${res.status}: ${text}` };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  return map[ext] || 'application/octet-stream';
}

module.exports = { isPinataConfigured, uploadImageToIPFS, uploadMetadataToIPFS, testPinataAuth };
