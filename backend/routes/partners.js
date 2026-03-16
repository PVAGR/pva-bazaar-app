const express = require('express');
const router = express.Router();

// Simple stub for partner submissions; logs and echoes back
router.post('/', async (req, res) => {
  try {
    const { email, name } = req.body || {};
    if (!email || !name) return res.status(400).json({ ok: false, message: 'Missing name or email' });
    console.log('🤝 Partner submission:', { name, email });
    // TODO: Integrate with DB or external contract generation service
    return res.json({ ok: true, message: 'Submission received', data: { name, email } });
  } catch (err) {
    console.error('Partners submission failed:', err);
    return res.status(500).json({ ok: false, message: 'Internal error' });
  }
});

module.exports = router;
