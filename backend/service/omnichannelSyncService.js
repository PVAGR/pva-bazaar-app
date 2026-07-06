const mongoose = require('mongoose');
const Artifact = require('../models/Artifact');
const OmnichannelSale = require('../models/OmnichannelSale');
const { delistExternalListing } = require('./omnichannelAdapters');
const { buildItemHash, mintReceiptOnChain } = require('./blockchainReceiptService');

function applyOnChainProvenanceUpdate({ artifact, blockchainReceipt, buyerWallet, saleSource }) {
  if (!artifact || !blockchainReceipt || blockchainReceipt.status !== 'minted') return;

  artifact.provenance = artifact.provenance || {};
  artifact.provenance.chain = artifact.provenance.chain || {};
  artifact.provenance.ownershipTimeline = Array.isArray(artifact.provenance.ownershipTimeline)
    ? artifact.provenance.ownershipTimeline
    : [];

  artifact.provenance.chain.network = String(
    blockchainReceipt.network || artifact.provenance.chain.network || '',
  );
  artifact.provenance.chain.contractAddress = String(
    blockchainReceipt.contractAddress || artifact.provenance.chain.contractAddress || '',
  );
  artifact.provenance.chain.tokenStandard = String(
    artifact.provenance.chain.tokenStandard || 'ERC-721',
  );
  artifact.provenance.chain.tokenId = String(
    blockchainReceipt.tokenId || artifact.provenance.chain.tokenId || '',
  );

  const hasEntry = artifact.provenance.ownershipTimeline.some(
    (entry) =>
      entry &&
      String(entry.txHash || '') === String(blockchainReceipt.txHash || '') &&
      String(entry.ownerRef || '') === String(buyerWallet || ''),
  );

  if (!hasEntry) {
    artifact.provenance.ownershipTimeline.push({
      ownerType: 'buyer',
      ownerRef: String(buyerWallet || ''),
      acquiredAt: blockchainReceipt.mintedAt || new Date(),
      transferType: String(saleSource || 'sale'),
      txHash: String(blockchainReceipt.txHash || ''),
      platform: 'pva-bazaar',
    });
  }

  artifact.blockchainDetails = artifact.blockchainDetails || {};
  artifact.blockchainDetails.network = String(
    blockchainReceipt.network || artifact.blockchainDetails.network || 'base',
  );
  artifact.blockchainDetails.contractAddress = String(
    blockchainReceipt.contractAddress || artifact.blockchainDetails.contractAddress || '',
  );
  artifact.blockchainDetails.tokenStandard = String(
    artifact.blockchainDetails.tokenStandard || 'ERC-721',
  );
  artifact.blockchainDetails.tokenId = String(
    blockchainReceipt.tokenId || artifact.blockchainDetails.tokenId || '',
  );
}

function computeRoyaltySettlement({ artifact, amountCents, currency }) {
  const amount = Math.max(Number(amountCents || 0), 0);
  const creatorRoyaltyBps = Math.max(
    0,
    Math.min(Number(artifact?.provenance?.royalty?.bps || 1000), 10000),
  );
  const platformFeeBps = Math.max(
    0,
    Math.min(Number(process.env.PVA_RESALE_FEE_BPS || 250), 10000),
  );

  const creatorRoyaltyCents = Math.round((amount * creatorRoyaltyBps) / 10000);
  const platformFeeCents = Math.round((amount * platformFeeBps) / 10000);
  const sellerNetCents = Math.max(amount - creatorRoyaltyCents - platformFeeCents, 0);

  return {
    amountCents: amount,
    currency: String(currency || 'usd').toLowerCase(),
    creatorRoyaltyBps,
    creatorRoyaltyCents,
    platformFeeBps,
    platformFeeCents,
    sellerNetCents,
    beneficiaryWallet: String(artifact?.provenance?.royalty?.beneficiaryWallet || '').trim(),
  };
}

async function findItemByChannelOrId({ itemId, channel, externalListingId }) {
  const orConditions = [];

  if (itemId) {
    if (mongoose.Types.ObjectId.isValid(itemId)) {
      orConditions.push({ _id: itemId });
    }
    orConditions.push({ slug: itemId });
  }

  if (channel && externalListingId) {
    orConditions.push({
      'omnichannel.channels': {
        $elemMatch: {
          channel,
          externalListingId,
        },
      },
    });
  }

  if (!orConditions.length) return null;

  return Artifact.findOne({ $or: orConditions });
}

