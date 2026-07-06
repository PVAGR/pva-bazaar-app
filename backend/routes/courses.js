// backend/routes/courses.js - Course enrollment, lessons, and completion
const express = require('express');
const Course = require('../models/Course');
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
 * POST /api/courses - Create a new course (from product)
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

    const course = new Course({
      productId: req.body.productId,
      creatorId: req.user._id,
      title: req.body.title || product.name,
      description: req.body.description || product.description,
      skillLevel: req.body.skillLevel || 'beginner',
      modules: req.body.modules || [],
    });

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:courseId - Get course details
 */
router.get('/:courseId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/courses/:courseId - Update course (creator only)
 */
router.put('/:courseId', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await Course.findByIdAndUpdate(req.params.courseId, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/courses/:courseId/enroll - Enroll in course (requires payment)
 */
router.post('/:courseId/enroll', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check enrollment cap
    if (course.enrollmentCap && course.enrolledCount >= course.enrollmentCap) {
      return res.status(400).json({ error: 'Course enrollment is full' });
    }

    // Check if already enrolled
    const alreadyEnrolled = course.enrolled.some(
      (e) => e.userId.toString() === req.user._id.toString(),
    );
    if (alreadyEnrolled) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Add enrollment
    const enrollmentRecord = {
      userId: req.user._id,
      enrolledAt: new Date(),
      progressPercentage: 0,
      completedModules: [],
      completedLessons: [],
    };

    course.enrolled.push(enrollmentRecord);
    course.enrolledCount = course.enrolledCount || 0;
    course.enrolledCount += 1;

    await course.save();

    res.json({
      message: 'Successfully enrolled in course',
      courseId: course._id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/courses/:courseId/lessons/:lessonId/complete - Mark lesson complete
 */
router.post('/:courseId/lessons/:lessonId/complete', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrollment = course.enrolled.find((e) => e.userId.toString() === req.user._id.toString());
    if (!enrollment) {
      return res.status(404).json({ error: 'Not enrolled in this course' });
    }

    // Add lesson to completed lessons
    if (!enrollment.completedLessons.includes(req.params.lessonId)) {
      enrollment.completedLessons.push(req.params.lessonId);
    }

    // Calculate progress
    const totalLessons =
      course.modules?.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0) || 0;
    enrollment.progressPercentage = Math.round(
      (enrollment.completedLessons.length / totalLessons) * 100,
    );

    await course.save();

    res.json({
      message: 'Lesson marked as complete',
      progressPercentage: enrollment.progressPercentage,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/courses/:courseId/complete - Mark course complete and issue certificate
 */
router.post('/:courseId/complete', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrollment = course.enrolled.find((e) => e.userId.toString() === req.user._id.toString());
    if (!enrollment) {
      return res.status(404).json({ error: 'Not enrolled in this course' });
    }

    // Check if all lessons are completed
    const totalLessons =
      course.modules?.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0) || 0;
    if (enrollment.completedLessons.length < totalLessons) {
      return res.status(400).json({
        error: 'Not all lessons completed',
        completedLessons: enrollment.completedLessons.length,
        totalLessons,
      });
    }

    // Mark completion
    enrollment.completedAt = new Date();

    // Generate certificate URL (mock)
    if (course.certificateIssuable) {
      enrollment.certificateIssued = true;
      enrollment.certificateUrl = `/certificates/${course._id}/${req.user._id}.pdf`;
    }

    await course.save();

    res.json({
      message: 'Course completed',
      certificateUrl: enrollment.certificateUrl,
      issuedAt: enrollment.completedAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/courses/:courseId/rate - Rate/review course
 */
router.post('/:courseId/rate', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if user is enrolled
    const enrollment = course.enrolled.find((e) => e.userId.toString() === req.user._id.toString());
    if (!enrollment) {
      return res.status(403).json({ error: 'Must be enrolled to rate course' });
    }

    // Add or update rating
    const existingRating = course.ratings.findIndex(
      (r) => r.userId.toString() === req.user._id.toString(),
    );

    if (existingRating >= 0) {
      course.ratings[existingRating] = {
        userId: req.user._id,
        rating,
        comment,
        ratedAt: new Date(),
      };
    } else {
      course.ratings.push({
        userId: req.user._id,
        rating,
        comment,
        ratedAt: new Date(),
      });
    }

    // Recalculate average rating
    const avgRating = course.ratings.reduce((sum, r) => sum + r.rating, 0) / course.ratings.length;
    course.averageRating = parseFloat(avgRating.toFixed(1));
    course.reviewCount = course.ratings.length;

    await course.save();

    res.json({
      message: 'Rating submitted',
      averageRating: course.averageRating,
      reviewCount: course.reviewCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:courseId/enrollment-status - Check enrollment status
 */
router.get('/:courseId/enrollment-status', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrollment = course.enrolled.find((e) => e.userId.toString() === req.user._id.toString());

    res.json({
      isEnrolled: !!enrollment,
      enrollment: enrollment || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
