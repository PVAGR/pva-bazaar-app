# Twitch EventSub Setup

EventSub pushes `stream.online` and `stream.offline` events to PVA Bazaar so stream status updates automatically (no polling).

## Prerequisites

- Twitch app with Client ID and Secret (used for OAuth)
- User must connect Twitch in PVA Bazaar (OAuth flow) so `User.twitch.id` is set

## 1. Generate a webhook secret

Generate a random string (32+ chars) for `TWITCH_EVENTSUB_SECRET` and add it to Vercel env vars.

## 2. Create EventSub subscriptions

Use the Twitch API to create subscriptions for your connected users. Example (replace values):

```bash
# Get app access token first
curl -X POST "https://id.twitch.tv/oauth2/token" \
  -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&grant_type=client_credentials"
# Response: { "access_token": "..." }

# Create stream.online subscription
curl -X POST "https://api.twitch.tv/helix/eventsub/subscriptions" \
  -H "Client-Id: YOUR_CLIENT_ID" \
  -H "Authorization: Bearer YOUR_APP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "stream.online",
    "version": "1",
    "condition": {"broadcaster_user_id": "BROADCASTER_TWITCH_ID"},
    "transport": {
      "method": "webhook",
      "callback": "https://api.pvabazaar.org/api/webhooks/twitch",
      "secret": "YOUR_TWITCH_EVENTSUB_SECRET"
    }
  }'

# Create stream.offline subscription (same, change type)
# type: "stream.offline"
```

Repeat for `stream.offline`. Do this for each broadcaster (user) who wants auto status updates.

## 3. Callback URL

- **Production:** `https://api.pvabazaar.org/api/webhooks/twitch`
- **Local:** Use ngrok or similar and point Twitch to your tunnel URL

## 4. Verification

Twitch sends a `webhook_callback_verification` request when you create a subscription. Our handler responds with the `challenge` value. Ensure the route is reachable and `TWITCH_EVENTSUB_SECRET` matches what you used in the transport.

## Optional: Automate subscription creation

When a user connects Twitch via OAuth, you could create EventSub subscriptions from the backend using their `twitch.id`. See [Twitch EventSub API](https://dev.twitch.tv/docs/eventsub).
