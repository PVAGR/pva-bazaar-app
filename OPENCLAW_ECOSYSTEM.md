# OpenClaw Ecosystem

This repo now treats the live system as four linked keystones:

- Website: the public pvabazaar.org surface and admin console.
- OpenClaw: the queue, memory, watchdog, and dispatch layer.
- Ollama: the preferred brain when `OLLAMA_BASE_URL` is available.
- Telegram: the phone bridge that routes messages into OpenClaw.

## Live commands

- `/status` in Telegram returns the OpenClaw bridge status.
- `/ecosystem` returns the combined website, OpenClaw, Ollama, and Telegram snapshot.
- The OpenClaw admin tab now shows the same ecosystem snapshot inside the website.

## Configuration

- `OLLAMA_BASE_URL` and `OLLAMA_MODEL` are read by the OpenClaw responder workflow.
- `OPENCLAW_BACKEND_URL`, `OPENCLAW_BRIDGE_SECRET`, and `GITHUB_TOKEN` still control the OpenClaw responder.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_CHAT_IDS` still control the Telegram bridge.

## Behavior

- The OpenClaw responder writes a heartbeat into memory every run.
- The Telegram bridge writes a heartbeat into memory every run.
- The website reads those heartbeats and renders the live keystone state.
- If Ollama is not reachable, the responder falls back to GitHub Models.
