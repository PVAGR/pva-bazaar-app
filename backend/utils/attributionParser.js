/**
 * Attribution parser utility
 * Extracts and validates UTM parameters and creation attribution data
 * from requests and checkout sessions.
 */

const VALID_UTM_SOURCES = [
  // Common creator platforms
  'instagram', 'tiktok', 'youtube', 'twitter', 'facebook',
  // Custom creator handles (format: creator_<handle>)
  // Validated by regex below
];

/**
 * Parse and validate UTM parameters from URL query or session data
 * @param {object} options - Query params or session data
 * @returns {object} Sanitized attribution object
 */
function parseUTMParams(options = {}) {
  const {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    referral_code,
    creator_handle,
  } = options;

  const attribution = {
    utm_source: null,
    utm_medium: 'referral',
    utm_campaign: null,
    utm_content: null,
    creatorHandle: null,
    referralCode: null,
    attributionSource: 'direct',
  };

  // Validate utm_source
  if (utm_source) {
    const normalized = String(utm_source).toLowerCase().trim();
    // Allow known platforms or creator_<handle> pattern
    if (
      VALID_UTM_SOURCES.includes(normalized) ||
      /^creator_[a-z0-9_-]{3,30}$/.test(normalized)
    ) {
      attribution.utm_source = normalized;
      attribution.attributionSource = 'utm';
    }
  }

  // Validate utm_medium
  if (utm_medium) {
    const normalized = String(utm_medium).toLowerCase().trim();
    if (/^[a-z0-9_-]{3,20}$/.test(normalized)) {
      attribution.utm_medium = normalized;
    }
  }

  // Validate utm_campaign
  if (utm_campaign) {
    const normalized = String(utm_campaign).toLowerCase().trim();
    if (/^[a-z0-9_-]{3,50}$/.test(normalized)) {
      attribution.utm_campaign = normalized;
    }
  }

  // Validate utm_content (A/B test variant)
  if (utm_content) {
    const normalized = String(utm_content).toLowerCase().trim();
    if (/^[a-z0-9_-]{3,30}$/.test(normalized)) {
      attribution.utm_content = normalized;
    }
  }

  // Validate creator_handle or creatorHandle field
  if (creator_handle) {
    const normalized = String(creator_handle).toLowerCase().trim();
    if (/^[a-z0-9_-]{3,30}$/.test(normalized)) {
      attribution.creatorHandle = normalized;
      attribution.attributionSource = 'creator_direct';
    }
  }

  // Validate referral_code
  if (referral_code) {
    const normalized = String(referral_code).toUpperCase().trim();
    if (/^[A-Z0-9]{6,16}$/.test(normalized)) {
      attribution.referralCode = normalized;
      attribution.attributionSource = 'referral_code';
    }
  }

  return attribution;
}

/**
 * Extract creator handle from utm_source if using creator_<handle> pattern
 * @param {string} utm_source - UTM source value
 * @returns {string|null} Creator handle or null
 */
function extractCreatorHandleFromUTM(utm_source) {
  const match = String(utm_source).match(/^creator_([a-z0-9_-]{3,30})$/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Generate a referral code for a creator
 * @param {string} creatorHandle - Creator's handle
 * @returns {string} Unique referral code
 */
function generateReferralCode(creatorHandle) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const handle = String(creatorHandle).slice(0, 4).toUpperCase();
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${handle}${random}${timestamp}`.slice(0, 16);
}

/**
 * Calculate commission based on order details and attribution
 * @param {number} amountCents - Order total in cents
 * @param {string} commissionType - 'default' or 'vip'
 * @returns {object} { commissionRate, commissionAmountCents }
 */
function calculateCommissionForCreator(amountCents, commissionType = 'default') {
  const rates = {
    default: 0.10,   // 10% for standard creators
    vip: 0.15,       // 15% for VIP/high-performing creators
    micro: 0.08,     // 8% for micro influencers
  };

  const rate = rates[commissionType] || rates.default;
  const commissionAmountCents = Math.round(amountCents * rate);

  return {
    commissionRate: rate,
    commissionAmountCents,
  };
}

module.exports = {
  parseUTMParams,
  extractCreatorHandleFromUTM,
  generateReferralCode,
  calculateCommissionForCreator,
};
