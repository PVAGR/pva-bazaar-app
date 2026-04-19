const mongoose = require('mongoose');

const federationSectorControlSchema = new mongoose.Schema(
  {
    sector: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    controllerFactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FederationFaction', default: null, index: true },
    controllerFactionTag: { type: String, default: '' },
    controllerFactionName: { type: String, default: '' },
    influence: { type: Number, default: 0 },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('FederationSectorControl', federationSectorControlSchema);
