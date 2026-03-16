# Omnichannel + Web3 Receipt Setup

This implementation adds a hybrid sale-sync layer on top of the current PVA backend.

## What is included

- Smart contract: `contracts/MarketplaceReceipt.sol`
- Sale audit model: `backend/models/OmnichannelSale.js`
- External delisting adapters: `backend/service/omnichannelAdapters.js`
- External adapter classes (eBay/Amazon/etc): `backend/service/externalAdapters.js`
- Blockchain mint bridge: `backend/service/blockchainReceiptService.js`
- Core sold-sync orchestration: `backend/service/omnichannelSyncService.js`
- API routes: `backend/routes/omnichannel.js`
- Stripe checkout bridge: automatic sync trigger in `backend/routes/webhooksStripe.js`

## New API endpoints

- `GET /api/omnichannel/:itemId`
  - Returns sold state and linked marketplace listings.
- `PUT /api/omnichannel/:itemId/listings`
  - Creator/admin updates external listing IDs and sync modes.
- `POST /api/omnichannel/:itemId/mark-sold`
  - Creator/admin manually marks an item sold (off-platform sale), then triggers cross-channel delisting + receipt sync.
- `POST /api/omnichannel/sales/complete`
  - Internal service/admin endpoint to mark item sold and sync all channels.
- `POST /api/omnichannel/sync/poll-run`
  - Admin/service endpoint to run polling-based sale detection for channels configured with `syncMode=polling`.
- `POST /api/omnichannel/webhooks/:channel/sale`
  - External marketplace webhook endpoint (eBay, Etsy, Amazon, Facebook, Shopify).

## Required environment variables

### Service auth

- `OMNICHANNEL_SYNC_SECRET` - required for internal POST `/sales/complete` calls
- `OMNICHANNEL_WEBHOOK_TOKEN` - optional webhook shared token

### Delisting connectors

- `EBAY_DELIST_WEBHOOK_URL`, `EBAY_DELIST_WEBHOOK_TOKEN`
- `ETSY_DELIST_WEBHOOK_URL`, `ETSY_DELIST_WEBHOOK_TOKEN`
- `AMAZON_DELIST_WEBHOOK_URL`, `AMAZON_DELIST_WEBHOOK_TOKEN`
- `FACEBOOK_DELIST_WEBHOOK_URL`, `FACEBOOK_DELIST_WEBHOOK_TOKEN`
- `SHOPIFY_DELIST_WEBHOOK_URL`, `SHOPIFY_DELIST_WEBHOOK_TOKEN`

### Polling connectors (optional)

- `EBAY_POLL_WEBHOOK_URL`, `EBAY_POLL_WEBHOOK_TOKEN`
- `ETSY_POLL_WEBHOOK_URL`, `ETSY_POLL_WEBHOOK_TOKEN`
- `AMAZON_POLL_WEBHOOK_URL`, `AMAZON_POLL_WEBHOOK_TOKEN`
- `FACEBOOK_POLL_WEBHOOK_URL`, `FACEBOOK_POLL_WEBHOOK_TOKEN`
- `SHOPIFY_POLL_WEBHOOK_URL`, `SHOPIFY_POLL_WEBHOOK_TOKEN`

### Receipt token minting


## Provenance and Duplicate Detection

- `PROVENANCE_FEED_SIGNING_KEY`: Optional HMAC key used to sign `GET /api/items/:slugOrId/provenance-feed` payloads.
- `PVA_RESALE_FEE_BPS`: Optional platform resale fee basis points (default `250` = 2.5%).

## External Reverse Image Lookup (Optional)

- `REVERSE_IMAGE_PROVIDER_URL`: HTTPS endpoint for reverse-image lookup provider.
- `REVERSE_IMAGE_PROVIDER_TOKEN`: Optional bearer token for provider auth.
- `REVERSE_IMAGE_PROVIDER_TIMEOUT_MS`: Optional request timeout, default `7000`.
- `REVERSE_IMAGE_PROVIDER_MAX_RESULTS`: Optional max normalized match rows, default `8`.
- `REVERSE_IMAGE_DUPLICATE_THRESHOLD`: Confidence threshold for likely duplicate, default `0.92`.
- `PROVENANCE_ENFORCE_REVERSE_IMAGE`: If `true`, item creation is blocked when reverse-image likely duplicate is detected.

## Phase 2 Provenance Hashing Notes

- `POST /api/items/provenance/check` now computes image fingerprints from submitted image content when available:
  - `data:*;base64,...` payloads are decoded and SHA-256 hashed from bytes.
  - plain base64 strings are decoded and hashed when recognized.
  - external image URLs are normalized and hashed as stable references.
- Candidate response includes stronger image fingerprint data (`imageHash`, `imageCount`, `imageHashMode`) before item creation.
- Artifact provenance stores image hash metadata under `provenance.imageHashDetails`.
- When receipt minting succeeds during sale sync, artifact provenance is updated automatically:
  - `provenance.chain` receives network, contract, token standard, and token id.
  - `provenance.ownershipTimeline` appends the buyer transfer with tx hash.
  - `blockchainDetails` is synchronized with the minted token metadata.

### Crypto checkout settlement

- `CRYPTO_TREASURY_WALLET` (required)
- `CRYPTO_NETWORK` (example: `base` or `base-sepolia`)
- `CRYPTO_CHAIN_ID` (example: `8453` mainnet, `84532` testnet)
- `CRYPTO_USD_PER_ETH` (pricing quote input, example `3000`)

## Sale flow

1. A sale is confirmed (Stripe or external webhook).
2. Item is marked sold in DB (`omnichannel.soldState`).
3. The sync service attempts to delist the item from all linked channels.
4. If a buyer wallet is available, a receipt token mint is attempted.
5. A persistent sale audit row is stored in `OmnichannelSale`.

## Crypto buyer flow

1. Buyer clicks `Buy with Crypto` on item page.
2. Frontend calls `POST /api/checkout/crypto/prepare` to reserve inventory and receive quote parameters.
3. Buyer wallet submits native token transfer.
4. Frontend calls `POST /api/checkout/crypto/confirm` with tx hash.
5. Backend verifies tx status, chain id, recipient, and paid amount, marks order paid, finalizes inventory, then runs omnichannel sold sync.

## Notes

- Stripe checkout completion now automatically triggers omnichannel sync (`saleSource: pva`).
- Minting is non-blocking for order completion; mint failures are recorded in DB.
- Current implementation provides adapter webhooks for external platforms; direct native eBay/Amazon SDK integrations can be added later behind the same adapter interface.

## Polling worker automation

Use the backend worker to continuously run polling sync without manual button presses:

- Command: `cd backend && npm run omnichannel:poll:worker`
- Optional env: `OMNICHANNEL_POLL_INTERVAL_MS` (default 300000)
- Optional env: `OMNICHANNEL_POLL_LIMIT` (default 50)

This worker connects to MongoDB, runs one immediate poll cycle on startup, then repeats at the configured interval.
