# OpenClaw Telegram Bridge

Use Telegram on your phone to send instructions into the live OpenClaw chat loop.

## What this does

- Receives Telegram updates instantly through backend webhook route `POST /webhooks/telegram/updates`.
- Forwards incoming text to `POST /api/openclaw/chat`.
- Returns the agent response back to your Telegram chat.
- Falls back to direct Ollama reply when queue/webhook reply is delayed, so users still receive immediate responses.
- Restricts usage to approved chat IDs when configured.
- Writes a bridge heartbeat into OpenClaw memory so the website can see live status.
- Tracks connection state, consecutive failures, and last error in OpenClaw memory for autonomous monitoring.

## Files

- `.github/scripts/openclaw-telegram-bridge.mjs`
- `.github/workflows/openclaw-telegram-bridge.yml`
- `backend/routes/webhooksTelegram.js`
- `backend/routes/openclaw.js`
- `backend/api/index.js`
- `.github/workflows/openclaw-queue-worker.yml`
- `.github/workflows/openclaw-realtime-online.yml`
- `backend/scripts/openclaw-queue-worker.js`

## Required backend environment variables

- `TELEGRAM_BOT_TOKEN`
  - Created with BotFather.
- `TELEGRAM_PUBLIC_MODE`
  - Set to `true` for public access.
- `TELEGRAM_WEBHOOK_URL`
  - Example: `https://api.pvabazaar.org/webhooks/telegram/updates`
- `TELEGRAM_WEBHOOK_SECRET`
  - Shared secret token set during webhook registration.

## Optional backend environment variables

- `OPENCLAW_CHAT_TIMEOUT_MS`
  - Default: `12000`
- `OPENCLAW_TELEGRAM_SOURCE`
  - Default: `telegram-openclaw-webhook`
- `TELEGRAM_ALLOWED_CHAT_IDS`
  - Optional private allowlist. Leave empty for public mode.

## Webhook registration

Use OpenClaw API endpoint to register Telegram webhook after deploy:

- `POST /api/openclaw/telegram/register-webhook`
- Auth: admin JWT or `X-OpenClaw-Secret`
- Request body options:
  - `url`
  - `secretToken`
  - `maxConnections`
  - `allowedUpdates`

## Queue worker workflow secrets (optional)

Workflow `OpenClaw Queue Worker Tick` is optional for manual queue replay and
advanced webhook dispatch. Configure these secrets only if you use it:

- `MONGODB_URI`
- `OPENCLAW_WEBHOOK_URL`
- `OPENCLAW_API_KEY` (optional when webhook does not require bearer auth)

This workflow is manual (`workflow_dispatch`) and executes one dispatch cycle.

## Setup steps (basic)

1. Create a Telegram bot with BotFather and copy the bot token.
2. Send one message to the bot from your Telegram account.
3. Configure required backend env variables (token, webhook URL, webhook secret).
4. Call `POST /api/openclaw/telegram/register-webhook`.
5. Confirm with Telegram `getWebhookInfo` that URL is live.
6. Message your bot: `/start`, `/status`, then normal text.

## Polling fallback mode

Workflow `OpenClaw Telegram Bridge` is now manual only (`workflow_dispatch`) and
serves as emergency polling fallback if webhook transport is unavailable.

Workflow `OpenClaw Realtime Online` can still be used as redundancy path.

For public access from anyone, set `TELEGRAM_PUBLIC_MODE=true`.
Leaving `TELEGRAM_ALLOWED_CHAT_IDS` empty also permits public access.
If you want private access, set `TELEGRAM_ALLOWED_CHAT_IDS` to explicit IDs.

## Commands in Telegram

- `/start` confirms bridge status.
- `/help` lists commands.
- `/status` checks OpenClaw status summary.
- `/queue` shows OpenClaw queue and worker health.
- `/recover` triggers OpenClaw recovery/replay from Telegram.
- `/ecosystem` shows the combined website, OpenClaw, Ollama, and Telegram snapshot.
- Any other text is sent to OpenClaw chat.

## Bridge state memory keys

- `ecosystem:telegram-bridge:lastHeartbeat`
- `ecosystem:telegram-bridge:connectionState`
- `ecosystem:telegram-bridge:consecutiveFailures`
- `ecosystem:telegram-bridge:lastError`
- `telegram:lastUpdateId`

## Security notes

- Never commit bot tokens or bridge secrets in code.
- Public mode is intentional here; only set `TELEGRAM_ALLOWED_CHAT_IDS` if you want to lock it down later.
- Rotate secrets immediately if exposed.
