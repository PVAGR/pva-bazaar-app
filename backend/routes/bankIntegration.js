const express = require('express');
const crypto = require('crypto');
const BankAccount = require('../models/BankAccount');
const PaymentSplit = require('../models/PaymentSplit');
const paymentSplitService = require('../services/paymentSplitService');

const router = express.Router();

/**
 * Middleware: Require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * GET /api/payouts/bank-account
 * Get user's current bank account
 */
router.get('/bank-account', requireAuth, async (req, res) => {
  try {
    const bankAccount = await BankAccount.findOne({ userId: req.user._id })
      .select('-encryptedAccountData') // Don't return encrypted data
      .sort({ createdAt: -1 });

    if (!bankAccount) {
      return res.status(404).json({ message: 'No bank account connected' });
    }

    res.json({
      id: bankAccount._id,
      accountHolderName: bankAccount.accountHolderName,
      bankCountry: bankAccount.bankCountry,
      bankCurrency: bankAccount.bankCurrency,
      settlementFrequency: bankAccount.settlementFrequency,
      settlementStatus: bankAccount.settlementStatus,
      verified: bankAccount.verified,
      transfersProcessed: bankAccount.transfersProcessed,
      totalAmountTransferred: bankAccount.totalAmountTransferred,
      createdAt: bankAccount.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payouts/bank-account
 * Add or update user's bank account
 * Expects: { accountHolderName, bankCountry, bankCurrency, accountNumber, routingNumber, swiftCode }
 */
router.post('/bank-account', requireAuth, async (req, res) => {
  try {
    const { accountHolderName, bankCountry, bankCurrency, accountNumber, routingNumber, swiftCode } = req.body;

    // Validate input
    if (!accountHolderName || !bankCountry || !bankCurrency || !accountNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Encrypt sensitive data
    const encryption_key = process.env.BANK_ACCOUNT_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryption_key, 'hex'), iv);

    const bankData = JSON.stringify({
      accountNumber,
      routingNumber,
      swiftCode,
    });

    let encrypted = cipher.update(bankData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const encryptedAccountData = JSON.stringify({
      v: 1,
      iv: iv.toString('hex'),
      data: encrypted,
      tag: authTag.toString('hex'),
    });

    // Check if bank account already exists
    let bankAccount = await BankAccount.findOne({ userId: req.user._id });

    if (bankAccount) {
      // Update existing
      bankAccount.encryptedAccountData = encryptedAccountData;
      bankAccount.accountHolderName = accountHolderName;
      bankAccount.bankCountry = bankCountry;
      bankAccount.bankCurrency = bankCurrency;
      bankAccount.settlementStatus = 'pending_verification';
      bankAccount.verified = false;
    } else {
      // Create new
      bankAccount = new BankAccount({
        userId: req.user._id,
        encryptedAccountData,
        accountHolderName,
        bankCountry,
        bankCurrency,
        settlementStatus: 'pending_verification',
      });
    }

    await bankAccount.save();

    res.json({
      message: 'Bank account saved. Pending verification.',
      id: bankAccount._id,
      settlementStatus: bankAccount.settlementStatus,
    });
  } catch (error) {
    console.error('[bankIntegration] saveBankAccount error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/payouts/bank-account/:id
 * Update bank account settlement preferences
 */
router.put('/bank-account/:id', requireAuth, async (req, res) => {
  try {
    const { settlementFrequency } = req.body;

    const bankAccount = await BankAccount.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!bankAccount) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    if (settlementFrequency) {
      bankAccount.settlementFrequency = settlementFrequency;
    }

    await bankAccount.save();

    res.json({
      message: 'Bank account updated',
      settlementFrequency: bankAccount.settlementFrequency,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payouts/splits
 * Get user's payment split history
 */
router.get('/splits', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const splits = await PaymentSplit.find({
      'splits.recipientId': req.user._id,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PaymentSplit.countDocuments({
      'splits.recipientId': req.user._id,
    });

    res.json({
      splits: splits.map((s) => ({
        id: s._id,
        sourceAmount: s.sourceAmount,
        sourceCurrency: s.sourceCurrency,
        status: s.status,
        splits: s.splits.filter((sp) => sp.recipientId?.toString() === req.user._id.toString()),
        createdAt: s.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /webhooks/bank
 * Webhook receiver for bank transfer status updates
 * Expects: { transferId, status, amount, timestamp }
 */
router.post('/bank-webhook', async (req, res) => {
  try {
    // Verify webhook secret (if configured)
    const webhookSecret = process.env.BANK_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-bank-signature'];
      if (!signature || !verifyWebhookSignature(req.body, signature, webhookSecret)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { transferId, status, amount, timestamp } = req.body;

    if (!transferId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find and update payment split
    const split = await PaymentSplit.findOne({
      'splits.transferId': transferId,
    });

    if (!split) {
      console.warn(`Webhook received for unknown transfer: ${transferId}`);
      return res.json({ received: true }); // Don't error - allow idempotency
    }

    // Update split status
    const splitIndex = split.splits.findIndex((s) => s.transferId === transferId);
    if (splitIndex >= 0) {
      split.splits[splitIndex].transferStatus = status;
      if (status === 'completed') {
        split.splits[splitIndex].transferedAt = new Date();
      }
    }

    await split.save();

    res.json({ received: true, updated: true });
  } catch (error) {
    console.error('[bankIntegration] processBankWebhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

module.exports = router;
