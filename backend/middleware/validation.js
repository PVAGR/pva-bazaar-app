// backend/middleware/validation.js - Input validation and sanitization
const validator = require('validator');

/**
 * Sanitize and validate user input
 */
function sanitizeInput(data) {
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = validator.escape(value).trim();
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => typeof v === 'string' ? validator.escape(v).trim() : v);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Validate email format
 */
function validateEmail(email) {
  return validator.isEmail(email);
}

/**
 * Validate URL format
 */
function validateUrl(url) {
  return validator.isURL(url);
}

/**
 * Validate price (positive number)
 */
function validatePrice(price) {
  const num = parseFloat(price);
  return !isNaN(num) && num > 0 && num < 999999999;
}

/**
 * Validate phone number
 */
function validatePhone(phone) {
  return validator.isMobilePhone(phone, 'any', { strictMode: false });
}

/**
 * Validate product types
 */
function validateProductType(type) {
  const valid = ['physical_good', 'digital_download', 'course', 'expertise', 'nft', 'service'];
  return valid.includes(type);
}

/**
 * Validate object types for provenance
 */
function validateObjectType(type) {
  const valid = ['gemstone', 'jewelry', 'art', 'craft', 'collectible', 'food', 'material', 'other'];
  return valid.includes(type);
}

/**
 * Validate pagination parameters
 */
function validatePagination(page, limit) {
  const p = parseInt(page) || 1;
  const l = parseInt(limit) || 50;
  return {
    page: Math.max(1, p),
    limit: Math.min(Math.max(1, l), 1000),
    skip: (Math.max(1, p) - 1) * Math.min(Math.max(1, l), 1000),
  };
}

/**
 * Middleware to sanitize request body
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  next();
}

/**
 * Middleware to sanitize query parameters
 */
function sanitizeQuery(req, res, next) {
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeInput(req.query);
  }
  next();
}

module.exports = {
  sanitizeInput,
  validateEmail,
  validateUrl,
  validatePrice,
  validatePhone,
  validateProductType,
  validateObjectType,
  validatePagination,
  sanitizeBody,
  sanitizeQuery,
};
