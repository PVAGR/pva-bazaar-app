// backend/models/Course.js - Knowledge/educational products with enrollment
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // Reference to ProductType
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
    required: true,
    index: true,
  },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Course details
  title: { type: String, required: true },
  description: { type: String, required: true },
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  thumbnailUrl: String,

  // Structure
  modules: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      title: String,
      description: String,
      order: Number,
      lessons: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          title: String,
          description: String,
          duration: Number, // minutes
          videoUrl: String,
          videoTranscript: String,
          downloadMaterial: [
            {
              filename: String,
              url: String,
              mimeType: String,
            },
          ],
          quizzes: [
            {
              question: String,
              options: [String],
              correctAnswer: Number,
              explanation: String,
            },
          ],
          order: Number,
        },
      ],
    },
  ],

  // Enrollment settings
  enrollmentCap: Number, // null = unlimited
  enrolledCount: { type: Number, default: 0 },
  enrolled: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      enrolledAt: Date,
      progressPercentage: { type: Number, default: 0 },
      completedModules: [mongoose.Schema.Types.ObjectId],
      completedLessons: [mongoose.Schema.Types.ObjectId],
      completedAt: Date,
      certificateIssued: { type: Boolean, default: false },
      certificateUrl: String,
      quizScores: [
        {
          lessonId: mongoose.Schema.Types.ObjectId,
          score: Number,
          totalQuestions: Number,
        },
      ],
    },
  ],

  // Certificate settings
  certificateTemplate: String, // HTML template with {{placeholders}}
  certificateIssuable: { type: Boolean, default: true },
  certificateValidityDays: { type: Number, default: 365 }, // null = never expires

  // Pricing
  price: { type: Number, required: true }, // cents
  salePrice: Number,
  drip: {
    enabled: { type: Boolean, default: false },
    releaseNewModuleEvery: Number, // days
  },

  // Reviews and ratings
  ratings: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      ratedAt: Date,
      helpful: { type: Number, default: 0 },
    },
  ],
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },

  // Analytics
  totalLessons: Number,
  totalDuration: Number, // minutes
  completionRate: { type: Number, default: 0 }, // percentage
  avgTimeSpent: Number, // minutes
  avgQuizScore: Number, // percentage

  // Status
  published: { type: Boolean, default: false },
  publishedAt: Date,

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
courseSchema.index({ creatorId: 1, published: 1 });
courseSchema.index({ productId: 1 });
courseSchema.index({ 'enrolled.userId': 1 });

// Auto-update updatedAt on changes
courseSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  // Calculate total lessons
  this.totalLessons = this.modules?.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0) || 0;
  this.totalDuration =
    this.modules?.reduce(
      (sum, mod) =>
        sum +
        (mod.lessons?.reduce((lessonSum, lesson) => lessonSum + (lesson.duration || 0), 0) || 0),
      0,
    ) || 0;
  next();
});

module.exports = mongoose.model('Course', courseSchema);