async function completeSaleAcrossChannels({
  item,
  orderId,
  saleSource,
  externalSaleId,
  paymentMethod,
  buyerEmail,
  buyerWallet,
  amountCents,
  currency,
  idempotencyKey,
}) {
  if (!item) {
    return { ok: false, error: 'Item not found' };
  }

  const safeIdempotencyKey =
    idempotencyKey ||
    [saleSource, externalSaleId, orderId, String(item._id)].filter(Boolean).join(':');

  if (safeIdempotencyKey) {
    const existing = await OmnichannelSale.findOne({ idempotencyKey: safeIdempotencyKey }).lean();
    if (existing) {
      return {
        ok: true,
        duplicate: true,
        sale: existing,
        message: 'Duplicate sale event ignored',
      };
    }
  }

  const soldUpdate = await Artifact.findOneAndUpdate(
    {
      _id: item._id,
      $or: [
        { 'omnichannel.soldState.isSold': { $exists: false } },
        { 'omnichannel.soldState.isSold': false },
      ],
    },
    {
      $set: {
        'omnichannel.soldState.isSold': true,
        'omnichannel.soldState.soldAt': new Date(),
        'omnichannel.soldState.soldSource': saleSource,
        'omnichannel.soldState.soldReference': externalSaleId || String(orderId || ''),
      },
    },
    { new: true },
  );

  const alreadySold = !soldUpdate;
  const artifact = soldUpdate || (await Artifact.findById(item._id));

  if (!artifact.isUnlimited) {
    const soldQtyTarget = Math.max(
      Number(artifact.soldQty || 0),
      Number(artifact.stockQty || 0) - Number(artifact.reservedQty || 0),
    );
    if (soldQtyTarget > Number(artifact.soldQty || 0)) {
      artifact.soldQty = soldQtyTarget;
      await artifact.save();
    }
  }

  const channels = Array.isArray(artifact?.omnichannel?.channels)
    ? artifact.omnichannel.channels
    : [];
  const delistTargets = channels.filter(
    (entry) => entry.channel !== saleSource && entry.status !== 'delisted',
  );

  const delistResults = [];
  for (const listing of delistTargets) {
    const result = await delistExternalListing({
      channel: listing.channel,
      listing,
      item: artifact,
      reason: 'sold_elsewhere',
    });
    delistResults.push(result);

    listing.status = result.status === 'success' ? 'delisted' : listing.status;
    listing.lastSyncedAt = new Date();
    listing.lastSyncMessage = result.message;
  }

  for (const listing of channels) {
    if (listing.channel === saleSource) {
      listing.status = 'sold';
      listing.lastSyncedAt = new Date();
      listing.lastSyncMessage = 'Sale source channel';
    }
  }

  let blockchainReceipt = {
    itemHash: '',
    network: '',
    contractAddress: '',
    tokenId: '',
    txHash: '',
    status: 'skipped',
    failureReason: '',
  };

  const itemHash = buildItemHash({
    itemId: artifact._id,
    title: artifact.title || artifact.name,
    amountCents,
    currency,
    saleSource,
    soldAt: new Date().toISOString(),
    saleRef: externalSaleId || String(orderId || ''),
  });

  blockchainReceipt.itemHash = itemHash;

  const mintResult = await mintReceiptOnChain({
    buyerWallet,
    itemHash,
  });

  blockchainReceipt = {
    ...blockchainReceipt,
    network: mintResult.network || '',
    contractAddress: mintResult.contractAddress || '',
    tokenId: mintResult.tokenId || '',
    txHash: mintResult.txHash || '',
    status: mintResult.status || 'skipped',
    mintedAt: mintResult.mintedAt || undefined,
    failureReason: mintResult.reason || '',
  };

  applyOnChainProvenanceUpdate({
    artifact,
    blockchainReceipt,
    buyerWallet,
    saleSource,
  });

  artifact.omnichannel.lastSyncAt = new Date();
  await artifact.save();

  const sale = await OmnichannelSale.create({
    itemId: artifact._id,
    orderId: orderId || undefined,
    saleSource,
    externalSaleId: externalSaleId || '',
    idempotencyKey: safeIdempotencyKey || undefined,
    paymentMethod: paymentMethod || 'manual',
    amountCents: Number(amountCents || 0),
    currency: String(currency || 'usd').toLowerCase(),
    buyerEmail: buyerEmail || '',
    buyerWallet: buyerWallet || '',
    status: 'completed',
    royaltySettlement: computeRoyaltySettlement({
      artifact,
      amountCents,
      currency,
    }),
    sync: {
      delistedChannels: delistResults
        .filter((result) => result.status === 'success')
        .map((result) => result.channel),
      delistResults,
      syncedAt: new Date(),
    },
    blockchainReceipt,
  });

  return {
    ok: true,
    alreadySold,
    sale,
    item: artifact,
    delistResults,
    blockchainReceipt,
  };
}

module.exports = {
  findItemByChannelOrId,
  completeSaleAcrossChannels,
};
