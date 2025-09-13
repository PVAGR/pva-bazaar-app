const express = require('express');
const router = express.Router();
const Artifact = require('../models/Artifact');
const User = require('../models/User');

// GET /api/marketplace/stats - Marketplace stats for dashboard
router.get('/stats', async (req, res) => {
	try {
		const activeListings = await Artifact.countDocuments({ status: 'active' });
		const totalTransactions = 1200000; // TODO: Replace with real transaction count if available
		const satisfactionRate = 98; // TODO: Replace with real satisfaction metric if available
		const totalSellers = await User.countDocuments({ role: 'seller' });
		res.json({ ok: true, activeListings, totalTransactions, satisfactionRate, totalSellers });
	} catch (e) {
		res.status(500).json({ ok: false, error: e.message });
	}
});

// GET /api/categories/counts - Category listing counts
router.get('/categories/counts', async (req, res) => {
	try {
		const categories = ['coffee','jewelry','produce','art','vehicles','services'];
		const data = {};
		for (const cat of categories) {
			data[cat] = await Artifact.countDocuments({ category: new RegExp('^' + cat + '$', 'i'), status: 'active' });
		}
		res.json({ ok: true, data });
	} catch (e) {
		res.status(500).json({ ok: false, error: e.message });
	}
});


const axios = require('axios');

// GET /api/market/crypto - Get cryptocurrency prices
router.get('/crypto', async (req, res) => {
	try {
		// Using CoinGecko free API for crypto prices
		const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
			params: {
				ids: 'bitcoin,ethereum',
				vs_currencies: 'usd',
				include_24hr_change: true
			},
			timeout: 5000 // 5 second timeout
		});

		const data = response.data;

		// Format the response
		const cryptoData = {
			bitcoin: {
				price: data.bitcoin?.usd || 65000,
				change24h: data.bitcoin?.usd_24h_change || 0
			},
			ethereum: {
				price: data.ethereum?.usd || 3400,
				change24h: data.ethereum?.usd_24h_change || 0
			}
		};

		res.json({
			ok: true,
			crypto: cryptoData,
			lastUpdated: new Date().toISOString()
		});
	} catch (err) {
		console.error('Crypto API error:', err.message);

		// Fallback to mock data if API fails
		res.json({
			ok: true,
			crypto: {
				bitcoin: {
					price: 65000,
					change24h: 2.34
				},
				ethereum: {
					price: 3400,
					change24h: -1.23
				}
			},
			lastUpdated: new Date().toISOString(),
			fallback: true
		});
	}
});

// GET /api/market/convert - Convert USD to crypto
router.get('/convert', async (req, res) => {
	try {
		const { amount, from = 'usd', to = 'eth' } = req.query;

		if (!amount || isNaN(amount)) {
			return res.status(400).json({ ok: false, message: 'Valid amount is required' });
		}

		// Get current prices
		const cryptoResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
			params: {
				ids: 'bitcoin,ethereum',
				vs_currencies: 'usd'
			},
			timeout: 5000
		});

		const prices = cryptoResponse.data;

		let convertedAmount;
		if (from === 'usd' && to === 'eth') {
			convertedAmount = parseFloat(amount) / prices.ethereum.usd;
		} else if (from === 'usd' && to === 'btc') {
			convertedAmount = parseFloat(amount) / prices.bitcoin.usd;
		} else {
			return res.status(400).json({ ok: false, message: 'Unsupported conversion' });
		}

		res.json({
			ok: true,
			conversion: {
				from,
				to,
				amount: parseFloat(amount),
				convertedAmount: Math.round(convertedAmount * 1000000) / 1000000, // Round to 6 decimal places
				rate: prices[to === 'eth' ? 'ethereum' : 'bitcoin'].usd
			}
		});
	} catch (err) {
		console.error('Conversion error:', err);
		res.status(500).json({ ok: false, message: 'Conversion failed' });
	}
});

module.exports = router;
