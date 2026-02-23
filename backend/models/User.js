const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
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
    },
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
