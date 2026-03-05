# PVABazaar.org Web3 MVP (Phase 4)

This doc describes a **very small MVP** for pvabazaar.org that is verification-focused and reuses the existing backend. Per the venture roadmap, Web3 / blockchain work is needed long-term, but the MVP should stay minimal until the cash business (export, Etsy) is stable.

---

## Goal

- Offer a **verification-focused** slice: users can see artifact hashes, provenance, and (where applicable) on-chain status.
- Reuse existing backend (MongoDB, artifact models, blockchain utils) rather than building a new stack.
- No full marketplace or token launch in the MVP – just “see what you hold and verify it.”

---

## MVP scope (minimal)

1. **Artifact registry (existing)**
   - Backend already has `Artifact` model and routes; ensure a minimal API that returns:
     - Artifact id, title, origin, story
     - Storage/metadata hashes (e.g. SHA-256) and any on-chain token/contract reference

2. **Verification dashboard (new, thin)**
   - A simple dashboard view in the app (e.g. under `/verification` or `/dashboard`):
     - List of artifacts the user “holds” (linked by order id, wallet, or email – pick one for MVP).
     - For each: display hash(es), link to block explorer if tokenized, and “verify” copy (what to check and where).

3. **On-chain verification (existing utils)**
   - Reuse `backend/utils/blockchain.js` (or equivalent) for:
     - Reading token ownership / contract state on Base (or configured chain).
     - Exposing “is this token id owned by this address?” in the API.

4. **No new contracts, no new chain**
   - Use existing ABIs and RPC; no deployment of new smart contracts in MVP.

---

## Out of scope for MVP

- In-house cart and checkout (Phase 2 web layer points to Etsy for now).
- New token or NFT drop.
- Decentralized identity / DID beyond what the backend already supports.
- Any feature that requires significant new infra before the export business is cash-flow positive.

---

## Implementation notes

- **Frontend:** Next app (`apps/pva-bazaar-web`) has a Verification page with a verification lookup block (GET /api/verification/artifact/:idOrSlug when API URL is set). Next steps: optional “My artifacts” or “Verify a hash” list.
- **Backend:** `GET /api/verification/artifact/:idOrSlug` exists. Ensure `GET /api/artifacts` (or equivalent) can filter by user/holder and return hash + chain data when you add the dashboard.
- **Auth:** Decide MVP auth (session, API key, or wallet signature) and keep it minimal so verification is the star.

---

## When to build

- **After** Phase 2 web layer is live and Phase 1 ops are stable.
- **When** you have at least a few artifacts (physical or digital) with hashes and optional on-chain refs so the dashboard has something to show.

---

## Decision log (append as you go)

- Use dated bullets for: “MVP auth = X,” “First artifact with on-chain ref added,” “Dashboard shipped on date Y.”
