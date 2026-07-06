// backend/routes/expertise.js - Expert services, bookings, and availability
const express = require('express');
const ExpertService = require('../models/ExpertService');
const ProductType = require('../models/ProductType');

const router = express.Router();

/**
 * Middleware: Require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * POST /api/expertise - Create expert service
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    // Verify product exists and belongs to user
    const product = await ProductType.findById(req.body.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const service = new ExpertService({
      productId: req.body.productId,
      sellerId: req.user._id,
      title: req.body.title || product.name,
      description: req.body.description || product.description,
      expertise: req.body.expertise || [],
      hourlyRate: req.body.hourlyRate || product.price,
      timezone: req.body.timezone || 'UTC',
      workingHours: req.body.workingHours || [],
    });

    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/expertise/:expertiseId - Get expert service details
 */
router.get('/:expertiseId', async (req, res) => {
  try {
    const service = await ExpertService.findById(req.params.expertiseId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/expertise/:expertiseId - Update service (owner only)
 */
router.put('/:expertiseId', requireAuth, async (req, res) => {
  try {
    const service = await ExpertService.findById(req.params.expertiseId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (service.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await ExpertService.findByIdAndUpdate(req.params.expertiseId, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/expertise/:expertiseId/book - Book an expert session
 */
router.post('/:expertiseId/book', requireAuth, async (req, res) => {
  try {
    const service = await ExpertService.findById(req.params.expertiseId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const { startTime, duration } = req.body;
    if (!startTime || !duration) {
      return res.status(400).json({ error: 'startTime and duration required' });
    }

    // Validate duration
    if (duration < service.minBookingHours) {
      return res.status(400).json({
        error: `Minimum booking duration is ${service.minBookingHours} hours`,
      });
    }

    if (service.maxBookingDuration && duration > service.maxBookingDuration) {
      return res.status(400).json({
        error: `Maximum booking duration is ${service.maxBookingDuration} hours`,
      });
    }

    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

    // Check for conflicts
    const hasConflict = service.bookings.some((booking) => {
      if (booking.status === 'cancelled') return false;
      return (
        (startDate >= booking.startTime && startDate < booking.endTime) ||
        (endDate > booking.startTime && endDate <= booking.endTime) ||
        (startDate <= booking.startTime && endDate >= booking.endTime)
      );
    });

    if (hasConflict) {
      return res.status(400).json({ error: 'Time slot is already booked' });
    }

    // Create booking
    const booking = {
      buyerId: req.user._id,
      startTime: startDate,
      endTime: endDate,
      duration,
      status: 'pending',
      meetingLink: req.body.meetingLink,
      notes: req.body.notes,
    };

    service.bookings.push(booking);
    service.totalBookings = (service.totalBookings || 0) + 1;

    await service.save();

    res.status(201).json({
      message: 'Booking request created (pending approval)',
      booking: service.bookings[service.bookings.length - 1],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/expertise/:expertiseId/bookings/:bookingId/confirm - Confirm booking (seller)
 */
router.post('/:expertiseId/bookings/:bookingId/confirm', requireAuth, async (req, res) => {
  try {
    const service = await ExpertService.findById(req.params.expertiseId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (service.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const booking = service.bookings.id(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    booking.status = 'confirmed';
    booking.meetingLink = req.body.meetingLink || booking.meetingLink;

    await service.save();

    res.json({
      message: 'Booking confirmed',
      booking,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/expertise/:expertiseId/bookings/:bookingId/cancel - Cancel booking
 */
router.post('/:expertiseId/bookings/:bookingId/cancel', requireAuth, async (req, res) => {
  try {
    const service = await ExpertService.findById(req.params.expertiseId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const booking = service.bookings.id(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check authorization
    const isSeller = service.sellerId.toString() === req.user._id.toString();
    const isBuyer = booking.buyerId.toString() === req.user._id.toString();

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason;
    booking.cancelledBy = isSeller ? 'seller' : 'buyer';

    // Issue refund if within cancellation window
    if (isBuyer) {
      const hoursUntilStart = (booking.startTime - new Date()) / (1000 * 60 * 60);
      if (hoursUntilStart > service.refundWindow) {
        booking.refundIssued = true;
      }
    }

    await service.save();

    res.json({
      message: 'Booking cancelled',
      booking,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/expertise/:expertiseId/bookings/:bookingId/complete - Mark booking complete & rate
 */
router.post('/:expertiseId/bookings/:bookingId/complete', requireAuth, async (req, res) => {
  try {
    const service = await ExpertService.findById(req.params.expertiseId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const booking = service.bookings.id(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    booking.status = 'completed';
    booking.rating = req.body.rating;
    booking.review = req.body.review;

    // Update service stats
    service.completedBookings = (service.completedBookings || 0) + 1;
    service.totalHoursFilled = (service.totalHoursFilled || 0) + booking.duration;
    service.totalRevenue = (service.totalRevenue || 0) + booking.duration * service.hourlyRate;

    // Recalculate average rating
    const ratings = service.bookings
      .filter((b) => b.status === 'completed' && b.rating)
      .map((b) => b.rating);
    if (ratings.length > 0) {
      service.averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }

    await service.save();

    res.json({
      message: 'Booking completed and rated',
      booking,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/expertise/:expertiseId/availability - Get available slots
 */
router.get('/:expertiseId/availability', async (req, res) => {
  try {
    const service = await ExpertService.findById(req.params.expertiseId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get booked slots
    const bookedSlots = service.bookings
      .filter((b) => b.status !== 'cancelled' && b.startTime >= start && b.endTime <= end)
      .map((b) => ({
        start: b.startTime,
        end: b.endTime,
      }));

    res.json({
      timezone: service.timezone,
      availabilityType: service.availabilityType,
      workingHours: service.workingHours,
      timeOff: service.timeOff,
      bookedSlots,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/expertise/:expertiseId/bookings - Get all bookings (seller only)
 */
router.get('/:expertiseId/bookings', requireAuth, async (req, res) => {
  try {
    const service = await ExpertService.findById(req.params.expertiseId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (service.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ bookings: service.bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
