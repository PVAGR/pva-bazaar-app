# OpenClaw Telegram Bridge

Use Telegram on your phone to send instructions into the live OpenClaw chat loop.

## What this does

- Polls Telegram updates every 2 minutes via GitHub Actions.
- Forwards incoming text to `POST /api/openclaw/chat`.
- Returns the agent response back to your Telegram chat.
- Restricts usage to approved chat IDs when configured.

## Files

- `.github/scripts/openclaw-telegram-bridge.mjs`
- `.github/workflows/openclaw-telegram-bridge.yml`

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

## Setup steps (basic)

1. Create a Telegram bot with BotFather and copy the bot token.
2. Send one message to the bot from your Telegram account.
3. Get your Telegram chat ID.
4. Add all required secrets in GitHub repository settings.
5. Run workflow `OpenClaw Telegram Bridge` manually once.
6. Message your bot: `/start`, `/status`, then normal text.

## Commands in Telegram

- `/start` confirms bridge status.
- `/help` lists commands.
- `/status` checks OpenClaw status summary.
- Any other text is sent to OpenClaw chat.

## Security notes

- Never commit bot tokens or bridge secrets in code.
- Keep `TELEGRAM_ALLOWED_CHAT_IDS` set; do not leave it open in production.
- Rotate secrets immediately if exposed.
