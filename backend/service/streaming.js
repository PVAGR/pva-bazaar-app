/**
 * Streaming Service
 * Integrates with external streaming platforms (Twitch, Kick, YouTube)
 * and decentralized alternatives (Livepeer)
 */

const axios = require('axios');

class StreamingService {
  constructor() {
    // Twitch API
    this.twitchClientId = process.env.TWITCH_CLIENT_ID;
    this.twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;
    this.twitchBaseUrl = 'https://api.twitch.tv/helix';
    this.twitchAccessToken = null;

    // Kick API (community/unofficial)
    this.kickBaseUrl = 'https://kick.com/api/v1';

    // Livepeer API (decentralized livestreaming)
    this.livepeerApiKey = process.env.LIVEPEER_API_KEY;
    this.livepeerBaseUrl = 'https://livepeer.studio/api';
  }

  /**
   * Get Twitch OAuth token (app access token)
   */
  async getTwitchToken() {
    if (this.twitchAccessToken) return this.twitchAccessToken;

    if (!this.twitchClientId || !this.twitchClientSecret) {
      throw new Error('Twitch credentials not configured. Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.');
    }

    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: this.twitchClientId,
          client_secret: this.twitchClientSecret,
          grant_type: 'client_credentials',
        },
      });

      this.twitchAccessToken = response.data.access_token;
      return this.twitchAccessToken;
    } catch (error) {
      console.error('Twitch OAuth error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Twitch');
    }
  }

  /**
   * Get Twitch stream status for a user
   * @param {string} username - Twitch username
   * @returns {Promise<{isLive: boolean, viewerCount: number, title: string}>}
   */
  async getTwitchStreamStatus(username) {
    const token = await this.getTwitchToken();

    try {
      const response = await axios.get(`${this.twitchBaseUrl}/streams`, {
        params: { user_login: username },
        headers: {
          'Client-ID': this.twitchClientId,
          'Authorization': `Bearer ${token}`,
        },
      });

      const streamData = response.data.data[0];

      if (!streamData) {
        return { isLive: false, viewerCount: 0, title: '' };
      }

      return {
        isLive: true,
        viewerCount: streamData.viewer_count,
        title: streamData.title,
        startedAt: streamData.started_at,
      };
    } catch (error) {
      console.error('Twitch stream status error:', error.message);
      return { isLive: false, viewerCount: 0, title: '' };
    }
  }

  /**
   * Create Livepeer stream (decentralized alternative)
   * @param {string} name - Stream name
   * @returns {Promise<{streamKey: string, playbackId: string, streamUrl: string}>}
   */
  async createLivepeerStream(name) {
    if (!this.livepeerApiKey) {
      throw new Error('Livepeer API key not configured. Set LIVEPEER_API_KEY.');
    }

    try {
      const response = await axios.post(
        `${this.livepeerBaseUrl}/stream`,
        {
          name,
          profiles: [
            { name: '720p', bitrate: 2000000, fps: 30, width: 1280, height: 720 },
            { name: '480p', bitrate: 1000000, fps: 30, width: 854, height: 480 },
            { name: '360p', bitrate: 500000, fps: 30, width: 640, height: 360 },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.livepeerApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const stream = response.data;

      return {
        streamKey: stream.streamKey,
        playbackId: stream.playbackId,
        streamUrl: `rtmp://rtmp.livepeer.com/live/${stream.streamKey}`,
        playbackUrl: `https://livepeer.studio/api/playback/${stream.playbackId}`,
      };
    } catch (error) {
      console.error('Livepeer stream creation error:', error.response?.data || error.message);
      throw new Error('Failed to create Livepeer stream');
    }
  }

  /**
   * Get Livepeer stream status
   * @param {string} streamId - Livepeer stream ID
   * @returns {Promise<{isActive: boolean, viewerCount: number}>}
   */
  async getLivepeerStreamStatus(streamId) {
    if (!this.livepeerApiKey) {
      throw new Error('Livepeer API key not configured.');
    }

    try {
      const response = await axios.get(`${this.livepeerBaseUrl}/stream/${streamId}`, {
        headers: {
          'Authorization': `Bearer ${this.livepeerApiKey}`,
        },
      });

      const stream = response.data;

      return {
        isActive: stream.isActive,
        viewerCount: stream.viewerCount || 0,
      };
    } catch (error) {
      console.error('Livepeer stream status error:', error.message);
      return { isActive: false, viewerCount: 0 };
    }
  }

  /**
   * Validate webhook signature (for Twitch EventSub)
   * @param {string} body - Raw request body
   * @param {string} signature - Twitch signature header
   * @param {string} messageId - Twitch message ID
   * @param {string} timestamp - Twitch timestamp
   * @returns {boolean}
   */
  validateTwitchWebhook(body, signature, messageId, timestamp) {
    const crypto = require('crypto');
    const secret = process.env.TWITCH_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('Twitch webhook secret not configured');
      return false;
    }

    const message = messageId + timestamp + body;
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    return signature === expectedSignature;
  }
}

// Singleton instance
const streamingService = new StreamingService();

module.exports = streamingService;
