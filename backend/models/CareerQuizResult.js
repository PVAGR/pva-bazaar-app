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
    topDomains: [{ type: String }],
    topCareers: [{ type: String }],
    answers: [answerSchema],
  },
  { timestamps: true },
);

careerQuizResultSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model('CareerQuizResult', careerQuizResultSchema);