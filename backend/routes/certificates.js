const express = require('express');
const router = express.Router();
const Artifact = require('../models/Artifact');

// GET /api/certificates/:id - Get certificate data
router.get('/:id', async (req, res) => {
	try {
		const artifact = await Artifact.findById(req.params.id);
		if (!artifact) {
			return res.status(404).json({ ok: false, message: 'Artifact not found' });
		}
		const certificateData = {
			artifact: {
				name: artifact.name,
				description: artifact.description,
				physicalSerial: artifact.physicalSerial,
				creationDate: artifact.creationDate,
				materials: artifact.materials,
				artisan: artifact.artisan,
				imageUrl: artifact.imageUrl
			},
			blockchain: artifact.blockchainDetails,
			verification: {
				lastVerified: artifact.lastVerification,
				verified: true
			},
			ownership: artifact.ownershipHistory,
			authenticationCode: artifact.authenticationCode
		};
		res.json({ ok: true, data: certificateData });
	} catch (error) {
		console.error('Certificate error:', error);
		res.status(500).json({ ok: false, message: 'Failed to fetch certificate' });
	}
});

// POST /api/certificates/verify/:id - Verify artifact
router.post('/verify/:id', async (req, res) => {
	try {
		const artifact = await Artifact.findById(req.params.id);
		if (!artifact) {
			return res.status(404).json({ ok: false, message: 'Artifact not found' });
		}
		artifact.lastVerification = new Date();
		await artifact.save();
		res.json({ ok: true, message: 'Artifact verified successfully', data: { lastVerification: artifact.lastVerification } });
	} catch (error) {
		console.error('Verification error:', error);
		res.status(500).json({ ok: false, message: 'Failed to verify artifact' });
	}
});

module.exports = router;
