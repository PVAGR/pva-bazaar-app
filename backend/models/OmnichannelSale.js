const mongoose = require('mongoose');

const delistResultSchema = new mongoose.Schema(
  {
    channel: { type: String, required: true },
    status: {
      type: String,
      enum: ['success', 'failed', 'skipped', 'manual_required'],
      default: 'skipped',
    },
    message: { type: String, default: '' },
    externalListingId: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const omnichannelSaleSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artifact', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    saleSource: {
      type: String,
      enum: ['pva', 'ebay', 'etsy', 'amazon', 'facebook', 'shopify', 'manual'],
      required: true,
      default: 'pva',
      index: true,
    },
    externalSaleId: { type: String, default: '', index: true },
    idempotencyKey: { type: String, sparse: true, unique: true },
    paymentMethod: { type: String, enum: ['card', 'crypto', 'manual'], default: 'manual' },
    amountCents: { type: Number, default: 0 },
    currency: { type: String, default: 'usd' },
    buyerEmail: { type: String, default: '' },
    buyerWallet: { type: String, default: '' },
    status: {
      type: String,
      enum: ['received', 'processing', 'completed', 'failed'],
      default: 'received',
    },
    royaltySettlement: {
      amountCents: { type: Number, default: 0 },
      currency: { type: String, default: 'usd' },
      creatorRoyaltyBps: { type: Number, default: 0 },
      creatorRoyaltyCents: { type: Number, default: 0 },
      platformFeeBps: { type: Number, default: 0 },
      platformFeeCents: { type: Number, default: 0 },
      sellerNetCents: { type: Number, default: 0 },
      beneficiaryWallet: { type: String, default: '' },
    },
    sync: {
      delistedChannels: [{ type: String }],
      delistResults: [delistResultSchema],
      syncedAt: Date,
    },
    blockchainReceipt: {
      itemHash: { type: String, default: '' },
      network: { type: String, default: '' },
      contractAddress: { type: String, default: '' },
      tokenId: { type: String, default: '' },
      txHash: { type: String, default: '' },
      mintedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'minted', 'failed', 'skipped'],
        default: 'pending',
      },
      failureReason: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

omnichannelSaleSchema.index({ createdAt: -1, saleSource: 1 });

module.exports = mongoose.model('OmnichannelSale', omnichannelSaleSchema);
