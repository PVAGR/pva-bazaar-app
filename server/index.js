require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');

const db = require('./db');
const imageProcessor = require('./imageProcessor');
const ipfsService = require('./ipfsService');
const syncEngine = require('./syncEngine');

async function syncMintToMainApp({
  itemIdOrSlug,
  contractAddress,
  tokenId,
  network,
  tokenStandard,
  txHash,
  metadataUri,
  ownerWallet,
}) {
  const syncUrl = String(process.env.MAIN_APP_SYNC_URL || '').trim();
  const syncSecret = String(process.env.MAIN_APP_SYNC_SECRET || '').trim();

  if (!syncUrl || !itemIdOrSlug) {
    return {
      enabled: false,
      attempted: false,
      ok: false,
      reason: !syncUrl ? 'MAIN_APP_SYNC_URL not configured' : 'mainItemIdOrSlug not provided',
    };
  }

  try {
    const res = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(syncSecret ? { 'X-Registrar-Sync-Secret': syncSecret } : {}),
      },
      body: JSON.stringify({
        itemIdOrSlug,
        contractAddress,
        tokenId,
        network,
        tokenStandard,
        txHash,
        metadataUri,
        ownerWallet,
      }),
    });

    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch (_) {
      body = { raw: text };
    }

    return {
      enabled: true,
      attempted: true,
      ok: res.ok,
      status: res.status,
      response: body,
      error: res.ok ? '' : (body?.error || `Sync failed with HTTP ${res.status}`),
    };
  } catch (err) {
    return {
      enabled: true,
      attempted: true,
      ok: false,
      status: 0,
      error: err.message,
    };
  }
}

// Minimal ABI for ModernArtifact.mintArtifact
const MODERN_ARTIFACT_ABI = [
  'function mintArtifact(address recipient, string uniqueHash, string metadataURI) public returns (uint256)',
  'event ArtifactMinted(uint256 indexed tokenId, address indexed owner, string uniqueHash)',
];

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || '.jpg'}`);
  },
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Serve dashboard.html at /dashboard
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

function addArtifactGatewayUrls(artifact) {
  if (!artifact) return null;

  const imageHash = artifact.ipfs_image_hash || artifact.ipfs_image_cid || '';
  const docHash = artifact.ipfs_doc_hash || '';

  return {
    ...artifact,
    ipfs_image_url: imageHash ? `https://gateway.pinata.cloud/ipfs/${imageHash}` : null,
    ipfs_doc_url: docHash ? `https://gateway.pinata.cloud/ipfs/${docHash}` : null,
  };
}

function isAuthorizedWebhookRequest(req) {
  const configuredSecret = String(process.env.WEBHOOK_SHARED_SECRET || '').trim();
  if (!configuredSecret) return true;

  const providedSecret = String(
    req.get('X-Registrar-Webhook-Secret')
      || req.get('X-Webhook-Secret')
      || '',
  ).trim();

  return Boolean(providedSecret) && providedSecret === configuredSecret;
}

