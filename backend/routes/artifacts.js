const express = require('express');
const router = express.Router();
const Artifact = require('../models/Artifact');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { createArtifactEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');
const { buildProvenanceRecord, findDuplicateCandidates } = require('../service/provenanceService');
const {
  lookupReverseImageSignals,
  shouldBlockOnReverseImage,
  buildReverseImageSnapshot,
} = require('../service/reverseImageLookupService');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/artifacts'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  },
});
const upload = multer({ storage });

// Helper function to fetch live crypto prices
async function getCryptoPrices() {
  try {
    // Use https module instead of fetch for better compatibility
    const https = require('https');

    return new Promise((resolve, reject) => {
      const req = https.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
        (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const prices = JSON.parse(data);
              resolve({
                bitcoin: prices.bitcoin.usd,
                ethereum: prices.ethereum.usd,
              });
            } catch (error) {
              resolve({
                bitcoin: 111000,
                ethereum: 4300,
              });
            }
          });
        },
      );

      req.on('error', (error) => {
        console.error('Error fetching crypto prices:', error);
        resolve({
          bitcoin: 111000,
          ethereum: 4300,
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          bitcoin: 111000,
          ethereum: 4300,
        });
      });
    });
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return {
      bitcoin: 111000,
      ethereum: 4300,
    };
  }
}

// Get all artifacts
router.get('/', async (req, res) => {
  try {
    let query = Artifact.find();
    // Trending: sort by soldShares (desc), then createdAt (desc)
    if (req.query.sort === 'trending') {
      query = query.sort({ 'fractionalization.soldShares': -1, createdAt: -1 });
    } else if (req.query.sort === 'newest') {
      query = query.sort({ createdAt: -1 });
    }
    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit) && limit > 0) query = query.limit(limit);
    }
    const artifacts = await query.populate('creator', 'name email');
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
        btc: btcEquivalent,
      },
      // Mock transaction history
      transactionHistory: [
        {
          type: 'Mint',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          value: 'Created',
        },
        {
          type: 'Listed',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          value: 'Current',
        },
      ],
    };

    res.json({ ok: true, artifact: enhancedArtifact });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Create new artifact (requires authentication)
router.post('/', authenticateToken, upload.array('assetPhotos', 6), async (req, res) => {
  try {
    // Parse fields from form-data
    const {
      name,
      title,
      description,
      price,
      salePrice,
      category,
      materials,
      artisan,
      partnerName,
      partnerCode,
      businessLicense,
      partnerWallet,
      partnerAddress,
      promoterName,
      promoterContact,
      artisanShare,
      pvaFee,
      partnerShare,
      insuranceBond,
      artisanWallet,
      digitalSignature,
      agreeTerms,
      network,
    } = req.body;

    // Handle images
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((f) => '/uploads/artifacts/' + f.filename);
    }

    // Build payout and consignment info
    const payoutInfo = {
      artisanWallet,
      partnerWallet,
      promoterName,
      promoterContact,
    };
    const consignment = {
      artisanShare: Number(artisanShare) || 50,
      pvaFee: Number(pvaFee) || 35,
      promoterShare: Number(partnerShare) || 15,
      digitalSignature,
      agreed: agreeTerms === 'true' || agreeTerms === true,
    };

    const artifact = new Artifact({
      name,
      title,
      description,
      imageUrls,
      price,
      salePrice,
      category,
      materials: materials ? (Array.isArray(materials) ? materials : [materials]) : [],
      artisan,
      creator: req.user.id,
      physicalSerial: `PVA-${Date.now()}`,
      payoutInfo,
      consignment,
      blockchainDetails: { network: network || 'base' },
      provenance: buildProvenanceRecord({
        title,
        name,
        description,
        price: Number(price || 0),
        category,
        materials: materials ? (Array.isArray(materials) ? materials : [materials]) : [],
        imageUrls,
        artisan,
        creator: req.user.id,
        network: network || 'base',
        royaltyBps: Number(req.body?.royaltyBps || 1000),
        royaltyWallet: req.body?.royaltyWallet || artisanWallet || '',
        artisanWallet,
      }),
    });

    const duplicates = await findDuplicateCandidates(Artifact, artifact.provenance, 1);
    if (duplicates.some((row) => row.matchType === 'exact')) {
      return res.status(409).json({
        ok: false,
        message: 'Duplicate artifact fingerprint detected',
        duplicates,
      });
    }

    const reverseImage = await lookupReverseImageSignals({
      imageUrls,
      title: title || name,
      category,
    });
    if (shouldBlockOnReverseImage(reverseImage)) {
      return res.status(409).json({
        ok: false,
        message: 'Reverse image lookup detected a likely duplicate',
        reverseImage,
      });
    }

    artifact.provenance = {
      ...(artifact.provenance || {}),
      reverseImage: buildReverseImageSnapshot(reverseImage),
    };

    await artifact.save();

    artifact.provenance = {
      ...(artifact.provenance || {}),
      feedPath: `/marketplace/${encodeURIComponent(artifact.slug || String(artifact._id))}`,
    };
    await artifact.save();
    
    // Dispatch event to OpenClaw (non-blocking)
    try {
      const event = createArtifactEvent('created', artifact, req.user, {
        category: artifact.category,
        materials: artifact.materials,
        price: artifact.price,
        artisan: artifact.artisan,
      });
      dispatchToOpenClaw(event).catch(err => {
        console.error('[OpenClaw] Failed to dispatch artifact.created event:', err.message);
      });
    } catch (err) {
      // Don't fail the request if OpenClaw dispatch fails
      console.error('[OpenClaw] Error creating event:', err.message);
    }
    
    res.status(201).json({ ok: true, artifact, reverseImage });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

module.exports = router;
