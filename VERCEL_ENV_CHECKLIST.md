# Vercel Environment Variables Checklist

Use this as the single source of truth for backend production env vars.
Do not store real secret values in git.

## Backend Project (Vercel) Required

- `JWT_SECRET`
- `MONGODB_URI`
- `NODE_ENV=production`
- `ALLOWED_ORIGIN=https://pvabazaar.org`
- `ADMIN_SECRET_CODE`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ETHEREUM_RPC_URL`

## Backend Project (Vercel) Optional / Feature-Based

- `OPENAI_API_KEY` (Oracle AI assessments)
- `OAUTH_TOKEN_ENC_KEY` (required for OAuth token storage; set a random value and keep it secret)
- `OAUTH_FRONTEND_RETURN_URL` (default: `https://pvabazaar.org/#/streams`)
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `TWITCH_REDIRECT_URI` (recommended exact match for Twitch console; example: `https://api.pvabazaar.org/api/oauth/twitch/callback`)
- `TWITCH_EVENTSUB_SECRET` (EventSub webhook secret; callback URL: `https://api.pvabazaar.org/api/webhooks/twitch`)
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI` (recommended exact match for Google console; example: `https://api.pvabazaar.org/api/oauth/youtube/callback`)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `LEGACY_MODE` (recommended `false`)
- `SENTRY_DSN` (error monitoring; optional but recommended for production)

## GitHub Actions Secrets (for backend deployment workflow)

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID` (or repository/org variable `VERCEL_ORG_ID`)
- `VERCEL_BACKEND_PROJECT_ID` (or `VERCEL_PROJECT_ID`)

## Validation Steps

1. Ensure all required backend vars exist in Vercel project settings.
2. Trigger `.github/workflows/deploy-backend-live.yml`.
3. Run `npm run verify:live`.
4. Run `npm run verify:live:strict` for release gating.