app.post('/api/register', upload.single('image'), async (req, res) => {
  let imagePath = '';
  try {
    const { name = '', description = '', creatorAddress = '' } = req.body || {};
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(req.file.path);

    const pHash = await imageProcessor.generatePerceptualHash(imageBuffer);

    const existing = db.prepare('SELECT id, perceptual_hash FROM artifacts').all();
    const similarItems = imageProcessor.checkSimilarity(pHash, existing);

    if (similarItems.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Duplicate detected',
        similarItems,
        message: 'This item looks too similar to an existing artifact.',
      });
    }

    const metadata = { name, description, creator: creatorAddress };
    const uniqueHash = await imageProcessor.generateUniqueID(pHash, metadata);

    if (!ipfsService.isConfigured()) {
      return res.status(503).json({
        error: 'IPFS not configured',
        message: 'Set PINATA_JWT or PINATA_API_KEY + PINATA_SECRET_KEY in server/.env and restart.',
      });
    }

    const imageResult = await ipfsService.pinFile(imageBuffer, `${name || 'artifact'}-image`);
    const historicalRecord = ipfsService.generateHistoricalRecord(
      {
        id: null,
        name,
        description,
        perceptual_hash: pHash,
        unique_hash: uniqueHash,
        creator_address: creatorAddress,
        blockchain_token_id: null,
      },
      imageResult.ipfsHash,
      null,
    );
    const docResult = await ipfsService.pinJSON(historicalRecord, `${name || 'artifact'}-documentation`);

    const relativeImagePath = `uploads/${path.basename(req.file.path)}`;
    const stmt = db.prepare(`
      INSERT INTO artifacts (
        unique_hash,
        perceptual_hash,
        name,
        description,
        image_path,
        status,
        creator_address,
        ipfs_image_hash,
        ipfs_doc_hash,
        ipfs_image_cid,
        ipfs_metadata_uri,
        ipfs_uploaded_at
      )
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    const info = stmt.run(
      uniqueHash,
      pHash,
      name,
      description,
      relativeImagePath,
      creatorAddress,
      imageResult.ipfsHash,
      docResult.ipfsHash,
      imageResult.ipfsHash,
      `ipfs://${docResult.ipfsHash}`,
    );

    const documentation = {
      ...historicalRecord,
      external_url: `${process.env.SERVER_BASE_URL || 'http://localhost:3001'}/artifact/${info.lastInsertRowid}`,
    };

    return res.json({
      success: true,
      artifactId: info.lastInsertRowid,
      uniqueHash,
      ipfsImage: imageResult.ipfsUrl,
      ipfsDocumentation: docResult.ipfsUrl,
      documentation,
      message: 'Artifact pinned to IPFS. Ready for blockchain minting.',
    });
  } catch (error) {
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.get('/api/artifacts', (_req, res) => {
  const artifacts = db.prepare('SELECT * FROM artifacts ORDER BY created_at DESC').all();
  res.json(artifacts.map(addArtifactGatewayUrls));
});

app.get('/api/artifacts/:id', (req, res) => {
  const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(Number(req.params.id));
  if (!artifact) {
    return res.status(404).json({ error: 'Artifact not found' });
  }

  return res.json(addArtifactGatewayUrls(artifact));
});

app.post('/api/artifacts/:id/list-external', async (req, res) => {
  try {
    const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(Number(req.params.id));
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    const results = await syncEngine.listToAllPlatforms(addArtifactGatewayUrls(artifact));
    return res.json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ error: 'External listing failed', details: error.message });
  }
});

