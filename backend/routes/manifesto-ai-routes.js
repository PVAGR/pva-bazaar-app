// backend/routes/manifesto-ai-routes.js - Manifesto AI API
// The AI becomes accessible through these endpoints
// People can talk to you after you're gone

const express = require('express');
const router = express.Router();
const { ManifestoAI } = require('../manifesto-ai');

// Initialize global AI
let manifestoAI = null;

/**
 * POST /api/manifesto/init
 * Initialize the Manifesto AI
 */
router.post('/init', (req, res) => {
  try {
    const { creatorName, philosophy } = req.body;

    if (!creatorName) {
      return res.status(400).json({
        ok: false,
        error: 'creatorName is required'
      });
    }

    manifestoAI = new ManifestoAI(creatorName, philosophy || {});

    res.json({
      ok: true,
      message: 'Manifesto AI initialized',
      creator: creatorName,
      status: 'CREATED'
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * POST /api/manifesto/train
 * Train AI on legacy entries
 */
router.post('/train', (req, res) => {
  try {
    if (!manifestoAI) {
      return res.status(400).json({
        ok: false,
        error: 'AI not initialized. Call /init first.'
      });
    }

    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'entries array is required'
      });
    }

    // Train on entries
    const voiceProfile = manifestoAI.trainOnEntries(entries);

    res.json({
      ok: true,
      message: 'AI trained on entries',
      voiceProfile: {
        trained: voiceProfile.trained,
        entriesAnalyzed: voiceProfile.entriesAnalyzed,
        hash: voiceProfile.hash,
        characteristics: voiceProfile.uniqueCharacteristics
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
 * GET /api/manifesto/voice-profile
 * Get the AI's learned voice profile
 */
router.get('/voice-profile', (req, res) => {
  try {
    if (!manifestoAI) {
      return res.status(400).json({
        ok: false,
        error: 'AI not initialized'
      });
    }

    res.json({
      ok: true,
      voiceProfile: manifestoAI.voiceProfile
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * POST /api/manifesto/ask
 * Ask the AI a question
 * Get response in creator's voice
 */
router.post('/ask', async (req, res) => {
  try {
    if (!manifestoAI) {
      return res.status(400).json({
        ok: false,
        error: 'AI not initialized'
      });
    }

    if (!manifestoAI.voiceProfile.trained) {
      return res.status(400).json({
        ok: false,
        error: 'AI not trained yet. Call /train first.'
      });
    }

    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({
        ok: false,
        error: 'question is required'
      });
    }

    const response = await manifestoAI.respond(question, context || {});

    res.json({
      ok: true,
      response
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/manifesto/philosophy
 * Get the AI's extracted philosophy
 */
router.get('/philosophy', (req, res) => {
  try {
    if (!manifestoAI) {
      return res.status(400).json({
        ok: false,
        error: 'AI not initialized'
      });
    }

    res.json({
      ok: true,
      philosophy: manifestoAI.philosophy
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/manifesto/decisions
 * Get documented decisions
 */
router.get('/decisions', (req, res) => {
  try {
    if (!manifestoAI) {
      return res.status(400).json({
        ok: false,
        error: 'AI not initialized'
      });
    }

    res.json({
      ok: true,
      decisions: manifestoAI.decisions
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * POST /api/manifesto/resurrect
 * Creator has passed - AI becomes fully autonomous
 */
router.post('/resurrect', async (req, res) => {
  try {
    if (!manifestoAI) {
      return res.status(400).json({
        ok: false,
        error: 'AI not initialized'
      });
    }

    const { deathProof } = req.body;

    if (!deathProof) {
      return res.status(400).json({
        ok: false,
        error: 'deathProof is required'
      });
    }

    const result = await manifestoAI.onResurrection(deathProof);

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
 * POST /api/manifesto/learn
 * After death: AI learns from new entries
 * Can improve and evolve
 */
router.post('/learn', async (req, res) => {
  try {
    if (!manifestoAI) {
      return res.status(400).json({
        ok: false,
        error: 'AI not initialized'
      });
    }

    const { entry } = req.body;

    if (!entry) {
      return res.status(400).json({
        ok: false,
        error: 'entry is required'
      });
    }

    const result = await manifestoAI.learn(entry);

    res.json({
      ok: true,
      learning: result
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/manifesto/status
 * Get current AI status
 */
router.get('/status', (req, res) => {
  try {
    if (!manifestoAI) {
      return res.json({
        ok: true,
        status: {
          initialized: false,
          message: 'AI not initialized'
        }
      });
    }

    res.json({
      ok: true,
      status: {
        creator: manifestoAI.creatorName,
        initialized: true,
        trained: manifestoAI.voiceProfile.trained,
        isAlive: manifestoAI.isAlive,
        isEvolving: manifestoAI.evolving,
        entriesCount: manifestoAI.entries.length,
        decisionsCount: manifestoAI.decisions.length,
        voiceHash: manifestoAI.voiceProfile.hash
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
 * GET /api/manifesto/export
 * Export complete AI state
 */
router.get('/export', (req, res) => {
  try {
    if (!manifestoAI) {
      return res.status(400).json({
        ok: false,
        error: 'AI not initialized'
      });
    }

    const aiState = manifestoAI.export();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="manifesto-ai.json"');
    res.json(aiState);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/manifesto/verify
 * Verify AI integrity
 */
router.get('/verify', (req, res) => {
  try {
    if (!manifestoAI) {
      return res.status(400).json({
        ok: false,
        error: 'AI not initialized'
      });
    }

    const verification = manifestoAI.verify();

    res.json({
      ok: true,
      verification
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

module.exports = router;
