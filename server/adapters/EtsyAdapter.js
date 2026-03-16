const axios = require('axios');

class EtsyAdapter {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://openapi.etsy.com/v3/application';
    this.accessToken = config.accessToken || '';
    this.apiKey = config.apiKey || '';
    this.shopId = config.shopId || '';
  }

  isReady() {
    return Boolean(this.accessToken && this.apiKey && this.shopId);
  }

  async listArtifact(artifact) {
    if (!this.isReady()) return { success: false, skipped: true, error: 'Etsy credentials missing' };

    try {
      const response = await axios.post(
        `${this.baseURL}/shops/${this.shopId}/listings`,
        {
          title: artifact.name,
          description: artifact.description,
          price: {
            amount: Math.round(Number(artifact.price || 0) * 100),
            currency_code: 'USD',
          },
          images: artifact.ipfs_image_url ? [{ url: artifact.ipfs_image_url }] : [],
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
        },
      );
      return { success: true, etsyId: response.data.listing_id };
    } catch (error) {
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async deleteListing(listingId) {
    if (!this.isReady()) return { success: false, skipped: true, error: 'Etsy credentials missing' };

    try {
      await axios.delete(`${this.baseURL}/shops/${this.shopId}/listings/${listingId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'x-api-key': this.apiKey,
        },
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data || error.message };
    }
  }
}

module.exports = EtsyAdapter;
