// backend/models/Event.js - Community events: workshops, webinars, conferences
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // Event details
  title: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true },
  description: { type: String, required: true },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  thumbnail: String,

  // Event type
  eventType: {
    type: String,
    enum: ['workshop', 'webinar', 'market_fair', 'crafting_circle', 'meetup', 'conference', 'class'],
    required: true,
  },

  // Schedule
  startDateTime: { type: Date, required: true, index: true },
  endDateTime: { type: Date, required: true },
  duration: Number, // minutes (calculated)
  timezone: String,
  doesRepeat: { type: Boolean, default: false },
  repeatPattern: String, // "daily", "weekly", "monthly"

  // Format
  format: {
    type: String,
    enum: ['virtual', 'physical', 'hybrid'],
    default: 'virtual',
  },
  location: String, // Physical location if applicable
  address: {
    street: String,
    city: String,
    country: String,
    coordinates: {
      type: { type: String, default: 'Point' },
      coordinates: [Number], // [longitude, latitude]
    },
  },
  meetingLink: String, // Zoom, Google Meet, etc.

  // Attendance
  maxAttendees: Number, // null = unlimited
  registeredUsers: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      registeredAt: Date,
      rsvp: { type: String, enum: ['yes', 'maybe', 'no'], default: 'yes' },
      attended: Boolean,
    },
  ],

  // Content
  agenda: [
    {
      time: String,
      title: String,
      description: String,
      speaker: String,
    },
  ],
  speakerBios: [
    {
      name: String,
      title: String,
      bio: String,
      avatar: String,
      social: {
        twitter: String,
        website: String,
      },
    },
  ],

  // Materials
  recordingUrl: String,
  recordingPermission: { type: Boolean, default: false },
  slides: String,
  handouts: [
    {
      title: String,
      url: String,
    },
  ],

  // Engagement
  tags: [String],
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  categories: [String],

  // Interaction
  discussionThread: mongoose.Schema.Types.ObjectId, // ForumThread
  q_and_a: [
    {
      question: String,
      askerName: String,
      answer: String,
      answeredBy: String,
    },
  ],

  // Requirements
  prerequisites: String,
  materials: [String],
  freeDollarAmount: { type: Number, default: 0 }, // in cents (for sponsored events)

  // Status
  published: { type: Boolean, default: false },
  cancelled: { type: Boolean, default: false },
  cancellationReason: String,

  // Analytics
  views: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  registrationCount: { type: Number, default: 0 },
  attendanceCount: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  reviews: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      rating: Number,
      comment: String,
      ratedAt: Date,
    },
  ],

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
eventSchema.index({ organizer: 1, startDateTime: 1 });
eventSchema.index({ eventType: 1, startDateTime: 1 });
eventSchema.index({ startDateTime: 1 });
eventSchema.index({ published: 1, cancelled: -1 });
eventSchema.index({ 'address.coordinates': '2dsphere' }); // For geo queries

eventSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  // Calculate duration
  if (this.startDateTime && this.endDateTime) {
    this.duration = Math.round((this.endDateTime - this.startDateTime) / (1000 * 60));
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);
