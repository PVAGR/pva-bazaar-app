const express = require('express');
const router = express.Router();
const Artifact = require('../models/Artifact');
const { authenticateToken } = require('../middleware/auth');
const Order = require('../models/Order');
const { createFractionalEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

// GET /api/transactions?limit=5 - Recent transactions (mocked for now)
router.get('/', authenticateToken, async (req, res) => {
	try {
		const limit = Math.min(parseInt(req.query.limit, 10) || 5, 100);
		
		// Get user's orders (as buyer)
		const buyOrders = await Order.find({ buyerId: req.user.id })
			.sort({ createdAt: -1 })
			.limit(limit)
			.select('_id itemSnapshot amountTotal currency createdAt paymentStatus')
			.lean();
		
		// Get user's sales (as seller/creator)
		const sellOrders = await Order.find({ 'attribution.creatorId': req.user.id })
			.sort({ createdAt: -1 })
			.limit(limit)
			.select('_id itemSnapshot amountTotal currency createdAt paymentStatus')
			.lean();
		
		// Combine and sort by date
		const txs = [
			...buyOrders.map(order => ({
				_id: order._id,
				type: 'buy',
				title: order.itemSnapshot?.name || 'Purchase',
				amount: order.amountTotal,
				currency: order.currency,
				date: order.createdAt,
				status: order.paymentStatus
			})),
			...sellOrders.map(order => ({
				_id: order._id,
				type: 'sell',
				title: order.itemSnapshot?.name || 'Sale',
				amount: order.amountTotal,
				currency: order.currency,
				date: order.createdAt,
				status: order.paymentStatus
			}))
		].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
		
		res.json(txs);
	} catch (err) {
		res.status(500).json({ ok: false, message: err.message });
	}
});

// POST /api/transactions/shares/buy - Buy shares
router.post('/shares/buy', authenticateToken, async (req, res) => {
	try {
		const { artifactId, wallet, amountUSD, shares } = req.body || {};
		const sharesNum = parseInt(shares, 10);
		if (!artifactId || !wallet || !sharesNum || sharesNum < 1) {
			return res.status(400).json({ ok: false, message: 'Artifact ID, wallet, and a positive integer share count are required' });
		}
		const artifact = await Artifact.findById(artifactId);
		if (!artifact) {
			return res.status(404).json({ ok: false, message: 'Artifact not found' });
		}
		if (!artifact.fractionalization?.enabled) {
			return res.status(400).json({ ok: false, message: 'Shares not enabled for this artifact' });
		}
		const current = artifact.fractionalization.soldShares || 0;
		const total = artifact.fractionalization.totalShares || 0;
		if (current + sharesNum > total) {
			return res.status(400).json({ ok: false, message: 'Not enough shares available' });
		}
		artifact.fractionalization.soldShares = current + sharesNum;
		await artifact.save();

		// Dispatch fractional purchase event (non-blocking)
		dispatchToOpenClaw(createFractionalEvent('share_purchased', artifact, {
			totalShares: total,
			sharesPurchased: sharesNum,
			sharePrice: artifact.fractionalization.sharePrice || 0,
			buyerId: wallet,
		}, { amountUSD: amountUSD || 0, wallet })).catch(() => {});

		res.json({ ok: true, message: 'Shares purchased successfully', data: { artifactId, newSoldShares: artifact.fractionalization.soldShares, amountUSD: amountUSD || 0, buyer: wallet } });
	} catch (error) {
		console.error('Share purchase error:', error);
		res.status(500).json({ ok: false, message: 'Failed to purchase shares' });
	}
});

// GET /api/transactions/shares/status/:id - Get shares status
router.get('/shares/status/:id', async (req, res) => {
	try {
		const artifact = await Artifact.findById(req.params.id);
		if (!artifact) {
			return res.status(404).json({ ok: false, message: 'Artifact not found' });
		}
		res.json({ ok: true, data: { enabled: !!artifact.fractionalization?.enabled, totalShares: artifact.fractionalization?.totalShares || 0, soldShares: artifact.fractionalization?.soldShares || 0, sharePrice: artifact.fractionalization?.sharePrice || 0, majorityThreshold: artifact.fractionalization?.majorityThreshold || 0 } });
	} catch (error) {
		console.error('Shares status error:', error);
		res.status(500).json({ ok: false, message: 'Failed to get shares status' });
	}
});

module.exports = router;
