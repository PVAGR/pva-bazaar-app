/**
 * OpenClaw Event Helpers
 * 
 * Standardized event creators for common PVA Bazaar events to be dispatched
 * to OpenClaw for processing, notifications, and automation.
 */

/**
 * Creates an artifact-related event
 * @param {string} action - created, updated, deleted, published, verified
 * @param {Object} artifact - Artifact document
 * @param {Object} user - User who performed the action
 * @param {Object} additionalMetadata - Extra context
 */
function createArtifactEvent(action, artifact, user, additionalMetadata = {}) {
  return {
    event: `pvabazaar.artifact.${action}`,
    message: `Artifact "${artifact.title || artifact._id}" was ${action}`,
    metadata: {
      artifactId: artifact._id?.toString(),
      artifactTitle: artifact.title,
      artifactSlug: artifact.slug,
      category: artifact.category,
      origin: artifact.origin,
      userId: user?._id?.toString(),
      userEmail: user?.email,
      userName: user?.name,
      timestamp: new Date().toISOString(),
      source: 'pva-bazaar-backend',
      ...additionalMetadata,
    },
  };
}

/**
 * Creates a user-related event
 * @param {string} action - registered, verified, updated, deleted
 * @param {Object} user - User document
 * @param {Object} additionalMetadata - Extra context
 */
function createUserEvent(action, user, additionalMetadata = {}) {
  return {
    event: `pvabazaar.user.${action}`,
    message: `User ${user.email} was ${action}`,
    metadata: {
      userId: user._id?.toString(),
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      timestamp: new Date().toISOString(),
      source: 'pva-bazaar-backend',
      ...additionalMetadata,
    },
  };
}

/**
 * Creates a transaction-related event
 * @param {string} action - created, confirmed, failed, refunded
 * @param {Object} transaction - Transaction document
 * @param {Object} additionalMetadata - Extra context
 */
function createTransactionEvent(action, transaction, additionalMetadata = {}) {
  return {
    event: `pvabazaar.transaction.${action}`,
    message: `Transaction ${transaction._id} ${action}`,
    metadata: {
      transactionId: transaction._id?.toString(),
      artifactId: transaction.artifactId?.toString(),
      buyerId: transaction.buyerId?.toString(),
      sellerId: transaction.sellerId?.toString(),
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      timestamp: new Date().toISOString(),
      source: 'pva-bazaar-backend',
      ...additionalMetadata,
    },
  };
}

/**
 * Creates a fractional ownership event
 * @param {string} action - tokenized, share_purchased, share_transferred
 * @param {Object} artifact - Artifact document
 * @param {Object} details - Fractionalization details
 * @param {Object} additionalMetadata - Extra context
 */
function createFractionalEvent(action, artifact, details, additionalMetadata = {}) {
  return {
    event: `pvabazaar.fractional.${action}`,
    message: `Fractional action ${action} for artifact "${artifact.title}"`,
    metadata: {
      artifactId: artifact._id?.toString(),
      artifactTitle: artifact.title,
      tokenAddress: artifact.tokenAddress,
      totalShares: details.totalShares,
      sharesPurchased: details.sharesPurchased,
      sharePrice: details.sharePrice,
      buyerId: details.buyerId?.toString(),
      timestamp: new Date().toISOString(),
      source: 'pva-bazaar-backend',
      ...additionalMetadata,
    },
  };
}

/**
 * Creates a provenance-related event
 * @param {string} action - verified, updated, attestation_added
 * @param {Object} artifact - Artifact document
 * @param {Object} provenanceData - Provenance details
 * @param {Object} additionalMetadata - Extra context
 */
function createProvenanceEvent(action, artifact, provenanceData, additionalMetadata = {}) {
  return {
    event: `pvabazaar.provenance.${action}`,
    message: `Provenance ${action} for artifact "${artifact.title}"`,
    metadata: {
      artifactId: artifact._id?.toString(),
      artifactTitle: artifact.title,
      chainOfCustody: provenanceData.chainOfCustody?.length || 0,
      attestations: provenanceData.attestations?.length || 0,
      verificationStatus: provenanceData.verificationStatus,
      timestamp: new Date().toISOString(),
      source: 'pva-bazaar-backend',
      ...additionalMetadata,
    },
  };
}

/**
 * Creates a system/operational event
 * @param {string} level - info, warning, error, critical
 * @param {string} message - Event message
 * @param {Object} context - Event context
 */
function createSystemEvent(level, message, context = {}) {
  return {
    event: `pvabazaar.system.${level}`,
    message,
    metadata: {
      level,
      timestamp: new Date().toISOString(),
      source: 'pva-bazaar-backend',
      ...context,
    },
  };
}

/**
 * Dispatches an event to OpenClaw via the bridge.
 * Always persists to the MongoDB queue so events are visible in the admin UI
 * even when the external webhook is not configured.
 *
 * @param {Object} eventPayload - Event object created by event helpers
 * @param {Function} logger - Optional logger function (console.log by default)
 * @returns {Promise<boolean>} - Success status
 */
async function dispatchToOpenClaw(eventPayload, logger = console.log) {
  // Persist to MongoDB queue (best-effort – never blocks the caller)
  try {
    const dbConnect = require('../lib/dbConnect');
    const OpenClawMessage = require('../models/OpenClawMessage');
    await dbConnect();
    await OpenClawMessage.create({
      direction: 'outbound',
      content: eventPayload.message || eventPayload.event,
      event: eventPayload.event || 'pvabazaar.dispatch',
      source: eventPayload.metadata?.source || 'pva-bazaar-backend',
      processed: false,
      metadata: eventPayload.metadata || {},
    });
  } catch (dbErr) {
    logger(`[OpenClaw] Failed to persist event to queue: ${dbErr.message}`);
  }

  // Forward to external webhook if configured
  const openclawWebhookUrl = process.env.OPENCLAW_WEBHOOK_URL;
  if (!openclawWebhookUrl) {
    logger(`[OpenClaw] Event queued (no webhook configured): ${eventPayload.event}`);
    return true;
  }

  try {
    const axios = require('axios');
    const openclawApiKey = process.env.OPENCLAW_API_KEY;
    const headers = { 'Content-Type': 'application/json' };
    if (openclawApiKey) headers['Authorization'] = `Bearer ${openclawApiKey}`;

    const response = await axios.post(openclawWebhookUrl, eventPayload, {
      headers,
      timeout: 5000,
    });

    logger(`[OpenClaw] Event dispatched: ${eventPayload.event} - Status: ${response.status}`);
    return response.status >= 200 && response.status < 300;
  } catch (err) {
    logger(`[OpenClaw] Failed to forward to webhook: ${err.message}`);
    return false;
  }
}

module.exports = {
  createArtifactEvent,
  createUserEvent,
  createTransactionEvent,
  createFractionalEvent,
  createProvenanceEvent,
  createSystemEvent,
  dispatchToOpenClaw,
};
