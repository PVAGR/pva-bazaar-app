// backend/routes/legacy.js - Legacy Entry API Endpoints
// These endpoints allow creating, storing, and accessing immortal records

const express = require('express');
const router = express.Router();
const { LegacySystem } = require('../legacy-system');

// Initialize legacy system
const legacySystem = new LegacySystem();

/**
 * POST /api/legacy/entry
 * Create a new legacy entry
 * 
 * Body:
 * {
 *   "content": "Your thoughts, code, memories",
 *   "metadata": {
 *     "title": "Entry Title",
 *     "type": "journal|manifesto|code|thought",
 *     "tags": ["tag1", "tag2"]
 *   }
 * }
 */
router.post('/entry', async (req, res) => {
  try {
    const { content, metadata = {} } = req.body;

    if (!content) {
      return res.status(400).json({
        ok: false,
        error: 'Content is required'
      });
    }

    const result = legacySystem.addLegacyEntry(content, {
      creator: metadata.creator || 'PVAGR',
      title: metadata.title || 'Untitled Entry',
      type: metadata.type || 'journal',
      tags: metadata.tags || [],
      ...metadata
    });

    res.json({
      ok: true,
      message: 'Legacy entry created',
      entry: {
        hash: legacySystem.chain.entries[legacySystem.chain.entries.length - 1].hash,
        timestamp: new Date().toISOString(),
        status: 'IMMORTAL'
      },
      saved: result
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/legacy/chain
 * Get complete legacy chain status
 */
router.get('/chain', (req, res) => {
  try {
    const status = legacySystem.getStatus();
    const entries = legacySystem.chain.entries.map(e => ({
      id: e.id,
      hash: e.hash,
      title: e.metadata.title,
      timestamp: e.timestamp,
      type: e.metadata.type,
      tags: e.metadata.tags
    }));

    res.json({
      ok: true,
      chain: {
        ...status,
        entries
      }
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/legacy/entry/:hash
 * Retrieve specific entry by hash
 * 
 * Returns: Full entry with content
 */
router.get('/entry/:hash', (req, res) => {
  try {
    const { hash } = req.params;
    const entry = legacySystem.chain.entries.find(e => e.hash === hash);

    if (!entry) {
      return res.status(404).json({
        ok: false,
        error: 'Entry not found'
      });
    }

    res.json({
      ok: true,
      entry: entry.toJSON()
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/legacy/journal
 * Get complete journal as markdown
 * 
 * Returns: Full journal document
 */
router.get('/journal', (req, res) => {
  try {
    const journal = legacySystem.chain.exportAsJournal();

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="LEGACY_JOURNAL.md"');
    res.send(journal);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/legacy/verify
 * Verify integrity of entire chain
 * 
 * Returns: Verification status and merkle root
 */
router.get('/verify', (req, res) => {
  try {
    const isValid = legacySystem.chain.verify();
    const status = legacySystem.getStatus();

    res.json({
      ok: true,
      verification: {
        valid: isValid,
        entries: status.entries,
        merkleRoot: status.merkleRoot,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * POST /api/legacy/guardian/add
 * Add a guardian for resurrection protocol
 * 
 * Body:
 * {
 *   "name": "Guardian Name",
 *   "publicKey": "public-key-data"
 * }
 */
router.post('/guardian/add', (req, res) => {
  try {
    const { name, publicKey } = req.body;

    if (!name || !publicKey) {
      return res.status(400).json({
        ok: false,
        error: 'Name and publicKey are required'
      });
    }

    legacySystem.protocol.addGuardian(name, publicKey);

    res.json({
      ok: true,
      guardian: {
        name,
        index: legacySystem.protocol.guardians.length - 1,
        totalGuardians: legacySystem.protocol.guardians.length,
        threshold: legacySystem.protocol.guardianThreshold
      }
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * POST /api/legacy/guardian/confirm-death
 * Guardian confirms death (multisig)
 * 
 * Body:
 * {
 *   "guardianIndex": 0,
 *   "deathCertificate": "proof-of-death"
 * }
 */
router.post('/guardian/confirm-death', (req, res) => {
  try {
    const { guardianIndex, deathCertificate } = req.body;

    if (guardianIndex === undefined || !deathCertificate) {
      return res.status(400).json({
        ok: false,
        error: 'guardianIndex and deathCertificate are required'
      });
    }

    const result = legacySystem.protocol.confirmDeath(guardianIndex, deathCertificate);

    res.json({
      ok: true,
      resurrection: result
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/legacy/resurrection-status
 * Check if legacy has been unlocked (death confirmed)
 */
router.get('/resurrection-status', (req, res) => {
  try {
    const locked = legacySystem.protocol.locked;
    const activations = legacySystem.protocol.guardians.filter(g => g.activated).length;

    let token = null;
    if (!locked) {
      token = legacySystem.protocol.generateResurrectionToken();
    }

    res.json({
      ok: true,
      status: {
        locked,
        activatedGuardians: activations,
        totalGuardians: legacySystem.protocol.guardians.length,
        threshold: legacySystem.protocol.guardianThreshold,
        deathProof: locked ? null : legacySystem.protocol.deathProof,
        resurrectionToken: token
      }
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/legacy/download
 * Download complete legacy as JSON
 */
router.get('/download', (req, res) => {
  try {
    const legacyData = {
      created: new Date().toISOString(),
      status: legacySystem.getStatus(),
      entries: legacySystem.chain.entries.map(e => e.toJSON()),
      merkleTree: legacySystem.chain.merkleTree
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="LEGACY_COMPLETE.json"');
    res.json(legacyData);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

module.exports = router;
