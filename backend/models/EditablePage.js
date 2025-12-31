const mongoose = require('mongoose');

const editablePageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  // Store only a hash of the edit secret
  editHashHashed: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

editablePageSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('EditablePage', editablePageSchema);
