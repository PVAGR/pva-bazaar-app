const cron = require('node-cron');
const db = require('./db');
const royaltyTracker = require('./royaltyTracker');
const EBayAdapter = require('./adapters/eBayAdapter');
const AmazonAdapter = require('./adapters/AmazonAdapter');
const EtsyAdapter = require('./adapters/EtsyAdapter');

class SyncEngine {
  constructor() {
    this.eBay = new EBayAdapter({
      accessToken: process.env.EBAY_ACCESS_TOKEN,
      appId: process.env.EBAY_APP_ID,
    });

    this.amazon = new AmazonAdapter({
      accessToken: process.env.AMAZON_ACCESS_TOKEN,
      refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    });

    this.etsy = new EtsyAdapter({
      accessToken: process.env.ETSY_ACCESS_TOKEN,
      apiKey: process.env.ETSY_API_KEY,
      shopId: process.env.ETSY_SHOP_ID,
    });

    this.syncLocks = new Set();
    this.cronStarted = false;
  }

  extractArtifactIdFromSku(sku) {
    if (!sku) return null;
    const match = String(sku).match(/ARTIFACT-(\d+)/i);
    return match ? Number(match[1]) : null;
  }

  persistExternalSyncState(artifactId, data) {
    db.prepare(`
      UPDATE artifacts
      SET external_platforms = ?,
          external_listing_ids = ?,
          external_sync_status = ?,
          external_sync_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      JSON.stringify(data.platforms || []),
      JSON.stringify(data.listingIds || {}),
      String(data.status || ''),
      Number(artifactId),
    );
  }

  async syncAllPlatforms(artifactId, saleDetails) {
    const lockKey = String(artifactId);
    if (this.syncLocks.has(lockKey)) {
      return { success: false, skipped: true, error: 'Sync already in progress for this artifact' };
    }

    this.syncLocks.add(lockKey);

    try {
      const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(Number(artifactId));
      if (!artifact) return { success: false, error: 'Artifact not found' };
      if (String(artifact.status || '').toUpperCase() === 'SOLD') {
        return { success: true, duplicate: true, message: 'Artifact already sold' };
      }

      db.prepare(`
        UPDATE artifacts
        SET status = 'SOLD',
            owner_address = ?,
            blockchain_tx_hash = ?,
            sold_at = CURRENT_TIMESTAMP,
            sale_platform = ?,
            sale_price = ?
        WHERE id = ?
      `).run(
        String(saleDetails.buyerAddress || ''),
        String(saleDetails.txHash || ''),
        String(saleDetails.platform || ''),
        Number(saleDetails.price || 0),
        Number(artifactId),
      );

      try {
        const saleType = String(
          saleDetails.saleType || (String(saleDetails.platform || '').toUpperCase() === 'WEBSITE' ? 'PRIMARY' : 'SECONDARY'),
        ).toUpperCase();

        royaltyTracker.recordRoyaltyEvent({
          artifactId: Number(artifactId),
          saleType,
          platform: String(saleDetails.platform || 'UNKNOWN').toUpperCase(),
          salePrice: Number(saleDetails.price || 0),
          royaltyRate: saleDetails.royaltyRate,
          creatorAddress: artifact.creator_address || '',
          buyerAddress: String(saleDetails.buyerAddress || ''),
          txHash: String(saleDetails.txHash || ''),
          metadata: {
            syncSource: 'syncEngine',
            soldAt: new Date().toISOString(),
          },
        });
      } catch (royaltyError) {
        console.warn(`Royalty tracking failed for artifact ${artifactId}: ${royaltyError.message}`);
      }

      const sku = `ARTIFACT-${artifactId}`;
      const results = {
        ebay: await this.eBay.endListing(sku),
        amazon: await this.amazon.updateInventory(sku, 0),
        etsy: artifact.etsy_listing_id
          ? await this.etsy.deleteListing(artifact.etsy_listing_id)
          : { success: true, skipped: true },
      };

      const delistSuccesses = [results.ebay?.success, results.amazon?.success, results.etsy?.success]
        .filter((v) => typeof v === 'boolean');
      const allDelisted = delistSuccesses.length > 0 && delistSuccesses.every(Boolean);

      this.persistExternalSyncState(artifactId, {
        platforms: allDelisted ? [] : ['EBAY', 'AMAZON', 'ETSY'],
        listingIds: allDelisted ? {} : {
          ebaySku: artifact.ebay_sku || sku,
          amazonSku: artifact.amazon_sku || sku,
          etsyListingId: artifact.etsy_listing_id || '',
        },
        status: allDelisted ? 'SOLD_SYNCED' : 'SOLD_SYNC_PARTIAL',
      });

      return { success: true, results };
    } catch (error) {
      this.persistExternalSyncState(artifactId, {
        platforms: ['EBAY', 'AMAZON', 'ETSY'],
        listingIds: {},
        status: `SOLD_SYNC_FAILED:${error.message}`,
      });
      return { success: false, error: error.message };
    } finally {
      this.syncLocks.delete(lockKey);
    }
  }

  async listToAllPlatforms(artifact) {
    const sku = `ARTIFACT-${artifact.id}`;
    const ipfsImageUrl = artifact.ipfs_image_hash
      ? `https://gateway.pinata.cloud/ipfs/${artifact.ipfs_image_hash}`
      : artifact.ipfs_image_cid
        ? `https://gateway.pinata.cloud/ipfs/${artifact.ipfs_image_cid}`
        : '';

    const payload = {
      ...artifact,
      ipfs_image_url: ipfsImageUrl,
    };

    const results = {
      ebay: await this.eBay.listArtifact(payload),
      amazon: await this.amazon.updateInventory(sku, 1),
      etsy: await this.etsy.listArtifact(payload),
    };

    if (results.ebay.success) {
      db.prepare('UPDATE artifacts SET ebay_sku = ? WHERE id = ?').run(sku, artifact.id);
    }
    if (results.amazon.success) {
      db.prepare('UPDATE artifacts SET amazon_sku = ? WHERE id = ?').run(sku, artifact.id);
    }
    if (results.etsy.success && results.etsy.etsyId) {
      db.prepare('UPDATE artifacts SET etsy_listing_id = ? WHERE id = ?').run(String(results.etsy.etsyId), artifact.id);
    }

    const platforms = [];
    const listingIds = {};

    if (results.ebay.success) {
      platforms.push('EBAY');
      listingIds.ebaySku = sku;
      if (results.ebay.listingId) listingIds.ebayListingId = String(results.ebay.listingId);
    }

    if (results.amazon.success) {
      platforms.push('AMAZON');
      listingIds.amazonSku = sku;
      if (results.amazon.listingId) listingIds.amazonListingId = String(results.amazon.listingId);
    }

    if (results.etsy.success) {
      platforms.push('ETSY');
      if (results.etsy.etsyId) listingIds.etsyListingId = String(results.etsy.etsyId);
    }

    const hasFailures = ['ebay', 'amazon', 'etsy'].some((key) => results[key] && results[key].success === false);

    this.persistExternalSyncState(artifact.id, {
      platforms,
      listingIds,
      status: hasFailures ? 'LISTED_PARTIAL' : 'LISTED',
    });

    return results;
  }

  startScheduledSync() {
    if (this.cronStarted) return;

    cron.schedule('*/5 * * * *', async () => {
      console.log('Running scheduled external sales check...');

      const ebaySales = await this.eBay.checkSales();
      if (ebaySales.success && Array.isArray(ebaySales.orders)) {
        for (const order of ebaySales.orders) {
          const sku = order?.lineItems?.[0]?.sku || '';
          const artifactId = this.extractArtifactIdFromSku(sku);
          if (!artifactId) continue;

          await this.syncAllPlatforms(artifactId, {
            platform: 'EBAY',
            buyerAddress: order?.buyer?.username || order?.buyerUsername || '',
            txHash: order?.orderId || '',
            price: Number(order?.total?.value || 0),
          });
        }
      }

      const amazonSales = await this.amazon.checkOrders();
      if (amazonSales.success && Array.isArray(amazonSales.orders)) {
        for (const order of amazonSales.orders) {
          const artifactId = this.extractArtifactIdFromSku(order?.SellerOrderId || order?.sellerOrderId || '');
          if (!artifactId) continue;

          await this.syncAllPlatforms(artifactId, {
            platform: 'AMAZON',
            buyerAddress: order?.BuyerInfo?.BuyerEmail || order?.buyerEmail || '',
            txHash: order?.AmazonOrderId || order?.amazonOrderId || '',
            price: Number(order?.OrderTotal?.Amount || order?.orderTotal || 0),
          });
        }
      }
    });

    this.cronStarted = true;
    console.log('Scheduled sync started (every 5 minutes)');
  }
}

module.exports = new SyncEngine();
