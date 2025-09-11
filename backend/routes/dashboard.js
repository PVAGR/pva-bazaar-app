const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Artifact = require('../models/Artifact');

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
	try {
		// Get user count
		const totalUsers = await User.countDocuments();

		// Get active users (users created in last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const activeUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

		// Get total artifacts value
		const artifacts = await Artifact.find();
		const totalValue = artifacts.reduce((sum, artifact) => sum + (artifact.price || 0), 0);

		// Get total shares sold
		const totalSharesSold = artifacts.reduce((sum, artifact) => {
			return sum + (artifact.fractionalization?.soldShares || 0);
		}, 0);

		// Get transaction count (simulated - in real app this would come from transaction logs)
		const transactionCount = totalSharesSold * 2; // Rough estimate

		res.json({
			ok: true,
			stats: {
				totalUsers,
				activeUsers,
				totalValue: Math.round(totalValue * 100) / 100, // Round to 2 decimal places
				totalSharesSold,
				transactionCount,
				totalArtifacts: artifacts.length
			}
		});
	} catch (err) {
		console.error('Dashboard stats error:', err);
		res.status(500).json({ ok: false, message: err.message });
	}
});

// GET /api/dashboard/recent-activity - Get recent activity
router.get('/recent-activity', async (req, res) => {
	try {
		// Get recent artifacts (last 10)
		const recentArtifacts = await Artifact.find()
			.sort({ createdAt: -1 })
			.limit(10)
			.select('name price createdAt artisan')
			.populate('creator', 'name');

		// Get recent users (last 5)
		const recentUsers = await User.find()
			.sort({ createdAt: -1 })
			.limit(5)
			.select('name createdAt');

		res.json({
			ok: true,
			activity: {
				recentArtifacts,
				recentUsers
			}
		});
	} catch (err) {
		console.error('Recent activity error:', err);
		res.status(500).json({ ok: false, message: err.message });
	}
});

module.exports = router;
