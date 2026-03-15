const mongoose = require('mongoose');

const openClawAgentConfigSchema = new mongoose.Schema({
  creatorCommands: { type: [String], default: [] },
  goals: { type: [String], default: [] },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'openclaw_agent_config' });

openClawAgentConfigSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('OpenClawAgentConfig', openClawAgentConfigSchema);
