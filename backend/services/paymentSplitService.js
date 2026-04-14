const axios = require('axios');
const PaymentSplit = require('../models/PaymentSplit');
const CryptoFiatExchange = require('../models/CryptoFiatExchange');
const BankAccount = require('../models/BankAccount');

/**
 * Payment Split Service
 * Handles splitting payments between artist, platform, and intermediaries
 * Manages crypto-to-fiat conversions and bank transfers
 */

/**
 * Calculate payment split percentages
 * @param {number} amountCents - Total amount in cents
 * @param {object} splits - { artisan: 50, platform: 35, intermediary: 15 }
 * @returns {object} Breakdown of each recipient's amount
 */
function calculateSplit(amountCents, splits = {}) {
  const artisanPct = splits.artisan || 50;
  const platformPct = splits.platform || 35;
  const intermediaryPct = splits.intermediary || 15;

  // Validate percentages add up to 100
  if (artisanPct + platformPct + intermediaryPct !== 100) {
    throw new Error('Split percentages must add up to 100');
  }

  return {
    artisan: Math.floor(amountCents * (artisanPct / 100)),
    platform: Math.floor(amountCents * (platformPct / 100)),
    intermediary: Math.floor(amountCents * (intermediaryPct / 100)),
  };
}

/**
 * Get or cache crypto-to-fiat exchange rate
 * @param {string} fromToken - USDC, ETH, etc.
 * @param {string} toFiat - USD, KES, UGX, etc.
 * @param {string} provider - coingecko, chainlink, uniswap
 * @returns {object} { rate, provider, expiresAt }
 */
async function getCachedExchangeRate(fromToken, toFiat, provider = 'coingecko') {
  // Check cache first (non-expired)
  const cached = await CryptoFiatExchange.findOne({
    fromToken,
    toFiat,
    expiresAt: { $gt: new Date() },
  });

  if (cached) {
    return {
      rate: cached.rate,
      provider: cached.provider,
      expiresAt: cached.expiresAt,
      fromCache: true,
    };
  }

  // Fetch fresh rate
  const rate = await fetchExchangeRate(fromToken, toFiat, provider);

  // Cache for 5 minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await CryptoFiatExchange.create({
    fromToken,
    toFiat,
    rate,
    provider,
    expiresAt,
    confidence: 90,
  });

  return {
    rate,
    provider,
    expiresAt,
    fromCache: false,
  };
}

/**
 * Fetch exchange rate from external provider
 * @param {string} fromToken - USDC, ETH, etc.
 * @param {string} toFiat - USD, KES, UGX, etc.
 * @param {string} provider - coingecko, chainlink, uniswap
 * @returns {number} Exchange rate
 */
async function fetchExchangeRate(fromToken, toFiat, provider = 'coingecko') {
  try {
    if (provider === 'coingecko') {
      return await fetchCoinGeckoRate(fromToken, toFiat);
    } else if (provider === 'chainlink') {
      // TODO: Implement Chainlink oracle call
      return await fetchCoinGeckoRate(fromToken, toFiat);
    } else if (provider === 'uniswap') {
      // TODO: Implement Uniswap router call
      return await fetchCoinGeckoRate(fromToken, toFiat);
    }
  } catch (error) {
    console.error(`Failed to fetch ${provider} rate for ${fromToken}/${toFiat}:`, error.message);
    throw new Error(`Exchange rate fetch failed: ${error.message}`);
  }
}

/**
 * Fetch rate from CoinGecko free API
 */
async function fetchCoinGeckoRate(fromToken, toFiat) {
  const tokenMap = {
    USDC: 'usd-coin',
    USDT: 'tether',
    DAI: 'dai',
    ETH: 'ethereum',
    BTC: 'bitcoin',
    SOL: 'solana',
  };

  const tokenId = tokenMap[fromToken] || fromToken.toLowerCase();
  const fiatLower = toFiat.toLowerCase();

  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: tokenId,
        vs_currencies: fiatLower,
        cache: 5 * 60, // 5 min cache
      },
      timeout: 5000,
    });

    const rate = response.data?.[tokenId]?.[fiatLower];
    if (!rate) {
      throw new Error(`No rate found for ${tokenId}/${fiatLower}`);
    }

    return rate;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
}

/**
 * Convert crypto amount to fiat using exchange rate
 * @param {number} amountWei - Amount in wei/smallest unit
 * @param {string} fromToken - USDC, ETH
 * @param {string} toFiat - USD, KES, etc.
 * @param {string} provider - coingecko, chainlink, uniswap
 * @returns {object} { amountFiat, rate, fiatCode }
 */
