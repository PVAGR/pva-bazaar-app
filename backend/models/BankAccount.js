const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * BankAccount Model
 * Stores encrypted bank account details for artists/vendors
 * Encryption/decryption handled by service layer
 */

const BankAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Bank details (encrypted in storage, decrypted in service)
    encryptedAccountData: {
      type: String,
      required: true,
    },
    accountHolderName: {
      type: String,
      required: true,
    },
    bankCountry: {
      type: String,
      enum: ['KE', 'UG', 'TZ', 'RW', 'ZA', 'NG', 'GH', 'US', 'UK', 'EU'],
      required: true,
    },
    bankCurrency: {
      type: String,
      enum: ['KES', 'UGX', 'TZS', 'RWF', 'ZAR', 'NGN', 'GHS', 'USD', 'GBP', 'EUR'],
      required: true,
    },
    // Settlement preferences
    settlementFrequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly'],
      default: 'immediate',
    },
    settlementStatus: {
      type: String,
      enum: ['active', 'inactive', 'disabled', 'pending_verification'],
      default: 'pending_verification',
    },
    // Crypto preferences for conversions
    cryptoPreferences: {
      preferredStablecoin: { type: String, default: 'USDC' }, // USDC, USDT, DAI
      exchangeRateProvider: {
        type: String,
        enum: ['coingecko', 'chainlink', 'uniswap'],
        default: 'coingecko',
      },
    },
    // Verification
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verificationAttempts: { type: Number, default: 0 },
    // Audit trail
    lastUsedAt: { type: Date },
    transfersProcessed: { type: Number, default: 0 },
    totalAmountTransferred: { type: Number, default: 0 }, // in cents
  },
  { timestamps: true }
);

// Indexes
BankAccountSchema.index({ userId: 1 });
BankAccountSchema.index({ bankCountry: 1, settlementStatus: 1 });
BankAccountSchema.index({ verified: 1, settlementStatus: 1 });
BankAccountSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BankAccount', BankAccountSchema);
