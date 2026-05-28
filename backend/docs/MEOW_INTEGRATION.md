# Meow Integration (PVA Bazaar Backend)

## Purpose

This integration adds a production-safe server-side bridge to the Meow fintech API so PVA Bazaar can:

- read account info and balances
- read transactions for reconciliation
- initiate USDC transfer calls (admin controlled)
- receive signed Meow webhooks

All secrets stay server-side in `backend` environment variables.

## Routes

Mounted under `/api/meow`:

- `GET /api/meow/health` (public)
- `POST /api/meow/webhooks/meow` (public, signature-verified)
- `GET /api/meow/accounts` (admin session required)
- `GET /api/meow/balances?accountId=...` (admin session required)
- `GET /api/meow/transactions?accountId=...&limit=...` (admin session required)
- `POST /api/meow/transfers/usdc` (admin session required)

## Environment Variables

Set in backend runtime (Render/Vercel/Railway/etc):

- `MEOW_ENABLED=true`
- `MEOW_ENV=sandbox` or `production`
- `MEOW_API_KEY=...`
- `MEOW_ENTITY_ID=...` (if your key is multi-entity)
- `MEOW_ACCOUNT_ID=...` (default account scope)
- `MEOW_WEBHOOK_SECRET=...`
- Optional: `MEOW_BASE_URL=...`

Default base URLs when `MEOW_BASE_URL` is unset:

- sandbox: `https://api.sandbox.meow.com/v1`
- production: `https://api.meow.com/v1`

## Security Notes

- Do not call Meow directly from browser code.
- Keep webhook signature validation enabled in production.
- Use sandbox until transaction flow and reconciliation are verified.
- Restrict admin access before enabling transfer endpoints for operators.

## Suggested Rollout

1. Enable sandbox vars and deploy backend.
2. Verify `GET /api/meow/health` shows configured fields as `true`.
3. Test `accounts`, `balances`, and `transactions` from admin session.
4. Configure Meow webhook target at:
   - `https://api.pvabazaar.org/api/meow/webhooks/meow` (or your backend domain)
5. Validate signature failures and successful accepted events.
6. Enable `transfers/usdc` usage only after internal reconciliation signoff.
7. Move `MEOW_ENV=production` with a new production API key after sandbox pass.
