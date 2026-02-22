const mongoose = require('mongoose');

const partnerSubmissionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  company: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  message: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'contacted', 'approved', 'rejected'],
    default: 'new',
  },
  metadata: {
    source: { type: String, default: 'web-form' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

partnerSubmissionSchema.pre('save', function preSave(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('PartnerSubmission', partnerSubmissionSchema);

