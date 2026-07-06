const mongoose = require('mongoose');

const openClawWorkerLeaseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    holderId: { type: String, required: true },
    leaseUntil: { type: Date, required: true },
    heartbeatAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

openClawWorkerLeaseSchema.index({ leaseUntil: 1 });

module.exports = mongoose.model('OpenClawWorkerLease', openClawWorkerLeaseSchema);
