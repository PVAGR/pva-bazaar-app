const mongoose = require("mongoose");

const StripeEventLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, unique: true, required: true },
    type: { type: String },
  },
  { timestamps: true }
);

StripeEventLogSchema.index({ eventId: 1 }, { unique: true });

module.exports = mongoose.model("StripeEventLog", StripeEventLogSchema);
