const express = require('express');
const router = express.Router();
const Artifact = require('../models/Artifact');
const auth = require('../middleware/auth');

// Helper function to fetch live crypto prices
async function getCryptoPrices() {
	try {
		// Use https module instead of fetch for better compatibility
		const https = require('https');
		
		return new Promise((resolve, reject) => {
			const req = https.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd', (res) => {
				let data = '';
				
				res.on('data', (chunk) => {
					data += chunk;
				});
				
				res.on('end', () => {
					try {
						const prices = JSON.parse(data);
						resolve({
							bitcoin: prices.bitcoin.usd,
							ethereum: prices.ethereum.usd
						});
					} catch (error) {
						resolve({
							bitcoin: 111000,
							ethereum: 4300
						});
					}
				});
			});
			
			req.on('error', (error) => {
				console.error('Error fetching crypto prices:', error);
				resolve({
					bitcoin: 111000,
					ethereum: 4300
				});
			});
			
			req.setTimeout(5000, () => {
				req.destroy();
				resolve({
					bitcoin: 111000,
					ethereum: 4300
				});
			});
		});
	} catch (error) {
		console.error('Error fetching crypto prices:', error);
		return {
			bitcoin: 111000,
			ethereum: 4300
		};
	}
}

// Get all artifacts
router.get('/', async (req, res) => {
	try {
		const artifacts = await Artifact.find().populate('creator', 'name email');
		res.json({ ok: true, artifacts });
	} catch (err) {
		res.status(500).json({ ok: false, message: err.message });
	}
});

// Get artifact by ID with enhanced data
router.get('/:id', async (req, res) => {
	try {
		const artifact = await Artifact.findById(req.params.id).populate('creator', 'name email');
		if (!artifact) {
			return res.status(404).json({ ok: false, message: 'Artifact not found' });
		}

		// Fetch live crypto prices
		const cryptoPrices = await getCryptoPrices();

		// Calculate mock ratings and reviews (in real app, this would be from a reviews collection)
		const mockRating = (Math.random() * 2 + 3).toFixed(1); // Random rating between 3.0-5.0
		const mockReviewCount = Math.floor(Math.random() * 50) + 10; // Random reviews between 10-60

		// Calculate crypto equivalents using live prices
		const usdPrice = artifact.price;
		const ethEquivalent = (usdPrice / cryptoPrices.ethereum).toFixed(4);
		const btcEquivalent = (usdPrice / cryptoPrices.bitcoin).toFixed(6);

		// Enhanced artifact data
		const enhancedArtifact = {
			...artifact.toObject(),
			rating: parseFloat(mockRating),
			reviewCount: mockReviewCount,
			cryptoPrices: {
				eth: ethEquivalent,
				btc: btcEquivalent
			},
			// Mock transaction history
			transactionHistory: [
				{
					type: 'Mint',
					date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
					value: 'Created'
				},
				{
					type: 'Listed',
					date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
					value: 'Current'
				}
			]
		};

		res.json({ ok: true, artifact: enhancedArtifact });
	} catch (err) {
		res.status(500).json({ ok: false, message: err.message });
	}
});

// Create new artifact (requires authentication)
router.post('/', auth, async (req, res) => {
	try {
		const { name, title, description, imageUrl, price, category, materials, artisan } = req.body;
		const artifact = new Artifact({
			name,
			title,
			description,
			imageUrl,
			price,
			category,
			materials,
			artisan,
			creator: req.user.id,
			physicalSerial: `PVA-${Date.now()}` // Auto-generate serial
		});
		await artifact.save();
		res.status(201).json({ ok: true, artifact });
	} catch (err) {
		res.status(400).json({ ok: false, message: err.message });
	}
});

module.exports = router;
