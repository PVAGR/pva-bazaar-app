// backend/models/ExpertService.js - Freelance/consultation services with booking
const mongoose = require('mongoose');

const expertServiceSchema = new mongoose.Schema({
  // Reference to ProductType
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
    required: true,
    index: true,
  },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Service details
  title: { type: String, required: true },
  description: { type: String, required: true },
  expertise: [String], // Array of skill tags
  thumbnailUrl: String,

  // Pricing
  hourlyRate: { type: Number, required: true }, // cents
  minBookingHours: { type: Number, default: 1 },
  maxBookingDuration: Number, // hours
  cancellationPolicy: {
    type: String,
    enum: ['flexible', 'moderate', 'strict'],
    default: 'moderate',
  },
  refundWindow: Number, // hours before session to allow cancellation

  // Availability settings
  timezone: { type: String, default: 'UTC' },
  availabilityType: {
    type: String,
    enum: ['calendar', 'hours', 'availability_window'],
    default: 'hours',
  },

  // Working hours template
  workingHours: [
    {
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      },
      startTime: String, // HH:mm format
      endTime: String,
      available: { type: Boolean, default: true },
    },
  ],

  // Custom time off periods
  timeOff: [
    {
      startDate: Date,
      endDate: Date,
      reason: String,
    },
  ],

  // Booking slots
  bookings: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      buyerId: mongoose.Schema.Types.ObjectId,
      orderId: mongoose.Schema.Types.ObjectId,
      startTime: Date,
      endTime: Date,
      duration: Number, // hours
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending',
      },
      meetingLink: String,
      notes: String,
      recordingUrl: String,
      recordingPermission: { type: Boolean, default: false },
      cancellationReason: String,
      cancelledBy: String, // 'seller' or 'buyer'
      refundIssued: { type: Boolean, default: false },
      rating: Number,
      review: String,
    },
  ],

  // Portfolio/testimonials
  portfolioUrls: [String],
  testimonials: [
    {
      clientName: String,
      comment: String,
      rating: { type: Number, min: 1, max: 5 },
      verified: Boolean,
    },
  ],

  // Analytics
  totalBookings: { type: Number, default: 0 },
  completedBookings: { type: Number, default: 0 },
  totalHoursFilled: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  responseTimeMinutes: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 }, // cents

  // Communication preferences
  communicationChannels: {
    zoom: { enabled: Boolean, autoGenerate: Boolean },
    googleMeet: { enabled: Boolean },
    custom: { enabled: Boolean, url: String },
    phone: { enabled: Boolean },
    email: { enabled: Boolean, default: true },
  },

  // Status
  published: { type: Boolean, default: false },
  publishedAt: Date,
  verified: { type: Boolean, default: false },
  verifiedAt: Date,

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
expertServiceSchema.index({ sellerId: 1, published: 1 });
expertServiceSchema.index({ productId: 1 });
expertServiceSchema.index({ expertise: 1 });
expertServiceSchema.index({ 'bookings.buyerId': 1 });
expertServiceSchema.index({ 'bookings.startTime': 1 });

// Auto-update updatedAt on changes
expertServiceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ExpertService', expertServiceSchema);
