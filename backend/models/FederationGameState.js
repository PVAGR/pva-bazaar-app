const mongoose = require('mongoose');

const federationGameStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    commanderName: { type: String, default: 'Citizen Commander' },
    faction: { type: String, default: 'PVA Collective' },
    cycle: { type: Number, default: 0, min: 0 },
    energy: { type: Number, default: 120, min: 0 },
    food: { type: Number, default: 95, min: 0 },
    materials: { type: Number, default: 80, min: 0 },
    population: { type: Number, default: 14, min: 1 },
    outposts: { type: Number, default: 1, min: 0 },
    keepers: { type: Number, default: 0, min: 0 },
    research: { type: Number, default: 0, min: 0 },
    lastActionAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('FederationGameState', federationGameStateSchema);
