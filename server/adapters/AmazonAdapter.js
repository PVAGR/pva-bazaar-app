const axios = require('axios');

class AmazonAdapter {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://sellingpartnerapi-na.amazon.com';
    this.accessToken = config.accessToken || '';
    this.refreshToken = config.refreshToken || '';
  }

  isReady() {
    return Boolean(this.accessToken);
  }

  async updateInventory(sku, quantity) {
    if (!this.isReady())
      return { success: false, skipped: true, error: 'Amazon credentials missing' };

    try {
      await axios.put(
        `${this.baseURL}/fba/inventory/v1/summaries`,
        {
          summaries: [
            {
              sku,
              quantity,
              marketplaceId: 'ATVPDKIKX0DER',
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'x-amz-access-token': this.accessToken,
          },
        },
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async checkOrders() {
    if (!this.isReady())
      return { success: false, skipped: true, error: 'Amazon credentials missing', orders: [] };

    try {
      const response = await axios.get(`${this.baseURL}/orders/v0/orders`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return { success: true, orders: response.data?.payload?.orders || [] };
    } catch (error) {
      return { success: false, error: error.response?.data || error.message, orders: [] };
    }
  }
}

module.exports = AmazonAdapter;
