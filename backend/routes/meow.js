const express = require('express');
const adminSession = require('../middleware/adminSession');
const {
  getMeowConfig,
  listAccounts,
  getBalances,
  listTransactions,
  createUsdcTransfer,
  verifyWebhookSignature,
} = require('../services/meowService');

const router = express.Router();

router.get('/health', (_req, res) => {
  const config = getMeowConfig();
  res.json({
    ok: true,
    provider: 'meow',
    enabled: config.enabled,
    env: config.env,
    baseUrl: config.baseUrl,
    configured: {
      apiKey: Boolean(config.apiKey),
      entityId: Boolean(config.entityId),
      accountId: Boolean(config.accountId),
      webhookSecret: Boolean(config.webhookSecret),
    },
  });
});

router.post('/webhooks/meow', async (req, res) => {
  try {
    const config = getMeowConfig();
    const signature = req.headers['x-meow-signature'] || req.headers['x-signature'];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), 'utf8');
    const verification = verifyWebhookSignature({
      config,
      rawBody,
      signatureHeader: signature,
    });

    if (!verification.ok) {
      return res.status(401).json({
        ok: false,
        message: 'Invalid webhook signature',
        reason: verification.reason || 'verification_failed',
      });
    }

    return res.status(200).json({
      ok: true,
      received: true,
      provider: 'meow',
      eventType: req.body?.type || req.body?.event || 'unknown',
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

router.use(adminSession);

router.get('/accounts', async (_req, res) => {
  try {
    const data = await listAccounts(getMeowConfig());
    res.json({ ok: true, data });
  } catch (error) {
    res.status(error.status || 500).json({
      ok: false,
      message: error.message,
      details: error.payload || null,
    });
  }
});

router.get('/balances', async (req, res) => {
  try {
    const accountId = String(req.query.accountId || '').trim() || undefined;
    const data = await getBalances(getMeowConfig(), accountId);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(error.status || 500).json({
      ok: false,
      message: error.message,
      details: error.payload || null,
    });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const accountId = String(req.query.accountId || '').trim() || undefined;
    const query = {
      limit: req.query.limit,
      starting_after: req.query.starting_after,
      ending_before: req.query.ending_before,
      created_after: req.query.created_after,
      created_before: req.query.created_before,
    };
    const data = await listTransactions(getMeowConfig(), accountId, query);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(error.status || 500).json({
      ok: false,
      message: error.message,
      details: error.payload || null,
    });
  }
});

router.post('/transfers/usdc', async (req, res) => {
  try {
    const accountId = String(req.body?.accountId || '').trim() || undefined;
    const payload = req.body?.payload || {};
    const data = await createUsdcTransfer(getMeowConfig(), accountId, payload);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(error.status || 500).json({
      ok: false,
      message: error.message,
      details: error.payload || null,
    });
  }
});

module.exports = router;
