const Artifact = require('../models/Artifact');
const { getMarketplaceAdapter } = require('./externalAdapters');
const { completeSaleAcrossChannels } = require('./omnichannelSyncService');

function toCents(priceNumber) {
  const amount = Number(priceNumber || 0);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

async function runPollingSync({ limit = 25 } = {}) {
  const cappedLimit = Math.max(1, Math.min(Number(limit) || 25, 200));

  const artifacts = await Artifact.find({
    'omnichannel.soldState.isSold': { $ne: true },
    'omnichannel.channels.syncMode': 'polling',
    status: 'published',
  })
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .limit(cappedLimit)
    .exec();

  const results = [];
  let checkedListings = 0;
  let soldDetected = 0;
  let syncFailures = 0;

  for (const artifact of artifacts) {
    const channels = Array.isArray(artifact?.omnichannel?.channels)
      ? artifact.omnichannel.channels
      : [];
    const pollingChannels = channels.filter(
      (entry) =>
        entry &&
        entry.syncMode === 'polling' &&
        entry.externalListingId &&
        !['sold', 'delisted'].includes(entry.status),
    );

    if (!pollingChannels.length) continue;

    for (const listing of pollingChannels) {
      checkedListings += 1;
      const adapter = getMarketplaceAdapter(listing.channel);
      if (!adapter) {
        listing.lastSyncedAt = new Date();
        listing.lastSyncMessage = `No adapter for ${listing.channel}`;
        continue;
      }

      const poll = await adapter.pollListingStatus({
        channel: listing.channel,
        externalListingId: listing.externalListingId,
        externalUrl: listing.externalUrl || '',
        item: {
          id: String(artifact._id),
          slug: artifact.slug || '',
          title: artifact.title || artifact.name || '',
        },
      });

      listing.lastSyncedAt = new Date();
      listing.lastSyncMessage = poll.message || `Polling status: ${poll.status}`;

      if (poll.status === 'sold') {
        soldDetected += 1;

        const sync = await completeSaleAcrossChannels({
          item: artifact,
          saleSource: String(listing.channel).toLowerCase(),
          externalSaleId: poll.externalSaleId || listing.externalListingId,
          paymentMethod: poll.paymentMethod || 'card',
          buyerEmail: poll.buyerEmail || '',
          buyerWallet: poll.buyerWallet || '',
          amountCents: Number(poll.amountCents || toCents(artifact.price)),
          currency: String(poll.currency || 'usd').toLowerCase(),
          idempotencyKey: `poll:${listing.channel}:${poll.externalSaleId || listing.externalListingId || String(artifact._id)}`,
        });

        if (!sync.ok) {
          syncFailures += 1;
          listing.lastSyncMessage = sync.error || 'Polling sync failed';
          listing.status = 'error';
        } else {
          listing.status = 'sold';
        }

        results.push({
          itemId: String(artifact._id),
          itemSlug: artifact.slug || '',
          channel: listing.channel,
          pollStatus: poll.status,
          syncOk: !!sync.ok,
          duplicate: !!sync.duplicate,
          alreadySold: !!sync.alreadySold,
          message: listing.lastSyncMessage,
        });
      } else if (poll.status === 'error') {
        syncFailures += 1;
        listing.status = 'error';
      } else if (poll.status === 'active') {
        listing.status = 'listed';
      }
    }

    artifact.omnichannel = artifact.omnichannel || {};
    artifact.omnichannel.lastSyncAt = new Date();
    await artifact.save();
  }

  return {
    ok: true,
    summary: {
      scannedItems: artifacts.length,
      checkedListings,
      soldDetected,
      syncFailures,
    },
    results,
  };
}

module.exports = {
  runPollingSync,
};
