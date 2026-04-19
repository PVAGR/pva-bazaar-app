const mongoose = require('mongoose');

const federationFactionMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commanderName: { type: String, required: true },
    role: { type: String, enum: ['founder', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const federationFactionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    tag: { type: String, required: true, unique: true, index: true },
    inviteCode: { type: String, required: true, unique: true, index: true },
    founderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: { type: [federationFactionMemberSchema], default: [] },
    memberCount: { type: Number, default: 0 },
    totalPower: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('FederationFaction', federationFactionSchema);
