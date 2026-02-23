/**
 * Twitch EventSub webhook handler.
 * Handles subscription verification and stream.online / stream.offline notifications.
 * Set TWITCH_EVENTSUB_SECRET. Create subscriptions via Twitch API; callback URL: https://api.pvabazaar.org/api/webhooks/twitch
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const StreamSession = require('../models/StreamSession');
const User = require('../models/User');

router.post('/twitch', async (req, res) => {
  const secret = process.env.TWITCH_EVENTSUB_SECRET;
  const messageId = req.headers['twitch-eventsub-message-id'];
  const messageType = req.headers['twitch-eventsub-message-type'];
  const messageTimestamp = req.headers['twitch-eventsub-message-timestamp'];
  const signature = req.headers['twitch-eventsub-message-signature'];
  const subscriptionType = req.headers['twitch-eventsub-subscription-type'];

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
  let payload = {};
  try {
    payload = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(rawBody);
  } catch (_) {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }

  if (secret && signature && messageId && messageTimestamp) {
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(messageId + messageTimestamp + rawBody).digest('hex');
    if (signature !== expected) return res.status(403).json({ ok: false, error: 'Invalid signature' });
  }

  if (messageType === 'webhook_callback_verification') {
    const challenge = payload.challenge;
    if (challenge) return res.type('text/plain').send(challenge);
    return res.status(400).json({ ok: false, error: 'Missing challenge' });
  }

  if (messageType === 'revocation') return res.status(200).send();

  if (messageType === 'notification') {
    const event = payload.event || {};
    const broadcasterId = event.broadcaster_user_id || event.broadcaster_user_login;

    if ((subscriptionType === 'stream.online' || subscriptionType === 'stream.offline') && broadcasterId) {
      try {
        const user = await User.findOne({ 'twitch.id': String(broadcasterId) });
        if (user) {
          const update = subscriptionType === 'stream.online'
            ? { status: 'live', startedAt: new Date() }
            : { status: 'ended', endedAt: new Date() };
          await StreamSession.findOneAndUpdate(
            { userId: user._id, status: { $in: ['scheduled', 'live'] } },
            { $set: update },
            { sort: { createdAt: -1 } }
          );
        }
      } catch (err) {
        console.error('Twitch EventSub handler error:', err.message);
      }
    }
    return res.status(200).send();
  }

  res.status(200).send();
});

module.exports = router;
