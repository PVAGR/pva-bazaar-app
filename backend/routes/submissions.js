const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  AssetSubmission,
  CertificateSubmission,
  ProvenanceRecord,
  MarketplaceListing,
  PortfolioItem
} = require('../models/Submissions');

// Import validation middleware
const {
  submissionRateLimit,
  validateAssetSubmission,
  validateCertificateSubmission,
  validateProvenanceSubmission,
  addSecurityHeaders,
  validateFileUpload,
  logSubmissionRequest
} = require('../middleware/validation');

// Import the events router to access broadcast function
let eventsRouter;
try {
  eventsRouter = require('./events');
} catch (error) {
  console.warn('Events router not available, real-time updates disabled');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper function to broadcast real-time updates
function broadcastUpdate(type, data) {
  if (eventsRouter && eventsRouter.broadcast) {
    eventsRouter.broadcast(type, data);
  }
}

// POST /api/submissions/asset - Submit new asset
router.post('/asset', 
  addSecurityHeaders,
  submissionRateLimit,
  logSubmissionRequest,
  upload.array('assetPhotos', 5), 
  validateFileUpload,
  validateAssetSubmission,
  async (req, res) => {
  try {
    const assetData = {
      id: uuidv4(),
      contractId: req.body.contractId || `PVA-${Date.now()}`,
      pvaSerial: req.body.pvaSerial || `PVA${Date.now()}`,
      
      // Basic asset info
      name: req.body.name || req.body.assetName,
      description: req.body.description,
      category: req.body.category,
      materials: req.body.materials,
      dimensions: req.body.dimensions,
      weight: req.body.weight,
      origin: req.body.origin,
      
      // Financial info
      physicalValue: parseFloat(req.body.physicalValue) || 0,
      nftPrice: parseFloat(req.body.nftPrice) || 0,
      salePrice: parseFloat(req.body.salePrice) || 0,
      
      // Blockchain info
      tokenId: req.body.tokenId,
      network: req.body.network || 'base',
      ipfsHash: req.body.ipfsHash,
      contractAddress: req.body.contractAddress,
      
      // Artisan info
      artisan: {
        name: req.body.artisanName,
        location: req.body.artisanLocation,
        wallet: req.body.artisanWallet,
        story: req.body.artisanStory,
        share: parseFloat(req.body.artisanShare) || 50
      },
      
      // Partner info
      partner: {
        name: req.body.partnerName,
        code: req.body.partnerCode,
        license: req.body.businessLicense,
        wallet: req.body.partnerWallet,
        address: req.body.partnerAddress,
        commissionRate: parseFloat(req.body.commissionRate) || 15,
        share: parseFloat(req.body.partnerShare) || 15
      },
      
      // Authentication
      authMethod: req.body.authMethod || 'pva',
      qualityGrade: req.body.qualityGrade,
      condition: req.body.condition || 'new',
      labReport: req.body.labReport,
      
      // Images
      images: req.files ? req.files.map(file => `/uploads/${file.filename}`) : [],
      
      // PVA specific
      pvaFee: parseFloat(req.body.pvaFee) || 35,
      
      // Insurance and terms
      insuranceBond: parseFloat(req.body.insuranceBond) || 0,
      agreeTerms: req.body.agreeTerms === 'true' || req.body.agreeTerms === true,
      digitalSignature: req.body.digitalSignature
    };

    // Save to database
    const assetSubmission = new AssetSubmission(assetData);
    await assetSubmission.save();

    // Auto-create marketplace listing if price is set
    if (assetData.salePrice > 0) {
      const marketplaceData = {
        id: uuidv4(),
        assetId: assetData.id,
        title: assetData.name,
        description: assetData.description,
        price: assetData.salePrice,
        category: assetData.category,
        images: assetData.images,
        seller: {
          name: assetData.artisan.name,
          wallet: assetData.artisan.wallet,
          verified: true
        },
        features: {
          materials: assetData.materials,
          origin: assetData.origin,
          condition: assetData.condition,
          authenticated: assetData.authMethod !== 'none'
        }
      };
      
      const marketplaceListing = new MarketplaceListing(marketplaceData);
      await marketplaceListing.save();
    }

    // Broadcast real-time update
    broadcastUpdate('new_asset', {
      id: assetData.id,
      name: assetData.name,
      category: assetData.category,
      artisan: assetData.artisan.name,
      price: assetData.salePrice,
      image: assetData.images[0] || null
    });

    res.json({
      ok: true,
      message: 'Asset submitted successfully',
      data: {
        assetId: assetData.id,
        contractId: assetData.contractId,
        status: 'pending_approval'
      }
    });

  } catch (error) {
    console.error('Asset submission error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to submit asset',
      error: error.message
    });
  }
});

