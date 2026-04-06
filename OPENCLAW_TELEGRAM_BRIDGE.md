# OpenClaw Telegram Bridge

Use Telegram on your phone to send instructions into the live OpenClaw chat loop.

## What this does

- Polls Telegram updates every 2 minutes via GitHub Actions.
- Forwards incoming text to `POST /api/openclaw/chat`.
- Returns the agent response back to your Telegram chat.
- Restricts usage to approved chat IDs when configured.
- Writes a bridge heartbeat into OpenClaw memory so the website can see live status.
- Tracks connection state, consecutive failures, and last error in OpenClaw memory for autonomous monitoring.

## Files

- `.github/scripts/openclaw-telegram-bridge.mjs`
- `.github/workflows/openclaw-telegram-bridge.yml`
- `.github/workflows/openclaw-queue-worker.yml`
- `.github/workflows/openclaw-realtime-online.yml`
- `backend/scripts/openclaw-queue-worker.js`

## Required GitHub repository secrets

- `OPENCLAW_BACKEND_URL`
  - Example: `https://api.pvabazaar.org`
- `OPENCLAW_BRIDGE_SECRET`
  - Must match backend `OPENCLAW_BRIDGE_SECRET`.
- `TELEGRAM_BOT_TOKEN`
  - Created with BotFather.
- `TELEGRAM_ALLOWED_CHAT_IDS`
  - Comma-separated chat IDs allowed to use the bot.
  - Example: `123456789,-1002223334445`

## Optional GitHub repository secrets

- `TELEGRAM_STATE_KEY`
  - Default: `telegram:lastUpdateId`
- `TELEGRAM_POLL_LIMIT`
  - Default: `15`
- `OPENCLAW_CHAT_TIMEOUT_MS`
  - Default: `14000`
- `OPENCLAW_TELEGRAM_SOURCE`
  - Default: `telegram-openclaw-bridge`

## Queue worker workflow secrets

To keep Telegram replies dynamic without a dedicated VPS worker, enable workflow
`OpenClaw Queue Worker Tick` and configure these secrets:

- `MONGODB_URI`
- `OPENCLAW_WEBHOOK_URL`
- `OPENCLAW_API_KEY` (optional when webhook does not require bearer auth)

The queue worker workflow runs every 5 minutes and executes one dispatch cycle.

## Setup steps (basic)

1. Create a Telegram bot with BotFather and copy the bot token.
2. Send one message to the bot from your Telegram account.
3. Get your Telegram chat ID.
4. Add all required secrets in GitHub repository settings.
5. Run workflow `OpenClaw Realtime Online` manually once.
6. Message your bot: `/start`, `/status`, then normal text.

## Realtime internet mode

Workflow `OpenClaw Realtime Online` keeps the Telegram bridge + responder + queue
worker running continuously for ~55 minutes per run, then restarts on the next
hourly schedule.

For public access from anyone, leave `TELEGRAM_ALLOWED_CHAT_IDS` empty.
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
- Keep `TELEGRAM_ALLOWED_CHAT_IDS` set; do not leave it open in production.
- Rotate secrets immediately if exposed.
