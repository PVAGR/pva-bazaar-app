const mongoose = require("mongoose");

const StripeEventLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, unique: true, required: true },
    type: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StripeEventLog", StripeEventLogSchema);
