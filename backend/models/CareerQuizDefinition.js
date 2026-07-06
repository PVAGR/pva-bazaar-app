const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
    pole: { type: String, default: '' },
    value: { type: Number },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true },
    axis: { type: String, required: true },
    scale: { type: String, default: 'binary' },
    lowPole: { type: String, default: '' },
    highPole: { type: String, default: '' },
    riasecLow: [{ type: String }],
    riasecHigh: [{ type: String }],
    options: [optionSchema],
  },
  { _id: false },
);

const careerQuizDefinitionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, index: true },
    title: { type: String, required: true },
    intro: { type: String, required: true },
    questions: [questionSchema],
    isActive: { type: Boolean, default: true, index: true },
    updatedBy: { type: String, default: 'admin' },
  },
  { timestamps: true },
);

careerQuizDefinitionSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model('CareerQuizDefinition', careerQuizDefinitionSchema);
