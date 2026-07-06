const mongoose = require('mongoose');

const adminRuntimeConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    openclaw: {
      gatewayUrl: { type: String, default: '' },
      webhookUrl: { type: String, default: '' },
      healthUrl: { type: String, default: '' },
      ollamaBaseUrl: { type: String, default: '' },
      ollamaModel: { type: String, default: '' },
      apiKey: { type: String, default: '' },
      bridgeSecret: { type: String, default: '' },
      autonomousEnabled: { type: Boolean, default: true },
      autonomousBountyScanMinutes: { type: Number, default: 30 },
      autonomousKeepaliveMinutes: { type: Number, default: 10 },
      autonomousMoneyRunEnabled: { type: Boolean, default: false },
      workerName: { type: String, default: 'openclaw-queue-dispatcher' },
      workerPollMs: { type: Number, default: 10000 },
      workerBatchSize: { type: Number, default: 15 },
    },
    payoutPolicy: {
      minUsd: { type: Number, default: 5 },
      maxUsd: { type: Number, default: 50000 },
      minSol: { type: Number, default: 0.001 },
      maxSol: { type: Number, default: 50 },
      requireAllowlist: { type: Boolean, default: false },
      walletAllowlist: { type: [String], default: [] },
      network: { type: String, default: 'devnet' },
      treasuryWallet: { type: String, default: '' },
      notes: { type: String, default: '' },
    },
    auditTrail: {
      type: [
        {
          at: { type: Date, default: Date.now },
          actor: { type: String, default: 'unknown-admin' },
          action: { type: String, default: 'update' },
          digest: { type: String, default: '' },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('AdminRuntimeConfig', adminRuntimeConfigSchema);
