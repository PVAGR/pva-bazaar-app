// backend/routes/digital.js - Digital product uploads and downloads
const express = require('express');
const DigitalProduct = require('../models/DigitalProduct');
const ProductType = require('../models/ProductType');

const router = express.Router();

/**
 * Middleware: Require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * POST /api/digital/:productId/upload - Upload product file
 * In production, this would handle S3 presigned URLs or multipart upload
 */
router.post('/:productId/upload', requireAuth, async (req, res) => {
  try {
    const product = await ProductType.findById(req.params.productId);
    if (!product || product.productType !== 'digital_download') {
      return res.status(404).json({ error: 'Digital product not found' });
    }
    if (product.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const digital = await DigitalProduct.findOne({ productId: req.params.productId });
    if (!digital) {
      return res.status(404).json({ error: 'Digital product record not found' });
    }

    const { filename, url, fileSize, mimeType } = req.body;

    // Add file to fileUrls array
    const fileRecord = {
      filename,
      url,
      fileSize,
      mimeType,
      uploadedAt: new Date(),
      version: (digital.fileUrls?.length || 0) + 1,
    };

    digital.fileUrls.push(fileRecord);
    digital.currentVersion = fileRecord.version;

    await digital.save();

    res.json({
      message: 'File uploaded successfully',
      fileRecord,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/digital/:productId/download - Get download URL (for authorized buyers)
 */
router.get('/:productId/download', requireAuth, async (req, res) => {
  try {
    const product = await ProductType.findById(req.params.productId);
    if (!product || product.productType !== 'digital_download') {
      return res.status(404).json({ error: 'Digital product not found' });
    }

    const digital = await DigitalProduct.findOne({ productId: req.params.productId });
    if (!digital) {
      return res.status(404).json({ error: 'Digital product record not found' });
    }

    // Check if user has purchased
    const { orderId } = req.query;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId required' });
    }

    // Verify order exists and belongs to user (in production, check against Order model)
    // For now, just check download limits

    // Find or create download record
    let downloadRecord = digital.downloads.find(
      (d) => d.buyerId.toString() === req.user._id.toString(),
    );

    if (!downloadRecord) {
      downloadRecord = {
        buyerId: req.user._id,
        orderId,
        downloadedAt: new Date(),
        expiresAt: digital.expiresAt,
        downloadCount: 0,
      };
      digital.downloads.push(downloadRecord);
    }

    // Check download limits
    if (digital.downloadLimit && downloadRecord.downloadCount >= digital.downloadLimit) {
      return res.status(403).json({
        error: 'Download limit exceeded',
        limit: digital.downloadLimit,
        used: downloadRecord.downloadCount,
      });
    }

    // Check expiration
    if (downloadRecord.expiresAt && downloadRecord.expiresAt < new Date()) {
      return res.status(403).json({ error: 'Download has expired' });
    }

    // Increment download count
    downloadRecord.downloadCount += 1;
    downloadRecord.downloadedAt = new Date();

    digital.totalDownloads = (digital.totalDownloads || 0) + 1;
    if (!digital.downloads.map((d) => d.buyerId.toString()).includes(req.user._id.toString())) {
      digital.uniqueDownloaders = (digital.uniqueDownloaders || 0) + 1;
    }

    await digital.save();

    // Get current version file URL
    const fileUrl = digital.fileUrls[digital.fileUrls.length - 1];

    res.json({
      message: 'Download authorized',
      downloadUrl: fileUrl.url,
      filename: fileUrl.filename,
      expiresIn: 3600, // 1 hour
      downloadsRemaining: digital.downloadLimit
        ? digital.downloadLimit - downloadRecord.downloadCount
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/digital/:productId/status - Get digital product status
 */
router.get('/:productId/status', requireAuth, async (req, res) => {
  try {
    const product = await ProductType.findById(req.params.productId);
    if (!product || product.productType !== 'digital_download') {
      return res.status(404).json({ error: 'Digital product not found' });
    }
    if (product.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const digital = await DigitalProduct.findOne({ productId: req.params.productId });

    res.json({
      fileCount: digital.fileUrls?.length || 0,
      currentVersion: digital.currentVersion,
      totalDownloads: digital.totalDownloads || 0,
      uniqueDownloaders: digital.uniqueDownloaders || 0,
      totalRevenue: digital.totalRevenue || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/digital/:productId/settings - Update access control
 */
router.put('/:productId/settings', requireAuth, async (req, res) => {
  try {
    const product = await ProductType.findById(req.params.productId);
    if (!product || product.productType !== 'digital_download') {
      return res.status(404).json({ error: 'Digital product not found' });
    }
    if (product.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const digital = await DigitalProduct.findOne({ productId: req.params.productId });

    // Update settings
    if (req.body.accessControl) digital.accessControl = req.body.accessControl;
    if (req.body.downloadLimit !== undefined) digital.downloadLimit = req.body.downloadLimit;
    if (req.body.expiresAt) digital.expiresAt = req.body.expiresAt;
    if (req.body.deliveryMethod) digital.deliveryMethod = req.body.deliveryMethod;

    await digital.save();

    res.json({
      message: 'Settings updated',
      settings: {
        accessControl: digital.accessControl,
        downloadLimit: digital.downloadLimit,
        expiresAt: digital.expiresAt,
        deliveryMethod: digital.deliveryMethod,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
