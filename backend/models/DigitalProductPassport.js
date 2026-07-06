const mongoose = require('mongoose');
const crypto = require('crypto');

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortObject(value[key]);
    }
    return out;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(sortObject(value));
}

const lifecycleEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'minted',
        'created',
        'harvested',
        'processed',
        'packed',
        'shipped',
        'received',
        'transformed',
        'sold',
        'resold',
        'verified',
        'custom',
      ],
      default: 'custom',
    },
    actorDid: { type: String, default: '' },
    location: { type: String, default: '' },
    notes: { type: String, default: '' },
    txHash: { type: String, default: '' },
    externalRef: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const vcSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    issuerDid: { type: String, default: '' },
    type: [{ type: String }],
    issuanceDate: { type: Date },
    expirationDate: { type: Date },
    credentialSubject: { type: mongoose.Schema.Types.Mixed, default: {} },
    proof: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const digitalProductPassportSchema = new mongoose.Schema(
  {
    passportDid: { type: String, unique: true, required: true, index: true },
    passportVersion: { type: Number, default: 1 },
    passportHash: { type: String, default: '', index: true },

    assetType: {
      type: String,
      enum: ['physical', 'digital', 'hybrid'],
      required: true,
      index: true,
    },
    artifactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artifact',
      index: true,
      sparse: true,
    },
    artifactSlug: { type: String, default: '', index: true },

    productName: { type: String, required: true },
    productCategory: { type: String, default: '' },
    originCountry: { type: String, default: '' },
    originRegion: { type: String, default: '' },

    issuerDid: { type: String, default: '' },
    ownerDid: { type: String, default: '' },

    // Royalty rails can be consumed by smart contract sync tasks.
    royaltyPolicy: {
      basisPoints: { type: Number, default: 1000 },
      split: [
        {
          recipientDid: { type: String, default: '' },
          role: { type: String, default: '' },
          basisPoints: { type: Number, default: 0 },
        },
      ],
      payoutCurrency: { type: String, default: 'USD' },
      payoutRail: {
        type: String,
        enum: ['crypto', 'fiat', 'ussd', 'mixed'],
        default: 'mixed',
      },
    },

    verifiableCredentials: [vcSchema],
    lifecycleEvents: [lifecycleEventSchema],

    ipfsCid: { type: String, default: '' },
    metadataUri: { type: String, default: '' },

    status: {
      type: String,
      enum: ['active', 'archived', 'revoked'],
      default: 'active',
      index: true,
    },
    latestEventAt: { type: Date },
  },
  { timestamps: true },
);

digitalProductPassportSchema.pre('validate', function preValidate(next) {
  if (!this.passportDid) {
    const seed = [
      this.assetType || 'hybrid',
      this.artifactId ? String(this.artifactId) : '',
      this.artifactSlug || '',
      this.productName || '',
      Date.now().toString(36),
      crypto.randomBytes(6).toString('hex'),
    ].join('|');
    const digest = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
    this.passportDid = `did:pva:dpp:${digest}`;
  }
  next();
});

digitalProductPassportSchema.pre('save', function preSave(next) {
  if (Array.isArray(this.lifecycleEvents) && this.lifecycleEvents.length > 0) {
    const last = this.lifecycleEvents[this.lifecycleEvents.length - 1];
    this.latestEventAt = last.occurredAt || new Date();
  }

  const hashPayload = {
    passportDid: this.passportDid,
    assetType: this.assetType,
    artifactId: this.artifactId ? String(this.artifactId) : '',
    artifactSlug: this.artifactSlug,
    productName: this.productName,
    productCategory: this.productCategory,
    originCountry: this.originCountry,
    originRegion: this.originRegion,
    issuerDid: this.issuerDid,
    ownerDid: this.ownerDid,
    royaltyPolicy: this.royaltyPolicy,
    lifecycleEvents: this.lifecycleEvents,
    verifiableCredentials: this.verifiableCredentials,
    ipfsCid: this.ipfsCid,
    metadataUri: this.metadataUri,
    status: this.status,
    passportVersion: this.passportVersion,
  };

  this.passportHash = crypto
    .createHash('sha256')
    .update(stableStringify(hashPayload))
    .digest('hex');

  next();
});

module.exports = mongoose.model('DigitalProductPassport', digitalProductPassportSchema);
