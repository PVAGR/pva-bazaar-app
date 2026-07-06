const axios = require('axios');

class EBayAdapter {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://api.sandbox.ebay.com';
    this.accessToken = config.accessToken || '';
    this.appId = config.appId || '';
  }

  isReady() {
    return Boolean(this.accessToken);
  }

  async listArtifact(artifact) {
    if (!this.isReady())
      return { success: false, skipped: true, error: 'eBay credentials missing' };

    try {
      const sku = `ARTIFACT-${artifact.id}`;
      const response = await axios.put(
        `${this.baseURL}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
        {
          sku,
          product: {
            title: artifact.name,
            description: artifact.description,
            imageUrls: artifact.ipfs_image_url ? [artifact.ipfs_image_url] : [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          },
        },
      );
      return { success: true, ebayId: sku, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async endListing(sku) {
    if (!this.isReady())
      return { success: false, skipped: true, error: 'eBay credentials missing' };

    try {
      await axios.post(
        `${this.baseURL}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}/withdraw_from_location`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async checkSales() {
    if (!this.isReady())
      return { success: false, skipped: true, error: 'eBay credentials missing', orders: [] };

    try {
      const response = await axios.get(`${this.baseURL}/sell/fulfillment/v1/order`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return { success: true, orders: response.data.orders || [] };
    } catch (error) {
      return { success: false, error: error.response?.data || error.message, orders: [] };
    }
  }
}

module.exports = EBayAdapter;
