const express = require('express');
const VotingMarket = require('../models/VotingMarket');
const VotingBet = require('../models/VotingBet');
const VotingWallet = require('../models/VotingWallet');
const votingResolutionService = require('../services/votingResolutionService');

const router = express.Router();

/**
 * Middleware: Optional auth (allow guests to view, require auth to bet)
 */
function getUser(req, res, next) {
  // JWT is optional for viewing
  next();
}

function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * GET /api/voting/markets
 * List all voting markets with optional filters
 */
router.get('/markets', getUser, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }

    const markets = await VotingMarket.find(filter)
      .sort({ 'votingWindow.startsAt': -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await VotingMarket.countDocuments(filter);

    // Add user's bet data if authenticated
    let userBets = {};
    if (req.user && req.user._id) {
      const bets = await VotingBet.find({
        userId: req.user._id,
        marketId: { $in: markets.map((m) => m._id) },
      });
      bets.forEach((b) => {
        userBets[b.marketId.toString()] = b;
      });
    }

    res.json({
      markets: markets.map((m) => ({
        id: m._id,
        title: m.title,
        description: m.description,
        category: m.category,
        status: m.status,
        outcomes: m.outcomes,
        totalPool: m.totalPoolCents,
        totalBets: m.totalBets,
        votingWindow: m.votingWindow,
        userBet: userBets[m._id.toString()] ? { outcome: userBets[m._id.toString()].outcomeIndex, amount: userBets[m._id.toString()].amountCents } : null,
      })),
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/voting/markets/:id
 * Get detailed market information
 */
router.get('/markets/:id', getUser, async (req, res) => {
  try {
    const market = await VotingMarket.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    // Get bet stats for each outcome
    const allBets = await VotingBet.aggregate([
      { $match: { marketId: market._id, status: 'active' } },
      { $group: { _id: '$outcomeIndex', count: { $sum: 1 }, totalAmount: { $sum: '$amountCents' } } },
    ]);

    const betStats = {};
    allBets.forEach((stat) => {
      betStats[stat._id] = { count: stat.count, totalAmount: stat.totalAmount };
    });

    // Get user's bet if authenticated
    let userBet = null;
    if (req.user && req.user._id) {
      userBet = await VotingBet.findOne({
        marketId: market._id,
        userId: req.user._id,
      });
    }

    res.json({
      id: market._id,
      title: market.title,
      description: market.description,
      category: market.category,
      imageUrl: market.imageUrl,
      status: market.status,
      outcomes: market.outcomes.map((o, i) => ({
        ...o,
        betStats: betStats[i],
      })),
      totalPool: market.totalPoolCents,
      votingWindow: market.votingWindow,
      resolution: market.resolution,
      payoutRule: market.payoutRule,
      createdBy: market.createdByName,
      userBet: userBet ? {
        outcomeIndex: userBet.outcomeIndex,
        amount: userBet.amountCents,
        isWinner: userBet.isWinner,
        winnings: userBet.winnings,
        placedAt: userBet.createdAt,
      } : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/voting/markets
 * Create new voting market (admin only)
 * Expects: { title, description, category, outcomes, votingWindow }
 */
router.post('/markets', requireAdmin, async (req, res) => {
  try {
    const { title, description, category, outcomes, votingWindow } = req.body;

    if (!title || !outcomes || outcomes.length < 2) {
      return res.status(400).json({ error: 'Market requires title and at least 2 outcomes' });
    }

    const market = new VotingMarket({
      title,
      description,
      category,
      outcomes: outcomes.map((o) => ({
        label: o.label,
        odds: o.odds || 2,
      })),
      votingWindow: {
        startsAt: new Date(votingWindow.startsAt),
        endsAt: new Date(votingWindow.endsAt),
      },
      status: 'draft',
      createdBy: req.user._id,
      createdByName: req.user.name,
    });

    await market.save();

    res.status(201).json({
      message: 'Market created',
      id: market._id,
      status: market.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/voting/markets/:id/status
 * Update market status (admin)
 * Can transition: draft -> live -> locked -> resolved
 */
router.put('/markets/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['live', 'locked', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const market = await VotingMarket.findByIdAndUpdate(
      req.params.id,
      { status, lastModifiedBy: req.user._id },
      { new: true }
    );

    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    res.json({
      message: `Market status updated to ${status}`,
      status: market.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/voting/markets/:id/bet
 * Place a bet on a market outcome
 * Expects: { outcomeIndex, amount }
 */
router.post('/markets/:id/bet', requireAuth, async (req, res) => {
  try {
    const { outcomeIndex, amount } = req.body;

    if (outcomeIndex < 0 || !amount || amount < 100) {
      // Minimum $1 USD (100 cents)
      return res.status(400).json({ error: 'Invalid outcome or amount too small' });
    }

    const market = await VotingMarket.findById(req.params.id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    if (market.status !== 'live') {
      return res.status(400).json({ error: 'Market is not accepting bets' });
    }

    // Check if voting window is open
    const now = new Date();
    if (now < market.votingWindow.startsAt || now > market.votingWindow.endsAt) {
      return res.status(400).json({ error: 'Voting window is closed' });
    }

    // Check if user already has a bet
    const existingBet = await VotingBet.findOne({
      marketId: market._id,
      userId: req.user._id,
    });

    if (existingBet) {
      return res.status(400).json({ error: 'You already have a bet on this market' });
    }

    // Ensure voting wallet exists
    let wallet = await VotingWallet.findOne({ userId: req.user._id });
    if (!wallet) {
      wallet = new VotingWallet({
        userId: req.user._id,
        userEmail: req.user.email,
      });
      await wallet.save();
    }

    // Create bet
    const bet = new VotingBet({
      marketId: market._id,
      userId: req.user._id,
      userEmail: req.user.email,
      outcomeIndex,
      outcomeLabel: market.outcomes[outcomeIndex].label,
      amountCents: amount,
      currency: 'USD',
    });

    await bet.save();

    // Update market stats
    market.outcomes[outcomeIndex].allocation += amount;
    market.outcomes[outcomeIndex].betCount += 1;
    market.totalPoolCents += amount;
    market.totalBets += 1;
    await market.save();

    res.status(201).json({
      message: 'Bet placed',
      betId: bet._id,
      outcome: market.outcomes[outcomeIndex].label,
      amount: amount / 100,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/voting/markets/:id/resolve
 * Resolve market with correct outcome (admin)
 * Expects: { correctOutcomeIndex }
 */
router.post('/markets/:id/resolve', requireAdmin, async (req, res) => {
  try {
    const { correctOutcomeIndex } = req.body;

    // Resolve market
    await votingResolutionService.resolveMarket(req.params.id, correctOutcomeIndex, 'admin', req.user._id);

    // Calculate payouts
    const payouts = await votingResolutionService.calculatePayouts(req.params.id);

    res.json({
      message: 'Market resolved',
      winners: payouts.length,
      correctOutcome: correctOutcomeIndex,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/voting/wallet
 * Get user's voting wallet (prize pool, balance)
 */
router.get('/wallet', requireAuth, async (req, res) => {
  try {
    let wallet = await VotingWallet.findOne({ userId: req.user._id });

    if (!wallet) {
      wallet = new VotingWallet({
        userId: req.user._id,
        userEmail: req.user.email,
      });
      await wallet.save();
    }

    res.json({
      availableBalance: wallet.availableBalance,
      totalWon: wallet.totalWon,
      totalLost: wallet.totalLost,
      totalBet: wallet.totalBet,
      status: wallet.status,
      emailVerified: wallet.emailVerified,
      passportVerified: wallet.passportVerified,
      kycStatus: wallet.kycStatus,
      winRate: wallet.winRate,
      totalMarketsParticipated: wallet.totalMarketsParticipated,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/voting/resolve-markets (Cron endpoint)
 * Auto-resolve expired markets (run daily via Vercel Cron)
 */
router.post('/resolve-markets', async (req, res) => {
  // Verify Cron secret
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const count = await votingResolutionService.autoResolveExpiredMarkets();
    res.json({ locked: count, message: `Locked ${count} expired markets` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
