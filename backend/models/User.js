const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true }, // optional; login by username or email
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  profilePicture: { type: String, default: '' },
  twitch: {
    id: { type: String, default: '' },
    login: { type: String, default: '' },
    displayName: { type: String, default: '' },
    connectedAt: { type: Date },
  },
  oauthTokens: {
    // Encrypted provider tokens (never store raw tokens in plaintext).
    // Shape: { [providerKey]: { payload: {v,iv,tag,data}, updatedAt } }
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  onboardingProfile: {
    roleIntent: {
      type: String,
      enum: ['seller', 'consumer', 'creator_artist', 'collector', 'researcher', 'federation_contributor', 'other'],
      default: 'consumer',
    },
    roleOther: { type: String, default: '' },
    appRole: {
      type: String,
      enum: ['seller', 'consumer', 'creator', 'collector', 'researcher', 'contributor', 'other'],
      default: 'consumer',
    },
    personalJourney: { type: String, default: '' },
    federationPathTags: { type: [String], default: [] },
    contactLinks: {
      instagram: { type: String, default: '' },
      telegram: { type: String, default: '' },
      website: { type: String, default: '' },
      other: { type: String, default: '' },
    },
    compliance: {
      legalFullName: { type: String, default: '' },
      legalIdType: { type: String, default: '' },
      legalIdNumber: { type: String, default: '' },
      addressLine1: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
      city: { type: String, default: '' },
      stateProvince: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' },
      phone: { type: String, default: '' },
      identityAttested: { type: Boolean, default: false },
      identityAttestedAt: { type: Date },
      submittedAt: { type: Date },
    },
    trustAndSafety: {
      tradingRestricted: { type: Boolean, default: false },
      publicSafetyNotice: { type: String, default: '' },
      internalCaseNotes: { type: String, default: '' },
    },
    emailPreferences: {
      digestOptIn: { type: Boolean, default: false },
      roleTrackUpdates: { type: Boolean, default: true },
    },
    identity: {
      walletMode: {
        type: String,
        enum: ['none', 'connected', 'generated'],
        default: 'none',
      },
      generatedWalletAddress: { type: String, default: '' },
      generatedWalletAt: { type: Date },
      didEnabled: { type: Boolean, default: false },
      didMethod: { type: String, default: '' },
      ipfsEnabled: { type: Boolean, default: false },
      ipfsCid: { type: String, default: '' },
    },
  },
  preferences: {
    defaultCountry: { type: String, default: '' },
    defaultCurrency: { type: String, default: 'USD' },
    defaultWalletAddress: { type: String, default: '' },
    defaultTags: { type: String, default: '' }, // comma-separated
    defaultStreamPlatform: { type: String, default: 'none' },
    defaultPublicVisibility: { type: Boolean, default: true },
    onboarding: {
      dismissedAt: { type: Date },
      completedAt: { type: Date },
      lastSeenAt: { type: Date },
    },
    drafts: {
      streams: { type: mongoose.Schema.Types.Mixed, default: null },
      deals: { type: mongoose.Schema.Types.Mixed, default: null },
      governance: { type: mongoose.Schema.Types.Mixed, default: null },
    },
  },
  // Voting system profile (for prediction markets)
  votingProfile: {
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    passportVerified: { type: Boolean, default: false },
    passportVerifiedAt: { type: Date },
    passportStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'suspended'],
      default: 'unverified',
    },
    governanceToken: { type: Boolean, default: false }, // can participate in governance/voting
    kycStatus: {
      type: String,
      enum: ['not_started', 'pending', 'verified', 'rejected'],
      default: 'not_started',
    },
    votingWalletId: { type: mongoose.Schema.Types.ObjectId, ref: 'VotingWallet' },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
