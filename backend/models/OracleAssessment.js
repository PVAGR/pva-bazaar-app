const mongoose = require('mongoose');

const oracleAssessmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Personal Data
  personalData: {
    fullName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    birthTime: { type: String, required: true },
    birthPlace: { type: String, required: true },
    physicalStats: {
      height: { type: Number },
      weight: { type: Number },
      eyeColor: { type: String },
      hairColor: { type: String },
    },
  },
  
  // Spiritual Profile
  spiritualProfile: {
    meditation: { type: Boolean, default: false },
    spiritualPractices: [{ type: String }],
    significantNumbers: [{ type: Number }],
    animalConnections: [{ type: String }],
    personalSymbols: [{ type: String }],
    lifeGoals: [{ type: String }],
  },
  
  // AI-Generated Results
  results: {
    cosmicSignature: {
      astrological: { type: mongoose.Schema.Types.Mixed },
      numerological: { type: mongoose.Schema.Types.Mixed },
      synthesis: { type: String },
    },
    bodyBlueprint: {
      dietRecommendations: [{ type: String }],
      exerciseGuidance: [{ type: String }],
      wellnessRituals: [{ type: String }],
    },
    uniqueRevelation: {
      hiddenTalents: [{ type: String }],
      lifePURPOSE: { type: String },
      spiritualGifts: [{ type: String }],
      challenges: [{ type: String }],
    },
    goldenPath: {
      immediateSteps: [{ type: String }],
      monthlyGoals: [{ type: String }],
      yearlyVision: { type: String },
      sacredPractices: [{ type: String }],
    },
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

// Update updatedAt on save
oracleAssessmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Index for efficient queries
oracleAssessmentSchema.index({ userId: 1, createdAt: -1 });
oracleAssessmentSchema.index({ status: 1 });

module.exports = mongoose.model('OracleAssessment', oracleAssessmentSchema);
