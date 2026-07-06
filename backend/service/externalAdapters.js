const axios = require('axios');

class BaseMarketplaceAdapter {
  constructor({
    name,
    webhookUrl = '',
    webhookToken = '',
    pollWebhookUrl = '',
    pollWebhookToken = '',
  }) {
    this.name = name;
    this.webhookUrl = webhookUrl;
    this.webhookToken = webhookToken;
    this.pollWebhookUrl = pollWebhookUrl;
    this.pollWebhookToken = pollWebhookToken;
  }

  normalizeSaleEvent(payload = {}) {
    return {
      channel: this.name,
      externalSaleId: String(
        payload.externalSaleId || payload.orderId || payload.transactionId || '',
      ),
      externalListingId: String(payload.externalListingId || payload.listingId || ''),
      itemId: String(payload.itemId || payload.sku || payload.slug || ''),
      amountCents: Number(payload.amountCents || payload.totalCents || 0),
      currency: String(payload.currency || 'usd').toLowerCase(),
      buyerEmail: String(payload.buyerEmail || ''),
      buyerWallet: String(payload.buyerWallet || ''),
      paymentMethod: String(payload.paymentMethod || 'card').toLowerCase(),
      idempotencyKey: String(
        payload.idempotencyKey ||
          `${this.name}:${payload.externalSaleId || payload.orderId || payload.transactionId || ''}`,
      ),
      raw: payload,
    };
  }

  async delistListing(payload = {}) {
    if (!this.webhookUrl) {
      return {
        channel: this.name,
        status: 'manual_required',
        message: `No connector URL configured for ${this.name}`,
      };
    }

    const headers = this.webhookToken
      ? { Authorization: `Bearer ${this.webhookToken}` }
      : undefined;

    try {
      await axios.post(this.webhookUrl, payload, { timeout: 15000, headers });
      return {
        channel: this.name,
        status: 'success',
        message: 'Delist request sent',
      };
    } catch (error) {
      return {
        channel: this.name,
        status: 'failed',
        message: error?.response?.data?.message || error?.message || 'Connector request failed',
      };
    }
  }

  async pollListingStatus(payload = {}) {
    if (!this.pollWebhookUrl) {
      return {
        channel: this.name,
        status: 'unknown',
        message: `No polling connector configured for ${this.name}`,
      };
    }

    const headers = this.pollWebhookToken
      ? { Authorization: `Bearer ${this.pollWebhookToken}` }
      : undefined;

    try {
      const response = await axios.post(this.pollWebhookUrl, payload, { timeout: 15000, headers });
      const body = response?.data || {};
      const rawStatus = String(body.status || '').toLowerCase();
      const soldFlag = body.sold === true || rawStatus === 'sold';

      if (soldFlag) {
        return {
          channel: this.name,
          status: 'sold',
          externalSaleId: String(body.externalSaleId || body.orderId || body.transactionId || ''),
          amountCents: Number(body.amountCents || body.totalCents || 0),
          currency: String(body.currency || 'usd').toLowerCase(),
          paymentMethod: String(body.paymentMethod || 'card').toLowerCase(),
          buyerEmail: String(body.buyerEmail || ''),
          buyerWallet: String(body.buyerWallet || ''),
          message: String(body.message || 'Listing reported as sold by polling connector'),
        };
      }

      if (rawStatus === 'active' || rawStatus === 'listed' || rawStatus === 'available') {
        return {
          channel: this.name,
          status: 'active',
          message: String(body.message || 'Listing still active'),
        };
      }

      return {
        channel: this.name,
        status: 'unknown',
        message: String(body.message || 'Polling connector returned unknown status'),
      };
    } catch (error) {
      return {
        channel: this.name,
        status: 'error',
        message:
          error?.response?.data?.message || error?.message || 'Polling connector request failed',
      };
    }
  }
}

class EbayAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super({
      name: 'ebay',
      webhookUrl: process.env.EBAY_DELIST_WEBHOOK_URL || '',
      webhookToken: process.env.EBAY_DELIST_WEBHOOK_TOKEN || '',
      pollWebhookUrl: process.env.EBAY_POLL_WEBHOOK_URL || '',
      pollWebhookToken:
        process.env.EBAY_POLL_WEBHOOK_TOKEN || process.env.EBAY_DELIST_WEBHOOK_TOKEN || '',
    });
  }
}

class AmazonAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super({
      name: 'amazon',
      webhookUrl: process.env.AMAZON_DELIST_WEBHOOK_URL || '',
      webhookToken: process.env.AMAZON_DELIST_WEBHOOK_TOKEN || '',
      pollWebhookUrl: process.env.AMAZON_POLL_WEBHOOK_URL || '',
      pollWebhookToken:
        process.env.AMAZON_POLL_WEBHOOK_TOKEN || process.env.AMAZON_DELIST_WEBHOOK_TOKEN || '',
    });
  }
}

class EtsyAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super({
      name: 'etsy',
      webhookUrl: process.env.ETSY_DELIST_WEBHOOK_URL || '',
      webhookToken: process.env.ETSY_DELIST_WEBHOOK_TOKEN || '',
      pollWebhookUrl: process.env.ETSY_POLL_WEBHOOK_URL || '',
      pollWebhookToken:
        process.env.ETSY_POLL_WEBHOOK_TOKEN || process.env.ETSY_DELIST_WEBHOOK_TOKEN || '',
    });
  }
}

class FacebookAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super({
      name: 'facebook',
      webhookUrl: process.env.FACEBOOK_DELIST_WEBHOOK_URL || '',
      webhookToken: process.env.FACEBOOK_DELIST_WEBHOOK_TOKEN || '',
      pollWebhookUrl: process.env.FACEBOOK_POLL_WEBHOOK_URL || '',
      pollWebhookToken:
        process.env.FACEBOOK_POLL_WEBHOOK_TOKEN || process.env.FACEBOOK_DELIST_WEBHOOK_TOKEN || '',
    });
  }
}

class ShopifyAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super({
      name: 'shopify',
      webhookUrl: process.env.SHOPIFY_DELIST_WEBHOOK_URL || '',
      webhookToken: process.env.SHOPIFY_DELIST_WEBHOOK_TOKEN || '',
      pollWebhookUrl: process.env.SHOPIFY_POLL_WEBHOOK_URL || '',
      pollWebhookToken:
        process.env.SHOPIFY_POLL_WEBHOOK_TOKEN || process.env.SHOPIFY_DELIST_WEBHOOK_TOKEN || '',
    });
  }
}

const adapterRegistry = {
  ebay: new EbayAdapter(),
  amazon: new AmazonAdapter(),
  etsy: new EtsyAdapter(),
  facebook: new FacebookAdapter(),
  shopify: new ShopifyAdapter(),
};

function getMarketplaceAdapter(channel) {
  return adapterRegistry[String(channel || '').toLowerCase()] || null;
}

module.exports = {
  BaseMarketplaceAdapter,
  EbayAdapter,
  AmazonAdapter,
  EtsyAdapter,
  FacebookAdapter,
  ShopifyAdapter,
  getMarketplaceAdapter,
};
