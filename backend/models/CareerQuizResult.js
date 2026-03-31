const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    optionKey: { type: String, required: true },
  },
  { _id: false },
);

const careerQuizResultSchema = new mongoose.Schema(
  {
    quizVersion: { type: Number, default: 1, index: true },
    personalityType: { type: String, required: true, index: true },
    axisScores: {
      E: { type: Number, default: 0 },
      I: { type: Number, default: 0 },
      S: { type: Number, default: 0 },
      N: { type: Number, default: 0 },
      T: { type: Number, default: 0 },
      F: { type: Number, default: 0 },
      J: { type: Number, default: 0 },
      P: { type: Number, default: 0 },
    },
    riasecScores: {
      R: { type: Number, default: 0 },
      I: { type: Number, default: 0 },
      A: { type: Number, default: 0 },
      S: { type: Number, default: 0 },
      E: { type: Number, default: 0 },
      C: { type: Number, default: 0 },
    },
    topInterests: [{ type: String }],
    confidence: {
      score: { type: Number, default: 0 },
      band: { type: String, default: 'emerging' },
      completion: { type: Number, default: 0 },
      signalStrength: { type: Number, default: 0 },
      axisClarity: { type: Number, default: 0 },
      sectionBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    topDomains: [{ type: String }],
    topCareers: [{ type: String }],
    majorRoles: [{ type: String }],
    supportingRoles: [{ type: String }],
    roleRationale: [
      {
        role: { type: String },
        category: { type: String, enum: ['major', 'supporting'] },
        matchedCodes: [{ type: String }],
        explanation: { type: String },
      },
    ],
    answers: [answerSchema],
  },
  { timestamps: true },
);

careerQuizResultSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model('CareerQuizResult', careerQuizResultSchema);