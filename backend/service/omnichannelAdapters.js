const { getMarketplaceAdapter } = require('./externalAdapters');

const SUPPORTED_CHANNELS = ['ebay', 'etsy', 'amazon', 'facebook', 'shopify'];

async function delistExternalListing({ channel, listing, item, reason }) {
  if (!SUPPORTED_CHANNELS.includes(channel)) {
    return {
      channel,
      status: 'skipped',
      message: `Unsupported channel: ${channel}`,
      externalListingId: listing?.externalListingId || '',
      at: new Date(),
    };
  }

  const adapter = getMarketplaceAdapter(channel);
  if (!adapter || !adapter.webhookUrl) {
    return {
      channel,
      status: 'manual_required',
      message: `No ${channel} delist connector configured`,
      externalListingId: listing?.externalListingId || '',
      at: new Date(),
    };
  }

  const payload = {
    channel,
    reason: reason || 'item_sold_elsewhere',
    item: {
      id: String(item._id),
      slug: item.slug || '',
      title: item.title || item.name || '',
    },
    listing: {
      externalListingId: listing?.externalListingId || '',
      externalUrl: listing?.externalUrl || '',
      status: listing?.status || '',
    },
  };

  const result = await adapter.delistListing(payload);
  return {
    channel,
    status: result.status,
    message: result.message || 'Delist processed',
    externalListingId: listing?.externalListingId || '',
    at: new Date(),
  };
}

module.exports = {
  SUPPORTED_CHANNELS,
  delistExternalListing,
};
