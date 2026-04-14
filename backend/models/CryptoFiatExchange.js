const mongoose = require('mongoose');

/**
 * CryptoFiatExchange Model
 * Caches exchange rates for 5 minutes to avoid rate-limiting
 * Used for crypto-to-fiat conversions
 */

const CryptoFiatExchangeSchema = new mongoose.Schema(
  {
    fromToken: {
      type: String,
      required: true,
      index: true,
    }, // USDC, ETH, SOL, etc.
    toFiat: {
      type: String,
      required: true,
      index: true,
    }, // USD, KES, UGX, etc.
    // Exchange rate (in fiat per token)
    rate: {
      type: Number,
      required: true,
    },
    // Rate source
    provider: {
      type: String,
      enum: ['coingecko', 'chainlink', 'uniswap'],
      default: 'coingecko',
    },
    // Expiration (5 minutes TTL)
    expiresAt: {
      type: Date,
      required: true,
    },
    // Metadata
    source: { type: String, default: 'api' }, // api, contract, amm
    confidence: { type: Number, min: 0, max: 100 }, // 0-100% confidence
  },
  { timestamps: true }
);

// TTL index - automatically delete expired rates after 5 minutes
CryptoFiatExchangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for lookups
CryptoFiatExchangeSchema.index({ fromToken: 1, toFiat: 1 }, { unique: true });

module.exports = mongoose.model('CryptoFiatExchange', CryptoFiatExchangeSchema);
