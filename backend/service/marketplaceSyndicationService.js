const axios = require('axios');

const CHANNELS = ['facebook', 'etsy', 'ebay'];
const JOB_STATUSES = ['queued', 'success', 'failed', 'skipped', 'manual_required'];

function normalizeSyndicationInput(input = {}) {
  const requestedChannels = CHANNELS.filter((channel) => Boolean(input[channel]));
  return {
    requestedChannels,
    hasAny: requestedChannels.length > 0,
  };
}

function normalizeRequestedChannels(channels = []) {
  return [...new Set(channels.filter((channel) => CHANNELS.includes(channel)))];
}

function getWebhookUrl(channel) {
  const envKeyByChannel = {
    facebook: 'FACEBOOK_MARKETPLACE_WEBHOOK_URL',
    etsy: 'ETSY_LISTING_WEBHOOK_URL',
    ebay: 'EBAY_LISTING_WEBHOOK_URL',
  };
  return process.env[envKeyByChannel[channel]] || '';
}

function getBearerToken(channel) {
  const envKeyByChannel = {
    facebook: 'FACEBOOK_MARKETPLACE_WEBHOOK_TOKEN',
    etsy: 'ETSY_LISTING_WEBHOOK_TOKEN',
    ebay: 'EBAY_LISTING_WEBHOOK_TOKEN',
  };
  return process.env[envKeyByChannel[channel]] || '';
}

function buildChannelPayload({ artifact, user, channel }) {
  return {
    channel,
    item: {
      id: String(artifact._id),
      slug: artifact.slug || '',
      title: artifact.title || artifact.name,
      description: artifact.description,
      category: artifact.category,
      price: Number(artifact.price || 0),
      currency: 'USD',
      imageUrls: Array.isArray(artifact.imageUrls) ? artifact.imageUrls : [],
      materials: Array.isArray(artifact.materials) ? artifact.materials : [],
      artisan: artifact.artisan || '',
      tags: Array.isArray(artifact.tags) ? artifact.tags : [],
      condition: Array.isArray(artifact.tags) && artifact.tags.length > 0 ? artifact.tags[0] : '',
      measurements: artifact.measurements || '',
    },
    seller: {
      id: user ? String(user._id || user.id || '') : '',
      name: user?.name || '',
      email: user?.email || '',
    },
    source: 'pvabazaar',
    createdAt: new Date().toISOString(),
  };
}

function mapResponseToJob(channel, responseData) {
  const proposedStatus = typeof responseData?.status === 'string' ? responseData.status : 'success';
  const status = JOB_STATUSES.includes(proposedStatus) ? proposedStatus : 'success';
  return {
    channel,
    status,
    message: typeof responseData?.message === 'string' ? responseData.message : 'Listing dispatched',
    externalListingId: responseData?.listingId ? String(responseData.listingId) : '',
    externalUrl: responseData?.listingUrl ? String(responseData.listingUrl) : '',
    attemptedAt: new Date(),
  };
}

async function postToChannel({ artifact, user, channel }) {
  const webhookUrl = getWebhookUrl(channel);
  if (!webhookUrl) {
    if (channel === 'facebook') {
      return {
        channel,
        status: 'manual_required',
        message: 'No Facebook connector configured. Set FACEBOOK_MARKETPLACE_WEBHOOK_URL or complete this listing manually in Facebook Marketplace.',
        externalListingId: '',
        externalUrl: '',
        attemptedAt: new Date(),
      };
    }

    return {
      channel,
      status: 'skipped',
      message: `No ${channel} connector configured. Set ${channel.toUpperCase()}_LISTING_WEBHOOK_URL to enable auto-posting.`,
      externalListingId: '',
      externalUrl: '',
      attemptedAt: new Date(),
    };
  }

  const token = getBearerToken(channel);
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  try {
    const payload = buildChannelPayload({ artifact, user, channel });
    const response = await axios.post(webhookUrl, payload, {
      timeout: 15000,
      headers,
    });
    return mapResponseToJob(channel, response?.data || {});
  } catch (error) {
    const responseMessage =
      typeof error?.response?.data?.message === 'string'
        ? error.response.data.message
        : null;
    return {
      channel,
      status: 'failed',
      message: responseMessage || `Dispatch to ${channel} failed: ${error?.message || 'unknown error'}`,
      externalListingId: '',
      externalUrl: '',
      attemptedAt: new Date(),
    };
  }
}

async function dispatchSyndication({ artifact, user, requestedChannels = [] }) {
  if (!Array.isArray(requestedChannels) || requestedChannels.length === 0) {
    return {
      requestedChannels: [],
      jobs: [],
      summary: {
        requested: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        manualRequired: 0,
      },
    };
  }

  const safeChannels = normalizeRequestedChannels(requestedChannels);
  const jobs = await Promise.all(
    safeChannels.map((channel) => postToChannel({ artifact, user, channel })),
  );

  const summary = {
    requested: safeChannels.length,
    success: jobs.filter((job) => job.status === 'success').length,
    failed: jobs.filter((job) => job.status === 'failed').length,
    skipped: jobs.filter((job) => job.status === 'skipped').length,
    manualRequired: jobs.filter((job) => job.status === 'manual_required').length,
  };

  return {
    requestedChannels: safeChannels,
    jobs,
    summary,
  };
}

module.exports = {
  CHANNELS,
  normalizeSyndicationInput,
  dispatchSyndication,
};
