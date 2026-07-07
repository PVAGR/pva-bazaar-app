const express = require('express');
const User = require('../models/User');
const VotingWallet = require('../models/VotingWallet');

const router = express.Router();

/**
 * Voting Authentication Routes
 * Lightweight email-based registration for prediction markets
 * No wallet required - can participate with email only
 */

/**
 * POST /api/voting/register
 * Create voting account with email only
 * Expects: { email, name }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name required' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // User already registered - check if voting profile exists
      if (!user.votingProfile) {
        user.votingProfile = {
          emailVerified: false,
          governanceToken: false,
        };
      }
    } else {
      // Create new user (voting only)
      user = new User({
        email,
        name,
        username: email.split('@')[0],
        password: require('crypto').randomBytes(32).toString('hex'), // Random password, not used
        votingProfile: {
          emailVerified: false,
          governanceToken: false,
        },
      });
    }

    await user.save();

    // Ensure voting wallet exists
    let wallet = await VotingWallet.findOne({ userId: user._id });
    if (!wallet) {
      wallet = new VotingWallet({
        userId: user._id,
        userEmail: email,
      });
      await wallet.save();
    }

    console.log(`[INFO] Send verification email to ${email}`);

    res.status(201).json({
      message: 'Account created. Check email for verification link.',
      userId: user._id,
      email: user.email,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/voting/verify-email
 * Verify email with one-time link
 * Expects: { token }
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    console.log(`[INFO] Verify email token: ${token}`);

    // In production:
    // 1. Check token in Redis/cache with expiry
    // 2. Match to user email
    // 3. Mark votingProfile.emailVerified = true

    res.json({
      message: 'Email verified',
      verified: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/voting/verify-passport
 * Submit passport/KYC for verification
 * Expects: { documentType, documentNumber, countryOfIssue, dateOfBirth }
 */
router.post('/verify-passport', async (req, res) => {
  try {
    const { documentType, documentNumber, countryOfIssue, dateOfBirth } = req.body;

    if (!documentType || !documentNumber || !countryOfIssue) {
      return res.status(400).json({ error: 'Missing document details' });
    }

    console.log(`[INFO] Submit KYC for document ${documentNumber}`);

    res.json({
      message: 'KYC submission received. Verification in progress.',
      status: 'pending',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/voting/verify-status
 * Get verification status for authenticated user
 */
router.get('/verify-status', async (req, res) => {
  try {
    // Allow anonymous access - client can check their own status
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.votingProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      email: user.email,
      emailVerified: user.votingProfile.emailVerified,
      passportVerified: user.votingProfile.passportVerified,
      kycStatus: user.votingProfile.kycStatus,
      governanceToken: user.votingProfile.governanceToken,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
