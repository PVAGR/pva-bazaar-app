const VotingMarket = require('../models/VotingMarket');
const VotingBet = require('../models/VotingBet');
const VotingWallet = require('../models/VotingWallet');
const paymentSplitService = require('./paymentSplitService');

/**
 * Voting Resolution Service
 * Handles market resolution, payout calculation, and winner settlement
 */

/**
 * Resolve a voting market
 * @param {string} marketId - Market ID
 * @param {number} correctOutcomeIndex - Index of winning outcome
 * @param {string} source - 'admin' | 'oracle' | 'crowd_consensus'
 * @param {string} resolvedBy - User ID of admin
 * @returns {object} Updated market
 */
async function resolveMarket(marketId, correctOutcomeIndex, source = 'admin', resolvedBy) {
  const market = await VotingMarket.findById(marketId);
  if (!market) {
    throw new Error('Market not found');
  }

  if (market.status === 'resolved') {
    throw new Error('Market already resolved');
  }

  // Validate outcome index
  if (correctOutcomeIndex < 0 || correctOutcomeIndex >= market.outcomes.length) {
    throw new Error(`Invalid outcome index: ${correctOutcomeIndex}`);
  }

  // Update market
  market.resolution.correctOutcomeIndex = correctOutcomeIndex;
  market.resolution.correctOutcomeLabel = market.outcomes[correctOutcomeIndex].label;
  market.resolution.source = source;
  market.resolution.resolvedAt = new Date();
  market.resolution.resolvedBy = resolvedBy;
  market.status = 'resolved';

  await market.save();

  return market;
}

/**
 * Calculate payouts for market winners
 * @param {string} marketId - Market ID
 * @returns {array} Array of { userId, betId, winnings, payoutStatus }
 */
async function calculatePayouts(marketId) {
  const market = await VotingMarket.findById(marketId);
  if (!market || !market.resolution.correctOutcomeIndex) {
    throw new Error('Market not resolved or invalid outcome');
  }

  // Get all bets on this market
  const bets = await VotingBet.find({ marketId, status: 'active' });

  // Find winners and losers
  const winners = bets.filter((b) => b.outcomeIndex === market.resolution.correctOutcomeIndex);
  const losers = bets.filter((b) => b.outcomeIndex !== market.resolution.correctOutcomeIndex);

  // Calculate payouts based on method
  const results = [];

  if (market.payoutRule.method === 'equal_split') {
    // All winners split equal share of pool
    const winnerShare = (market.totalPoolCents * market.payoutRule.winner_share_pct) / 100;
    const perWinnerPayout = Math.floor(winnerShare / Math.max(winners.length, 1));

    for (const winner of winners) {
      results.push({
        userId: winner.userId,
        betId: winner._id,
        amountBet: winner.amountCents,
        winnings: perWinnerPayout,
        method: 'equal_split',
      });

      // Update bet
      winner.isWinner = true;
      winner.winnings = perWinnerPayout;
      winner.payoutStatus = 'calculated';
      await winner.save();
    }
  } else if (market.payoutRule.method === 'odds_based') {
    // Payouts based on odds (proportional returns)
    const winningOutcome = market.outcomes[market.resolution.correctOutcomeIndex];
    const oddsMultiplier = winningOutcome.odds || 1;

    for (const winner of winners) {
      const winnings = Math.floor(winner.amountCents * (oddsMultiplier - 1) * (market.payoutRule.winner_share_pct / 100));

      results.push({
        userId: winner.userId,
        betId: winner._id,
        amountBet: winner.amountCents,
        winnings,
        method: 'odds_based',
      });

      winner.isWinner = true;
      winner.winnings = winnings;
      winner.payoutStatus = 'calculated';
      await winner.save();
    }
  }

  // Mark losers
  for (const loser of losers) {
    loser.isWinner = false;
    loser.winnings = 0;
    loser.payoutStatus = 'calculated';
    await loser.save();
  }

  return results;
}

/**
 * Process payouts for winners (actually transfer funds)
 * @param {string} marketId - Market ID
 */
async function processPayouts(marketId) {
  const market = await VotingMarket.findById(marketId);
  if (!market) {
    throw new Error('Market not found');
  }

  // Get calculated payouts
  const winnerBets = await VotingBet.find({
    marketId,
    isWinner: true,
    payoutStatus: 'calculated',
  });

  for (const bet of winnerBets) {
    try {
      // Create payment split for winner payout
      const split = await paymentSplitService.createPaymentSplit({
        orderId: null, // Not tied to order
        sourceAmount: bet.winnings,
        sourceCurrency: bet.currency,
        sourceType: 'voting_payout',
        splits: [
          {
            recipientType: 'winner',
            recipientId: bet.userId,
            recipientEmail: bet.userEmail,
            percentage: 100,
            amountCents: bet.winnings,
            destinationType: 'wallet', // or bank_account if user has connected
            transferStatus: 'pending',
          },
        ],
      });

      // Process the split
      await paymentSplitService.processPaymentSplits(split);

      // Update voting wallet
      await VotingWallet.findOneAndUpdate(
        { userId: bet.userId },
        {
          $inc: { availableBalance: bet.winnings, totalWon: bet.winnings },
        }
      );

      // Update bet
      bet.payoutStatus = 'completed';
      bet.settledAt = new Date();
      bet.status = 'settled';
      await bet.save();
    } catch (error) {
      console.error(`Error processing payout for bet ${bet._id}:`, error.message);
      bet.payoutStatus = 'failed';
      await bet.save();
    }
  }
}

/**
 * Auto-resolve markets that are past their end time (for Cron job)
 * Resolves markets with 'live' status that have passed endTime
 */
async function autoResolveExpiredMarkets() {
  const now = new Date();

  // Find markets that are live but past their end time
  const expiredMarkets = await VotingMarket.find({
    status: 'live',
    'votingWindow.endsAt': { $lt: now },
  });

  console.log(`Found ${expiredMarkets.length} expired markets to lock`);

  for (const market of expiredMarkets) {
    try {
      // Lock market (prevent new bets)
      market.status = 'locked';
      await market.save();

      console.log(`Market ${market._id} locked (${expiredMarkets.length} remaining)`);
    } catch (error) {
      console.error(`Error locking market ${market._id}:`, error.message);
    }
  }

  return expiredMarkets.length;
}

/**
 * Get market leaderboard (top bettors)
 * @param {string} marketId - Market ID
 * @returns {array} Sorted bets by winnings
 */
async function getMarketLeaderboard(marketId) {
  const bets = await VotingBet.find({ marketId, isWinner: true }).sort({ winnings: -1 }).limit(10);

  return bets.map((b) => ({
    userId: b.userId,
    userEmail: b.userEmail,
    outcome: b.outcomeLabel,
    amountBet: b.amountCents,
    winnings: b.winnings,
    roi: b.winnings > 0 ? ((b.winnings - b.amountCents) / b.amountCents) * 100 : 0,
  }));
}

module.exports = {
  resolveMarket,
  calculatePayouts,
  processPayouts,
  autoResolveExpiredMarkets,
  getMarketLeaderboard,
};
