const rateLimit = require('express-rate-limit');
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Rate limiting middleware for submission endpoints
 */
const submissionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 submissions per windowMs
  message: {
    ok: false,
    message: 'Too many submissions from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Validate asset submission data
 */
function validateAssetSubmission(req, res, next) {
  const errors = [];
  const { body } = req;

  // Required fields validation
  if (!body.name || body.name.trim().length < 2) {
    errors.push('Asset name must be at least 2 characters long');
  }

  if (!body.description || body.description.trim().length < 10) {
    errors.push('Asset description must be at least 10 characters long');
  }

  if (!body.category || !['jewelry', 'art', 'collectibles', 'crafts'].includes(body.category)) {
    errors.push('Valid category is required (jewelry, art, collectibles, crafts)');
  }

  if (!body.artisanName || body.artisanName.trim().length < 2) {
    errors.push('Artisan name is required');
  }

  if (!body.artisanLocation || body.artisanLocation.trim().length < 2) {
    errors.push('Artisan location is required');
  }

  // Wallet address validation
  if (body.artisanWallet && !validator.isLength(body.artisanWallet, { min: 40, max: 45 })) {
    errors.push('Invalid wallet address format');
  }

  // Email validation
  if (body.email && !validator.isEmail(body.email)) {
    errors.push('Invalid email format');
  }

  // Price validation
  if (body.salePrice && (isNaN(parseFloat(body.salePrice)) || parseFloat(body.salePrice) < 0)) {
    errors.push('Sale price must be a valid positive number');
  }

  // Insurance bond validation
  if (body.insuranceBond && (isNaN(parseFloat(body.insuranceBond)) || parseFloat(body.insuranceBond) < 0)) {
    errors.push('Insurance bond must be a valid positive number');
  }

  // Artisan share validation
  if (body.artisanShare && (isNaN(parseFloat(body.artisanShare)) || parseFloat(body.artisanShare) < 0 || parseFloat(body.artisanShare) > 100)) {
    errors.push('Artisan share must be between 0 and 100');
  }

  // Terms agreement validation
  if (!body.agreeTerms || (body.agreeTerms !== 'true' && body.agreeTerms !== true)) {
    errors.push('You must agree to the terms and conditions');
  }

  // Sanitize text inputs
  if (body.name) body.name = DOMPurify.sanitize(body.name.trim());
  if (body.description) body.description = DOMPurify.sanitize(body.description.trim());
  if (body.artisanName) body.artisanName = DOMPurify.sanitize(body.artisanName.trim());
  if (body.artisanLocation) body.artisanLocation = DOMPurify.sanitize(body.artisanLocation.trim());
  if (body.artisanStory) body.artisanStory = DOMPurify.sanitize(body.artisanStory.trim());

  // Check for uploaded files
  if (!req.files || req.files.length === 0) {
    errors.push('At least one asset photo is required');
  } else if (req.files.length > 5) {
    errors.push('Maximum 5 photos allowed');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  next();
}

/**
 * Validate certificate submission data
 */
function validateCertificateSubmission(req, res, next) {
  const errors = [];
  const { body } = req;

  // Required fields validation
  if (!body.name || body.name.trim().length < 2) {
    errors.push('Certificate name must be at least 2 characters long');
  }

  if (!body.species || body.species.trim().length < 2) {
    errors.push('Species information is required');
  }

  if (!body.origin || body.origin.trim().length < 2) {
    errors.push('Origin information is required');
  }

  if (!body.ownerName || body.ownerName.trim().length < 2) {
    errors.push('Owner name is required');
  }

  // Weight validation
  if (!body.weight || isNaN(parseFloat(body.weight)) || parseFloat(body.weight) <= 0) {
    errors.push('Valid weight is required');
  }

  // Wallet address validation
  if (body.creatorWallet && !validator.isLength(body.creatorWallet, { min: 40, max: 45 })) {
    errors.push('Invalid creator wallet address format');
  }

  if (body.owner && !validator.isLength(body.owner, { min: 40, max: 45 })) {
    errors.push('Invalid owner wallet address format');
  }

  // Sanitize text inputs
  if (body.name) body.name = DOMPurify.sanitize(body.name.trim());
  if (body.species) body.species = DOMPurify.sanitize(body.species.trim());
  if (body.origin) body.origin = DOMPurify.sanitize(body.origin.trim());
  if (body.ownerName) body.ownerName = DOMPurify.sanitize(body.ownerName.trim());
  if (body.measurements) body.measurements = DOMPurify.sanitize(body.measurements.trim());
  if (body.color) body.color = DOMPurify.sanitize(body.color.trim());

  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  next();
}

/**
 * Validate provenance record submission
 */
function validateProvenanceSubmission(req, res, next) {
  const errors = [];
  const { body } = req;

  // Required fields validation
  if (!body.assetId || body.assetId.trim().length < 1) {
    errors.push('Asset ID is required');
  }

  if (!body.eventType || !['creation', 'transfer', 'verification', 'update'].includes(body.eventType)) {
    errors.push('Valid event type is required (creation, transfer, verification, update)');
  }

  if (!body.description || body.description.trim().length < 10) {
    errors.push('Event description must be at least 10 characters long');
  }

  if (!body.verifierName || body.verifierName.trim().length < 2) {
    errors.push('Verifier name is required');
  }

  // Location validation
  if (body.location && body.location.latitude) {
    const lat = parseFloat(body.location.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('Invalid latitude value');
    }
  }

  if (body.location && body.location.longitude) {
    const lng = parseFloat(body.location.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('Invalid longitude value');
    }
  }

  // Sanitize text inputs
  if (body.description) body.description = DOMPurify.sanitize(body.description.trim());
  if (body.verifierName) body.verifierName = DOMPurify.sanitize(body.verifierName.trim());
  if (body.notes) body.notes = DOMPurify.sanitize(body.notes.trim());

  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  next();
}

/**
 * Security headers middleware
 */
function addSecurityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
}

/**
 * File upload security validation
 */
function validateFileUpload(req, res, next) {
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      // Check file size (10MB limit set in multer, but double-check)
      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({
          ok: false,
          message: 'File size too large. Maximum 10MB per file.'
        });
      }

      // Validate file type
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({
          ok: false,
          message: 'Only image files are allowed.'
        });
      }

      // Additional security: check file extension
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({
          ok: false,
          message: 'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.'
        });
      }
    }
  }
  next();
}

/**
 * Request logging middleware
 */
function logSubmissionRequest(req, res, next) {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  console.log(`[${timestamp}] SUBMISSION ${req.method} ${req.path} - IP: ${ip} - UA: ${userAgent}`);
  
  // Log body (without sensitive data)
  const logBody = { ...req.body };
  delete logBody.digitalSignature;
  delete logBody.creatorWallet;
  delete logBody.artisanWallet;
  
  console.log(`[${timestamp}] Request body:`, JSON.stringify(logBody, null, 2));
  
  next();
}

module.exports = {
  submissionRateLimit,
  validateAssetSubmission,
  validateCertificateSubmission,
  validateProvenanceSubmission,
  addSecurityHeaders,
  validateFileUpload,
  logSubmissionRequest
};