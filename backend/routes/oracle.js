const express = require('express');
const router = express.Router();
const OracleAssessment = require('../models/OracleAssessment');
const oracleAI = require('../service/oracleAI');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   POST /api/oracle/assessment
 * @desc    Create a new Oracle Assessment
 * @access  Private
 */
router.post('/assessment', authenticateToken, async (req, res) => {
  try {
    const { personalData, spiritualProfile } = req.body;

    // Validate required fields
    if (!personalData || !personalData.fullName || !personalData.birthDate) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: personalData.fullName and personalData.birthDate are required',
      });
    }

    // Create assessment record
    const assessment = new OracleAssessment({
      userId: req.user.id,
      personalData,
      spiritualProfile: spiritualProfile || {},
      status: 'processing',
    });

    await assessment.save();

    // Generate AI assessment asynchronously
    oracleAI.generateAssessment(personalData, spiritualProfile || {})
      .then((results) => {
        assessment.results = results;
        assessment.status = 'completed';
        assessment.completedAt = new Date();
        return assessment.save();
      })
      .catch((error) => {
        console.error('[oracle] generateAssessment error:', error);
        assessment.status = 'failed';
        return assessment.save();
      });

    // Return immediately with pending status
    res.status(202).json({
      ok: true,
      message: 'Assessment created and processing',
      assessment: {
        id: assessment._id,
        status: assessment.status,
        createdAt: assessment.createdAt,
      },
    });
  } catch (error) {
    console.error('[oracle] createAssessment error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to create assessment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/oracle/assessment/:id
 * @desc    Get a specific Oracle Assessment
 * @access  Private
 */
router.get('/assessment/:id', authenticateToken, async (req, res) => {
  try {
    const assessment = await OracleAssessment.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!assessment) {
      return res.status(404).json({
        ok: false,
        error: 'Assessment not found',
      });
    }

    res.json({
      ok: true,
      assessment,
    });
  } catch (error) {
    console.error('[oracle] getAssessment error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch assessment',
    });
  }
});

/**
 * @route   GET /api/oracle/assessments
 * @desc    Get all Oracle Assessments for authenticated user
 * @access  Private
 */
router.get('/assessments', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, skip = 0, status } = req.query;

    const query = { userId: req.user.id };
    if (status) {
      query.status = status;
    }

    const assessments = await OracleAssessment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-results') // Don't send full results in list view
      .lean();

    const total = await OracleAssessment.countDocuments(query);

    res.json({
      ok: true,
      items: assessments,
      total,
      hasMore: skip + assessments.length < total,
    });
  } catch (error) {
    console.error('[oracle] listAssessments error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch assessments',
    });
  }
});

/**
 * @route   POST /api/oracle/assessment/:id/regenerate
 * @desc    Regenerate results for an existing assessment
 * @access  Private
 */
router.post('/assessment/:id/regenerate', authenticateToken, async (req, res) => {
  try {
    const assessment = await OracleAssessment.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!assessment) {
      return res.status(404).json({
        ok: false,
        error: 'Assessment not found',
      });
    }

    assessment.status = 'processing';
    await assessment.save();

    // Regenerate assessment
    oracleAI.generateAssessment(assessment.personalData, assessment.spiritualProfile)
      .then((results) => {
        assessment.results = results;
        assessment.status = 'completed';
        assessment.completedAt = new Date();
        return assessment.save();
      })
      .catch((error) => {
        console.error('[oracle] regenerateAssessment error:', error);
        assessment.status = 'failed';
        return assessment.save();
      });

    res.status(202).json({
      ok: true,
      message: 'Assessment regeneration started',
      assessment: {
        id: assessment._id,
        status: assessment.status,
      },
    });
  } catch (error) {
    console.error('[oracle] regenerateAssessment error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to regenerate assessment',
    });
  }
});

/**
 * @route   DELETE /api/oracle/assessment/:id
 * @desc    Delete an Oracle Assessment
 * @access  Private
 */
router.delete('/assessment/:id', authenticateToken, async (req, res) => {
  try {
    const assessment = await OracleAssessment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!assessment) {
      return res.status(404).json({
        ok: false,
        error: 'Assessment not found',
      });
    }

    res.json({
      ok: true,
      message: 'Assessment deleted successfully',
    });
  } catch (error) {
    console.error('[oracle] deleteAssessment error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete assessment',
    });
  }
});

module.exports = router;
