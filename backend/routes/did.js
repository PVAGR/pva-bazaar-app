const express = require('express');
const router = express.Router();
const DecentralizedIdentity = require('../models/DecentralizedIdentity');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

/**
 * @route   GET /api/did
 * @desc    Get user's DID information
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const did = await DecentralizedIdentity.findOne({ userId: req.user.id });
    
    if (!did) {
      return res.json({ ok: true, item: null, message: 'No DID created yet' });
    }
    
    res.json({ ok: true, item: did });
  } catch (error) {
    console.error('Error fetching DID:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch DID' });
  }
});

/**
 * @route   POST /api/did
 * @desc    Create new DID for user
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Check if user already has a DID
    const existing = await DecentralizedIdentity.findOne({ userId: req.user.id });
    
    if (existing) {
      return res.status(400).json({ ok: false, error: 'DID already exists for this user' });
    }
    
    const { didMethod = 'key' } = req.body;
    
    // Generate Ed25519 key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    
    // Create DID identifier (simplified - use did-jwt or similar in production)
    const publicKeyHash = crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .substring(0, 32);
    
    const didIdentifier = `did:${didMethod}:${publicKeyHash}`;
    
    // Create DID Document (W3C standard)
    const didDocument = {
      '@context': 'https://www.w3.org/ns/did/v1',
      id: didIdentifier,
      verificationMethod: [{
        id: `${didIdentifier}#key-1`,
        type: 'Ed25519VerificationKey2020',
        controller: didIdentifier,
        publicKeyMultibase: Buffer.from(publicKey).toString('base64'),
      }],
      authentication: [`${didIdentifier}#key-1`],
      assertionMethod: [`${didIdentifier}#key-1`],
    };
    
    const did = new DecentralizedIdentity({
      userId: req.user.id,
      did: didIdentifier,
      didMethod,
      publicKey,
      didDocument,
    });
    
    await did.save();
    
    // Return private key ONCE (user must save it)
    res.status(201).json({
      ok: true,
      item: did,
      privateKey, // WARNING: Only returned once, never stored
      warning: 'Save your private key securely. It will not be shown again.',
    });
  } catch (error) {
    console.error('Error creating DID:', error);
    res.status(500).json({ ok: false, error: 'Failed to create DID' });
  }
});

/**
 * @route   PUT /api/did
 * @desc    Update DID document
 * @access  Private
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const did = await DecentralizedIdentity.findOne({ userId: req.user.id });
    
    if (!did) {
      return res.status(404).json({ ok: false, error: 'DID not found' });
    }
    
    // Allow updating specific fields
    const allowedUpdates = ['didDocument', 'credentials'];
    
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        did[field] = req.body[field];
      }
    });
    
    await did.save();
    
    res.json({ ok: true, item: did });
  } catch (error) {
    console.error('Error updating DID:', error);
    res.status(500).json({ ok: false, error: 'Failed to update DID' });
  }
});

/**
 * @route   POST /api/did/verify
 * @desc    Verify a DID signature
 * @access  Public
 */
router.post('/verify', async (req, res) => {
  try {
    const { did, signature, message } = req.body;
    
    if (!did || !signature || !message) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    
    const didRecord = await DecentralizedIdentity.findOne({ did });
    
    if (!didRecord) {
      return res.status(404).json({ ok: false, error: 'DID not found' });
    }
    
    // Verify signature using public key
    const verify = crypto.createVerify('SHA256');
    verify.update(message);
    verify.end();
    
    const isValid = verify.verify(didRecord.publicKey, signature, 'base64');
    
    res.json({ ok: true, isValid });
  } catch (error) {
    console.error('Error verifying DID:', error);
    res.status(500).json({ ok: false, error: 'Verification failed' });
  }
});

/**
 * @route   GET /api/did/:did
 * @desc    Resolve DID to DID Document (public)
 * @access  Public
 */
router.get('/:did', async (req, res) => {
  try {
    const didRecord = await DecentralizedIdentity.findOne({ did: req.params.did });
    
    if (!didRecord) {
      return res.status(404).json({ ok: false, error: 'DID not found' });
    }
    
    // Return only DID Document (public info)
    res.json({
      ok: true,
      didDocument: didRecord.didDocument,
    });
  } catch (error) {
    console.error('Error resolving DID:', error);
    res.status(500).json({ ok: false, error: 'Failed to resolve DID' });
  }
});

module.exports = router;
