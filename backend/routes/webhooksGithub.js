const express = require('express');
const crypto = require('crypto');

const router = express.Router();

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function isValidSignature(signatureHeader, rawPayload, secret) {
  if (!signatureHeader || !secret) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawPayload).digest('hex')}`;
  return timingSafeEqualString(signatureHeader, expected);
}

router.get('/github', (_req, res) => {
  res.status(200).json({ ok: true, webhook: 'github' });
});

router.post('/github', (req, res) => {
  const secret = String(process.env.GITHUB_APP_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET || '').trim();
  const signature = String(req.get('x-hub-signature-256') || '').trim();
  const event = String(req.get('x-github-event') || 'unknown').trim();
  const delivery = String(req.get('x-github-delivery') || '').trim();
  const rawPayload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});

  if (secret) {
    if (!signature) {
      return res.status(401).json({ ok: false, error: 'Missing GitHub signature header' });
    }
    if (!isValidSignature(signature, rawPayload, secret)) {
      return res.status(401).json({ ok: false, error: 'Invalid GitHub signature' });
    }
  }

  const action = String(req.body?.action || '').trim() || null;
  const repository = String(req.body?.repository?.full_name || '').trim() || null;

  return res.status(200).json({
    ok: true,
    received: true,
    event,
    delivery: delivery || null,
    action,
    repository,
  });
});

module.exports = router;