async function convertCryptoToFiat(amountWei, fromToken, toFiat, provider = 'coingecko') {
  const { rate, expiresAt } = await getCachedExchangeRate(fromToken, toFiat, provider);

  // Convert based on token decimals (most tokens use 18 decimals)
  const decimals = fromToken === 'BTC' ? 8 : 18;
  const amountTokens = parseFloat(amountWei) / Math.pow(10, decimals);
  const amountFiat = amountTokens * rate;

  return {
    amountFiat,
    amountFiatCents: Math.floor(amountFiat * 100),
    rate,
    fromToken,
    toFiat,
    rateExpiresAt: expiresAt,
  };
}

/**
 * Initiate bank transfer for payment split recipient
 * @param {object} split - Split record with recipient, amount, bank account
 * @param {object} bankAccount - Encrypted bank account object
 * @returns {object} { transferId, status, initiatedAt }
 */
async function initiateBankTransfer(split, bankAccount) {
  if (!bankAccount || !bankAccount.accountHolderName) {
    throw new Error('Bank account not found or incomplete');
  }

  // TODO: Implement actual bank transfer via Flutterwave/Wise
  // For now, return a mock transfer
  const transferId = `TRANSFER_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  console.log(`[MOCK] Bank transfer initiated: ${transferId}`);
  console.log({
    to: bankAccount.accountHolderName,
    amount: split.amountCents / 100,
    bankCountry: bankAccount.bankCountry,
  });

  return {
    transferId,
    status: 'initiated',
    initiatedAt: new Date(),
    bankCountry: bankAccount.bankCountry,
  };
}

/**
 * Create payment split record
 * @param {object} params - { orderId, sourceAmount, sourceCurrency, sourceType, splits }
 * @returns {object} Created PaymentSplit document
 */
async function createPaymentSplit(params) {
  const {
    orderId,
    stripePaymentIntentId,
    cryptoTxHash,
    sourceAmount,
    sourceCurrency,
    sourceType,
    splits = [],
  } = params;

  const paymentSplit = new PaymentSplit({
    orderId,
    stripePaymentIntentId,
    cryptoTxHash,
    sourceAmount,
    sourceCurrency,
    sourceType,
    splits,
    status: 'draft',
  });

  await paymentSplit.save();
  return paymentSplit;
}

/**
 * Process all splits for a payment
 * Orchestrates crypto conversion, bank transfers, and status tracking
 */
async function processPaymentSplits(paymentSplit) {
  try {
    if (paymentSplit.status !== 'draft') {
      throw new Error(`Cannot process split with status: ${paymentSplit.status}`);
    }

    paymentSplit.status = 'initiated';
    await paymentSplit.save();

    // Process each split
    for (let i = 0; i < paymentSplit.splits.length; i++) {
      const split = paymentSplit.splits[i];

      try {
        if (split.destinationType === 'bank_account' && split.recipientId) {
          // Get bank account from database
          const bankAccount = await BankAccount.findOne({
            userId: split.recipientId,
            settlementStatus: 'active',
          });

          if (!bankAccount) {
            split.transferStatus = 'failed';
            split.failureReason = 'Bank account not found or inactive';
            continue;
          }

          // Initiate transfer
          const transfer = await initiateBankTransfer(split, bankAccount);
          split.transferId = transfer.transferId;
          split.transferStatus = 'processing';
          split.transferedAt = transfer.initiatedAt;

          // Update bank account stats
          await BankAccount.updateOne(
            { _id: bankAccount._id },
            {
              $inc: {
                transfersProcessed: 1,
                totalAmountTransferred: split.amountCents,
              },
              $set: { lastUsedAt: new Date() },
            }
          );
        }
      } catch (error) {
        console.error(`Error processing split for ${split.recipientType}:`, error.message);
        split.transferStatus = 'failed';
        split.failureReason = error.message;
      }
    }

    paymentSplit.status = 'processing';
    await paymentSplit.save();

    return paymentSplit;
  } catch (error) {
    console.error('Payment split processing error:', error);
    paymentSplit.status = 'failed';
    await paymentSplit.save();
    throw error;
  }
}

module.exports = {
  calculateSplit,
  getCachedExchangeRate,
  fetchExchangeRate,
  convertCryptoToFiat,
  initiateBankTransfer,
  createPaymentSplit,
  processPaymentSplits,
};
