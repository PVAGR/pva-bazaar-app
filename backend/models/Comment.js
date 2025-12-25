const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  blogSlug: { type: String, required: true, index: true },
  authorName: { type: String, default: 'Anonymous' },
  body: { type: String, required: true },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
