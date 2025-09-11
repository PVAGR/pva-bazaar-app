const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Artifact = require('../models/Artifact');
const auth = require('../middleware/auth');

// GET /api/portfolio/:userId - Get user portfolio data
router.get('/:userId', auth, async (req, res) => {
	try {
		const { userId } = req.params;

		// Verify user owns this portfolio or is admin
		if (req.user.id !== userId && req.user.role !== 'admin') {
			return res.status(403).json({ ok: false, message: 'Access denied' });
		}

		// Get user's artifacts (created by this user)
		const userArtifacts = await Artifact.find({ creator: userId });

		// Calculate portfolio metrics
		const totalValue = userArtifacts.reduce((sum, artifact) => sum + (artifact.price || 0), 0);
		const totalSharesSold = userArtifacts.reduce((sum, artifact) => {
			return sum + (artifact.fractionalization?.soldShares || 0);
		}, 0);

		// Mock portfolio gains (in real app, this would track actual investment performance)
		const portfolioGains = totalValue * 0.15; // 15% mock gain

		// Mock allocations (in real app, this would be from user's share holdings)
		const allocations = userArtifacts.slice(0, 3).map((artifact, index) => ({
			name: artifact.name,
			value: artifact.price * (0.8 + Math.random() * 0.4), // Random value around the artifact price
			change: (Math.random() - 0.5) * 20 // Random change between -10% and +10%
		}));

		// Mock recent transactions
		const recentTransactions = [
			{
				type: 'Share Purchase',
				amount: 1250.00,
				date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
				status: 'completed'
			},
			{
				type: 'Dividend Payment',
				amount: 45.50,
				date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
				status: 'completed'
			},
			{
				type: 'Share Sale',
				amount: 890.00,
				date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
				status: 'completed'
			}
		];

		res.json({
			ok: true,
			portfolio: {
				totalValue: Math.round(totalValue * 100) / 100,
				totalGains: Math.round(portfolioGains * 100) / 100,
				totalShares: totalSharesSold,
				allocations,
				recentTransactions,
				artifacts: userArtifacts.length
			}
		});
	} catch (err) {
		console.error('Portfolio error:', err);
		res.status(500).json({ ok: false, message: err.message });
	}
});

// GET /api/portfolio/stats/global - Get global portfolio stats (public)
router.get('/stats/global', async (req, res) => {
	try {
		const totalUsers = await User.countDocuments();
		const totalArtifacts = await Artifact.countDocuments();

		// Calculate global metrics
		const artifacts = await Artifact.find();
		const totalValue = artifacts.reduce((sum, artifact) => sum + (artifact.price || 0), 0);
		const totalShares = artifacts.reduce((sum, artifact) => {
			return sum + (artifact.fractionalization?.totalShares || 0);
		}, 0);
		const soldShares = artifacts.reduce((sum, artifact) => {
			return sum + (artifact.fractionalization?.soldShares || 0);
		}, 0);

		res.json({
			ok: true,
			globalStats: {
				totalUsers,
				totalArtifacts,
				totalValue: Math.round(totalValue * 100) / 100,
				totalShares,
				soldShares,
				availableShares: totalShares - soldShares
			}
		});
	} catch (err) {
		console.error('Global stats error:', err);
		res.status(500).json({ ok: false, message: err.message });
	}
});

module.exports = router;