// POST /api/submissions/certificate - Submit certificate
router.post('/certificate', 
  addSecurityHeaders,
  submissionRateLimit,
  logSubmissionRequest,
  upload.single('certificateImage'), 
  validateFileUpload,
  validateCertificateSubmission,
  async (req, res) => {
  try {
    const certificateData = {
      id: uuidv4(),
      contractId: req.body.contractId,
      pvaSerial: req.body.pvaSerial,
      
      // Certificate info
      assetTitle: req.body.assetTitle,
      issueDate: req.body.issueDate || new Date(),
      version: req.body.version || 'v1.0',
      
      // Asset identifiers
      tokenId: req.body.tokenId,
      contractAddress: req.body.contractAddress,
      chain: req.body.chain || 'base',
      ipfsCid: req.body.ipfsCid,
      
      // Physical properties
      species: req.body.species,
      shape: req.body.shape,
      measurements: req.body.measurements,
      weight: req.body.weight,
      color: req.body.color,
      transparency: req.body.transparency,
      enhancements: req.body.enhancements,
      origin: req.body.origin,
      
      // Certification
      mintedBy: req.body.mintedBy,
      creatorWallet: req.body.creatorWallet,
      owner: req.body.owner,
      ownerName: req.body.ownerName,
      ownerWallet: req.body.ownerWallet,
      royalties: req.body.royalties,
      
      // Verification
      pvaSigner: req.body.pvaSigner,
      signDate: req.body.signDate || new Date(),
      verificationUrl: req.body.verificationUrl,
      qrCertificate: req.body.qrCertificate,
      qrAsset: req.body.qrAsset,
      docHash: req.body.docHash,
      
      // Image
      image: req.file ? `/uploads/${req.file.filename}` : null,
      
      // Notes
      metadataNote: req.body.metadataNote,
      notes: req.body.notes
    };

    const certificateSubmission = new CertificateSubmission(certificateData);
    await certificateSubmission.save();

    // Broadcast real-time update
    broadcastUpdate('new_certificate', {
      id: certificateData.id,
      name: certificateData.name,
      species: certificateData.species,
      owner: certificateData.ownerName,
      image: certificateData.image
    });

    res.json({
      ok: true,
      message: 'Certificate submitted successfully',
      data: {
        certificateId: certificateData.id,
        contractId: certificateData.contractId
      }
    });

  } catch (error) {
    console.error('Certificate submission error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to submit certificate',
      error: error.message
    });
  }
});

// POST /api/submissions/provenance - Submit provenance record
router.post('/provenance', async (req, res) => {
  try {
    const provenanceData = {
      id: uuidv4(),
      type: 'provenance',
      timestamp: new Date().toISOString(),
      
      assetId: req.body.assetId,
      contractId: req.body.contractId,
      eventType: req.body.eventType, // creation, transfer, verification, etc.
      description: req.body.description,
      location: req.body.location,
      parties: req.body.parties, // involved parties
      
      // Verification
      verifiedBy: req.body.verifiedBy,
      verificationMethod: req.body.verificationMethod,
      blockchainTxId: req.body.blockchainTxId,
      
      // Additional data
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
    };

    submissions.provenance.push(provenanceData);

    res.json({
      ok: true,
      message: 'Provenance record submitted successfully',
      data: {
        provenanceId: provenanceData.id
      }
    });

  } catch (error) {
    console.error('Provenance submission error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to submit provenance record',
      error: error.message
    });
  }
});

// GET /api/submissions/:type - Get submissions by type
router.get('/:type', async (req, res) => {
  try {
    const type = req.params.type;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const category = req.query.category;

    if (!submissions[type]) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid submission type'
      });
    }

    let data = [...submissions[type]];

    // Filter by status if provided
    if (status) {
      data = data.filter(item => item.status === status);
    }

    // Filter by category if provided
    if (category && type === 'assets') {
      data = data.filter(item => item.category === category);
    }

    // Sort by timestamp (newest first)
    data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);

    res.json({
      ok: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: data.length,
        pages: Math.ceil(data.length / limit)
      }
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to retrieve submissions',
      error: error.message
    });
  }
});

// GET /api/submissions/:type/:id - Get specific submission
router.get('/:type/:id', async (req, res) => {
  try {
    const type = req.params.type;
    const id = req.params.id;

    if (!submissions[type]) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid submission type'
      });
    }

    const item = submissions[type].find(item => item.id === id);

    if (!item) {
      return res.status(404).json({
        ok: false,
        message: 'Submission not found'
      });
    }

    res.json({
      ok: true,
      data: item
    });

  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to retrieve submission',
      error: error.message
    });
  }
});

// PUT /api/submissions/:type/:id/status - Update submission status
router.put('/:type/:id/status', async (req, res) => {
  try {
    const type = req.params.type;
    const id = req.params.id;
    const newStatus = req.body.status;

    if (!submissions[type]) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid submission type'
      });
    }

    const itemIndex = submissions[type].findIndex(item => item.id === id);

    if (itemIndex === -1) {
      return res.status(404).json({
        ok: false,
        message: 'Submission not found'
      });
    }

    submissions[type][itemIndex].status = newStatus;
    submissions[type][itemIndex].statusUpdated = new Date().toISOString();

    res.json({
      ok: true,
      message: 'Status updated successfully',
      data: submissions[type][itemIndex]
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// GET /api/submissions/stats/overview - Get submission statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = {
      total: 0,
      assets: {
        total: submissions.assets.length,
        pending: submissions.assets.filter(a => a.status === 'pending').length,
        approved: submissions.assets.filter(a => a.status === 'approved').length,
        categories: {}
      },
      certificates: {
        total: submissions.certificates.length
      },
      provenance: {
        total: submissions.provenance.length
      },
      marketplace: {
        total: submissions.marketplace.length,
        active: submissions.marketplace.filter(m => m.status === 'active').length
      }
    };

    // Count categories
    submissions.assets.forEach(asset => {
      const category = asset.category || 'uncategorized';
      stats.assets.categories[category] = (stats.assets.categories[category] || 0) + 1;
    });

    stats.total = stats.assets.total + stats.certificates.total + stats.provenance.total;

    res.json({
      ok: true,
      data: stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
});

module.exports = router;