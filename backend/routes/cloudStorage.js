/**
 * Cloud Storage Management Routes
 * Provides unified interface for multiple cloud storage providers
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const adminSession = require('../middleware/adminSession');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

/**
 * GET /api/cloud-storage/providers
 * Get status of all configured cloud providers
 */
router.get('/providers', adminSession, async (req, res) => {
  try {
    const providers = {
      cloudinary: {
        name: 'Cloudinary',
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
        signupUrl: 'https://cloudinary.com/users/register/free',
        dashboardUrl: 'https://cloudinary.com/console',
        docsUrl: 'https://cloudinary.com/documentation',
        features: ['Images', 'Videos', 'CDN', 'Transformations'],
        status: process.env.CLOUDINARY_CLOUD_NAME ? 'connected' : 'disconnected'
      },
      pinata: {
        name: 'Pinata IPFS',
        configured: !!(process.env.PINATA_API_KEY && process.env.PINATA_API_SECRET),
        signupUrl: 'https://app.pinata.cloud/register',
        dashboardUrl: 'https://app.pinata.cloud',
        docsUrl: 'https://docs.pinata.cloud',
        features: ['Decentralized', 'Permanent Storage', 'IPFS Gateway', 'Free Tier'],
        status: process.env.PINATA_API_KEY ? 'connected' : 'disconnected'
      },
      aws: {
        name: 'AWS S3',
        configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_BUCKET_NAME),
        signupUrl: 'https://portal.aws.amazon.com/billing/signup',
        dashboardUrl: 'https://console.aws.amazon.com/s3',
        docsUrl: 'https://docs.aws.amazon.com/s3',
        features: ['Scalable', 'Global CDN', 'Secure', 'Pay-as-you-go'],
        status: process.env.AWS_BUCKET_NAME ? 'connected' : 'disconnected'
      },
      gcs: {
        name: 'Google Cloud Storage',
        configured: !!(process.env.GCS_PROJECT_ID && process.env.GCS_BUCKET_NAME),
        signupUrl: 'https://cloud.google.com/free',
        dashboardUrl: 'https://console.cloud.google.com/storage',
        docsUrl: 'https://cloud.google.com/storage/docs',
        features: ['Global Access', 'ML Integration', 'Encryption', 'Free Tier'],
        status: process.env.GCS_PROJECT_ID ? 'connected' : 'disconnected'
      },
      local: {
        name: 'Local Storage',
        configured: true,
        signupUrl: null,
        dashboardUrl: null,
        docsUrl: null,
        features: ['No Cost', 'Full Control', 'Fast Access', 'Private'],
        status: 'connected'
      }
    };

    res.json({ ok: true, providers });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/cloud-storage/upload/cloudinary
 * Upload file to Cloudinary
 */
router.post('/upload/cloudinary', adminSession, upload.single('file'), async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to environment variables.' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Upload buffer to Cloudinary
    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: req.body.folder || 'pva-bazaar' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const result = await uploadStream();

    res.json({
      ok: true,
      provider: 'cloudinary',
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/cloud-storage/upload/pinata
 * Upload file to Pinata IPFS
 */
router.post('/upload/pinata', adminSession, upload.single('file'), async (req, res) => {
  try {
    if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Pinata not configured. Add PINATA_API_KEY and PINATA_API_SECRET to environment variables.' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: req.file.originalname });

    const pinataMetadata = JSON.stringify({
      name: req.file.originalname,
      keyvalues: { uploadedBy: 'pva-bazaar' }
    });
    formData.append('pinataMetadata', pinataMetadata);

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        ...formData.getHeaders(),
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET
      },
      maxBodyLength: Infinity
    });

    const ipfsHash = response.data.IpfsHash;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    res.json({
      ok: true,
      provider: 'pinata',
      url: gatewayUrl,
      ipfsHash,
      size: response.data.PinSize
    });
  } catch (error) {
    console.error('Pinata upload error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/cloud-storage/upload/local
 * Upload file to local server storage
 */
router.post('/upload/local', adminSession, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Strip any path components from the original filename to prevent path traversal.
    const safeName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${safeName}`;
    const filepath = path.join(uploadsDir, filename);
    
    await fs.writeFile(filepath, req.file.buffer);

    const url = `/uploads/${filename}`;

    res.json({
      ok: true,
      provider: 'local',
      url,
      filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Local upload error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/cloud-storage/files
 * List uploaded files across all providers
 */
router.get('/files', adminSession, async (req, res) => {
  try {
    const files = [];

    // Get local files
    try {
      const uploadsDir = path.join(__dirname, '../uploads');
      const localFiles = await fs.readdir(uploadsDir);
      for (const file of localFiles) {
        const stats = await fs.stat(path.join(uploadsDir, file));
        files.push({
          provider: 'local',
          name: file,
          url: `/uploads/${file}`,
          size: stats.size,
          uploaded: stats.birthtime
        });
      }
    } catch (err) {
      // No local files or directory doesn't exist
    }

    // Get Pinata files (if configured)
    if (process.env.PINATA_API_KEY && process.env.PINATA_API_SECRET) {
      try {
        const response = await axios.get('https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=10', {
          headers: {
            pinata_api_key: process.env.PINATA_API_KEY,
            pinata_secret_api_key: process.env.PINATA_API_SECRET
          }
        });

        for (const pin of response.data.rows) {
          files.push({
            provider: 'pinata',
            name: pin.metadata.name,
            url: `https://gateway.pinata.cloud/ipfs/${pin.ipfs_pin_hash}`,
            ipfsHash: pin.ipfs_pin_hash,
            size: pin.size,
            uploaded: pin.date_pinned
          });
        }
      } catch (err) {
        console.error('Pinata list error:', err.message);
      }
    }

    res.json({ ok: true, files });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /api/cloud-storage/delete/:provider/:id
 * Delete file from specific provider
 */
router.delete('/delete/:provider/:id', adminSession, async (req, res) => {
  try {
    const { provider, id } = req.params;

    if (provider === 'local') {
      // Use basename to prevent path traversal via the id parameter.
      const uploadsDir = path.join(__dirname, '../uploads');
      const filepath = path.join(uploadsDir, path.basename(id));
      await fs.unlink(filepath);
      return res.json({ ok: true, message: 'File deleted' });
    }

    if (provider === 'pinata') {
      if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
        return res.status(400).json({ ok: false, error: 'Pinata not configured' });
      }

      await axios.delete(`https://api.pinata.cloud/pinning/unpin/${id}`, {
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_API_SECRET
        }
      });

      return res.json({ ok: true, message: 'File unpinned from IPFS' });
    }

    if (provider === 'cloudinary') {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(400).json({ ok: false, error: 'Cloudinary not configured' });
      }

      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      await cloudinary.uploader.destroy(id);
      return res.json({ ok: true, message: 'File deleted from Cloudinary' });
    }

    res.status(400).json({ ok: false, error: 'Unknown provider' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/cloud-storage/test-connection/:provider
 * Test connection to a cloud provider
 */
router.post('/test-connection/:provider', adminSession, async (req, res) => {
  try {
    const { provider } = req.params;

    if (provider === 'cloudinary') {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
        return res.json({ ok: false, connected: false, message: 'Cloudinary credentials not configured' });
      }

      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      await cloudinary.api.ping();
      return res.json({ ok: true, connected: true, message: 'Cloudinary connection successful' });
    }

    if (provider === 'pinata') {
      if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
        return res.json({ ok: false, connected: false, message: 'Pinata credentials not configured' });
      }

      await axios.get('https://api.pinata.cloud/data/testAuthentication', {
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_API_SECRET
        }
      });

      return res.json({ ok: true, connected: true, message: 'Pinata connection successful' });
    }

    if (provider === 'local') {
      return res.json({ ok: true, connected: true, message: 'Local storage available' });
    }

    res.status(400).json({ ok: false, error: 'Unknown provider' });
  } catch (error) {
    console.error('Test connection error:', error);
    res.json({ ok: false, connected: false, message: error.message });
  }
});

module.exports = router;