// ENDPOINT: Upload artifact image + metadata JSON to IPFS (Pinata)
app.post('/api/ipfs-upload', async (req, res) => {
  try {
    const { artifactId } = req.body || {};
    if (!artifactId) return res.status(400).json({ error: 'artifactId is required' });

    const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(Number(artifactId));
    if (!artifact) return res.status(404).json({ error: 'Artifact not found in registry' });

    if (!ipfsService.isConfigured()) {
      return res.status(503).json({
        error: 'IPFS not configured',
        message: 'Add your Pinata credentials to .env to enable IPFS uploads.',
        artifact: { id: artifact.id, name: artifact.name, status: artifact.status },
      });
    }

    if (artifact.ipfs_doc_hash) {
      return res.json({
        alreadyUploaded: true,
        artifactId: artifact.id,
        ipfsImageHash: artifact.ipfs_image_hash || artifact.ipfs_image_cid,
        ipfsDocHash: artifact.ipfs_doc_hash,
        message: 'Already uploaded to IPFS.',
      });
    }

    const absoluteImagePath = path.join(__dirname, artifact.image_path);
    if (!fs.existsSync(absoluteImagePath)) {
      return res.status(404).json({ error: 'Image file not found on disk', path: artifact.image_path });
    }

    const imageBuffer = fs.readFileSync(absoluteImagePath);
    const imageResult = await ipfsService.pinFile(imageBuffer, `${artifact.name || 'artifact'}-${artifact.id}-image`);
    const historicalRecord = ipfsService.generateHistoricalRecord(artifact, imageResult.ipfsHash, artifact.blockchain_tx_hash || null);
    const docResult = await ipfsService.pinJSON(historicalRecord, `${artifact.name || 'artifact'}-${artifact.id}-documentation`);

    db.prepare(`
      UPDATE artifacts
      SET ipfs_image_hash = ?, ipfs_doc_hash = ?, ipfs_image_cid = ?, ipfs_metadata_uri = ?, ipfs_uploaded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(imageResult.ipfsHash, docResult.ipfsHash, imageResult.ipfsHash, `ipfs://${docResult.ipfsHash}`, artifact.id);

    return res.json({
      success: true,
      artifactId: artifact.id,
      ipfsImageHash: imageResult.ipfsHash,
      ipfsDocHash: docResult.ipfsHash,
      ipfsImage: imageResult.ipfsUrl,
      ipfsDocumentation: docResult.ipfsUrl,
      documentation: historicalRecord,
      message: 'Image and documentation pinned to IPFS.',
    });
  } catch (error) {
    return res.status(500).json({ error: 'IPFS upload failed', details: error.message });
  }
});

// WEBHOOK: eBay sale notification
app.post('/api/webhooks/ebay', async (req, res) => {
  const eventId = uuidv4();
  try {
    if (!isAuthorizedWebhookRequest(req)) {
      return res.status(401).json({ received: false, eventId, error: 'Unauthorized webhook request' });
    }

    const order = req.body || {};
    const sku = order?.lineItems?.[0]?.sku || '';
    const artifactId = syncEngine.extractArtifactIdFromSku(sku);

    if (artifactId) {
      await syncEngine.syncAllPlatforms(artifactId, {
        platform: 'EBAY',
        buyerAddress: order?.buyer?.username || order?.buyerUsername || '',
        txHash: order?.orderId || '',
        price: Number(order?.total?.value || 0),
      });
    }

    return res.status(200).json({ received: true, eventId });
  } catch (error) {
    return res.status(500).json({ received: false, eventId, error: error.message });
  }
});

// WEBHOOK: Amazon sale notification
app.post('/api/webhooks/amazon', async (req, res) => {
  const eventId = uuidv4();
  try {
    if (!isAuthorizedWebhookRequest(req)) {
      return res.status(401).json({ received: false, eventId, error: 'Unauthorized webhook request' });
    }

    const order = req.body || {};
    const artifactId = syncEngine.extractArtifactIdFromSku(order?.sellerOrderId || order?.SellerOrderId || '');

    if (artifactId) {
      await syncEngine.syncAllPlatforms(artifactId, {
        platform: 'AMAZON',
        buyerAddress: order?.buyerEmail || order?.BuyerInfo?.BuyerEmail || '',
        txHash: order?.amazonOrderId || order?.AmazonOrderId || '',
        price: Number(order?.orderTotal || order?.OrderTotal?.Amount || 0),
      });
    }

    return res.status(200).json({ received: true, eventId });
  } catch (error) {
    return res.status(500).json({ received: false, eventId, error: error.message });
  }
});

// WEBHOOK: Website sale notification
app.post('/api/webhooks/website', async (req, res) => {
  const eventId = uuidv4();
  try {
    if (!isAuthorizedWebhookRequest(req)) {
      return res.status(401).json({ received: false, eventId, error: 'Unauthorized webhook request' });
    }

    const { artifactId, buyerAddress, txHash, price } = req.body || {};
    if (!artifactId) {
      return res.status(400).json({ received: false, eventId, error: 'artifactId is required' });
    }

    const syncResult = await syncEngine.syncAllPlatforms(artifactId, {
      platform: 'WEBSITE',
      buyerAddress,
      txHash,
      price,
    });

    return res.status(200).json({ received: true, eventId, syncResult });
  } catch (error) {
    return res.status(500).json({ received: false, eventId, error: error.message });
  }
});

// ENDPOINT: Mint a registered artifact onto the blockchain
app.post('/api/mint', async (req, res) => {
  try {
    const { artifactId, recipientAddress, metadataURI = '', mainItemIdOrSlug = '' } = req.body || {};

    if (!artifactId) {
      return res.status(400).json({ error: 'artifactId is required' });
    }

    const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(Number(artifactId));
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found in registry' });
    }

    if (artifact.status === 'MINTED') {
      return res.status(400).json({
        error: 'Already minted',
        blockchainTokenId: artifact.blockchain_token_id,
      });
    }

    const rpcUrl = process.env.RPC_URL || process.env.ETHEREUM_RPC_URL || '';
    const privateKey = process.env.MINTER_PRIVATE_KEY || process.env.PRIVATE_KEY || '';
    const contractAddress = process.env.CONTRACT_ADDRESS || '';

    if (!rpcUrl || !privateKey || !contractAddress) {
      return res.status(503).json({
        error: 'Blockchain not configured',
        message: 'Set RPC_URL, MINTER_PRIVATE_KEY, and CONTRACT_ADDRESS in .env to enable minting.',
        artifact: {
          id: artifact.id,
          name: artifact.name,
          uniqueHash: artifact.unique_hash,
          status: artifact.status,
        },
      });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, MODERN_ARTIFACT_ABI, signer);

    const recipient = recipientAddress || (await signer.getAddress());
    // Prefer: stored IPFS URI -> caller-supplied URI -> pending placeholder
    const ipfsURI = artifact.ipfs_metadata_uri || metadataURI || `ipfs://pending/${artifact.unique_hash}`;

    const tx = await contract.mintArtifact(recipient, artifact.unique_hash, ipfsURI);
    const receipt = await tx.wait();

    // Extract tokenId from ArtifactMinted event
    let tokenId = null;
    for (const log of receipt.logs || []) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === 'ArtifactMinted') {
          tokenId = Number(parsed.args.tokenId);
          break;
        }
      } catch (_) { /* non-matching log */ }
    }

    // Update local registry
    db.prepare(`
      UPDATE artifacts
      SET status = ?,
          blockchain_token_id = ?,
          blockchain_tx_hash = ?,
          owner_address = ?
      WHERE id = ?
    `).run('MINTED', tokenId, tx.hash, recipient, artifact.id);

    const syncResult = await syncMintToMainApp({
      itemIdOrSlug: String(mainItemIdOrSlug || '').trim(),
      contractAddress,
      tokenId,
      network: process.env.NETWORK_NAME || 'unknown',
      tokenStandard: 'ERC-721',
      txHash: tx.hash,
      metadataUri: ipfsURI,
      ownerWallet: recipient,
    });

    return res.json({
      success: true,
      artifactId: artifact.id,
      tokenId,
      txHash: tx.hash,
      network: process.env.NETWORK_NAME || 'unknown',
      contractAddress,
      uniqueHash: artifact.unique_hash,
      metadataUri: ipfsURI,
      mainAppSync: syncResult,
      message: 'Artifact successfully minted to blockchain.',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Mint failed', details: error.message });
  }
});

syncEngine.startScheduledSync();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Artifact Server running on http://localhost:${PORT}`);
  console.log(`  Dashboard -> http://localhost:${PORT}/dashboard`);
  console.log(`  Register  -> POST http://localhost:${PORT}/api/register`);
  console.log(`  Artifacts -> GET  http://localhost:${PORT}/api/artifacts`);
  console.log(`  Artifact  -> GET  http://localhost:${PORT}/api/artifacts/:id`);
  console.log(`  External  -> POST http://localhost:${PORT}/api/artifacts/:id/list-external`);
  console.log(`  IPFS      -> POST http://localhost:${PORT}/api/ipfs-upload`);
  console.log(`  Mint      -> POST http://localhost:${PORT}/api/mint`);
  console.log('  Webhooks  -> POST /api/webhooks/ebay|amazon|website');
  console.log(`  Webhook auth -> ${process.env.WEBHOOK_SHARED_SECRET ? 'enabled' : 'disabled (set WEBHOOK_SHARED_SECRET)'}`);
});
