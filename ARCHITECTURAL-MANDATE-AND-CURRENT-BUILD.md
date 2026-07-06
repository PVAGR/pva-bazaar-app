# The Alchemical Web: Architectural Mandate & Current Build

This document bridges the **philosophical and architectural mandate** for pvabazaar.org (the “digital temple,” anti-Druj, Conscious Player) with **what actually exists in this repository**. It is the reference for any LLM coder or human working from the mandate so they do not rebuild from scratch or assume a different stack.

---

## 1. Core Directive

- **Identity:** pvabazaar.org is a personal digital operating system and sanctuary for the founder as a “Conscious Player,” embodying **anti-Druj** (no deceit; truth through verifiability).
- **Goal:** A minimal viable structure that can interact with the **first scarce-knowledge artifact**—AI-verified retro games—while avoiding unnecessary backend complexity until proven by use.
- **Build principle:** Add onto what exists; do not destroy. The mandate was written with Next.js/Supabase in mind as one possible stack; **this repo implements the same vision on the existing stack** (Vite + React, Express + MongoDB, Vercel).

---

## 2. Mandate → Current Implementation Map

| Mandate component                | Description in mandate                                                                                                                               | Current implementation in this repo                                                                                                                                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Philosophy in code**           | `lib/philosophy.ts` with `MISSION_STATEMENT`, `VERIFICATION_STANDARD`; comments explain “Why.”                                                       | **`Frontend/src/lib/philosophy.js`** — same constants; “Why” in comments.                                                                                                                                                                                                                       |
| **Framework**                    | Next.js 14 App Router, TypeScript.                                                                                                                   | **Vite + React (HashRouter)** — existing frontend; all mandate features implemented in JSX.                                                                                                                                                                                                     |
| **Separation of concerns**       | Core Logic (verification) vs Presentation (storefront).                                                                                              | **Core logic:** `scripts/verify_artifact.py`, `backend/routes/verification.js`, `VerificationResult` model. **Presentation:** `Frontend/src/pages/ArtifactDetailPage.jsx`, `VerificationBadge.jsx`, Layout, etc.                                                                                |
| **Navigation**                   | Minimal bar: Archive, Verification, Manifesto, Cart.                                                                                                 | **`Frontend/src/components/Layout.jsx`** — Archive, Verification, Manifesto, Cart, plus Marketplace, Oracle, About.                                                                                                                                                                             |
| **Product page**                 | Dynamic route (e.g. `app/artifact/[slug]/page.tsx`), high-res image, Scarcity Index, Verification Hash (expandable), Lore, “Initiate Acquisition.”   | **`/#/artifact/:slug`** → **`ArtifactDetailPage.jsx`** — same content and CTAs; Lore from `item.lore` or `item.description`.                                                                                                                                                                    |
| **Alchemical Digital aesthetic** | Dark, obsidian-like, gold accents, minimal; high contrast; Framer Motion “memories recovering”; aligned language (Claim Artifact, Preserve History). | **`ArtifactDetailPage.css`** (dark + gold); **`VerificationBadge`** + **`VerificationHashBlock`** with `theme="alchemical"`; **Framer Motion** on artifact page; “Initiate Acquisition,” “Preserve history.”                                                                                    |
| **Verification engine**          | Python script (SHA-256 vs trusted DB), GitHub Action, Supabase Edge Function for certificate ID, `VerificationBadge.tsx`.                            | **`scripts/verify_artifact.py`**, **`.github/workflows/verify.yml`**, **Express API** (`/api/verification`) + **MongoDB** `VerificationResult` (certificate ID); optional **Supabase** Edge Functions in `/supabase/functions/`. **`VerificationBadge.jsx`** + **`VerificationHashBlock.jsx`**. |
| **Trusted hash DB**              | Reference hashes (e.g. Archive.org).                                                                                                                 | **`scripts/trusted_hashes.json`** — you add entries.                                                                                                                                                                                                                                            |
| **Certificate of Authenticity**  | Stored in DB; unique ID; shown on product.                                                                                                           | **`VerificationResult.certificateId`** (e.g. `PVA-CERT-...`); GET `/api/verification/artifact/:idOrSlug` and `/api/verification/certificate/:id`; badge and expandable hash on artifact page.                                                                                                   |
| **“Integrity Compromised”**      | Clear when verification fails.                                                                                                                       | Badge and script both use **“Integrity Compromised”** and **“Unverified”** explicitly.                                                                                                                                                                                                          |
| **Stripe webhook → fulfillment** | On payment success: grant download, add row to `physical_fulfillment`, send confirmation + Certificate PDF.                                          | **`backend/routes/webhooksStripe.js`** — download token, **`PhysicalFulfillment`** (MongoDB), **`FulfillmentTransactionLog`**, **sendFulfillmentConfirmationEmail** (download link + certificate link). Optional **Supabase** `stripe-webhook` function.                                        |
| **Payment failure**              | User notified gracefully; no hidden traps.                                                                                                           | **`sendPaymentFailedEmail`**; reservation released; logged.                                                                                                                                                                                                                                     |
| **Immutable transaction log**    | For audit.                                                                                                                                           | **`FulfillmentTransactionLog`** (MongoDB); optional Supabase `fulfillment_transaction_log`.                                                                                                                                                                                                     |
| **Vercel deployment**            | Push to `main` → auto-deploy.                                                                                                                        | Repo configured for Vercel; **`docs/DEPLOYMENT.md`** documents webhook URL and env.                                                                                                                                                                                                             |
| **Handoff document**             | Single source of truth: What exists, What you must provide, Commit & rollout checklist, File list, How to work together.                             | **`HANDOFF-AND-ROLLOUT.md`** — execution checklist and inventory.                                                                                                                                                                                                                               |
| **Ritual of Addition**           | How to add new artifacts.                                                                                                                            | **`docs/RITUAL-OF-ADDITION.md`** — data, verification hash, optional Stripe/CI.                                                                                                                                                                                                                 |
| **MDX / Obsidian lore**          | Lore in MDX; Obsidian-compatible workflow.                                                                                                           | Lore is **plain text** from `item.lore` or `item.description`. MDX can be added later (e.g. react-markdown + MDX) without changing the mandate.                                                                                                                                                 |

---

## 3. Current Stack (Do Not Assume Next.js or Supabase-Only)

| Layer            | Technology in this repo                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| **Frontend**     | Vite, React 18, React Router (HashRouter), Framer Motion                                          |
| **Backend**      | Express (Node), MongoDB (Mongoose)                                                                |
| **Hosting**      | Vercel (frontend static + serverless API)                                                         |
| **Payments**     | Stripe (checkout session + webhook)                                                               |
| **Verification** | Python script + GitHub Actions; results stored in MongoDB (and optionally Supabase if you add it) |
| **Email**        | Nodemailer (SMTP); optional                                                                       |

Supabase is **optional**: Edge Functions and SQL are in `/supabase/` for when/if you move or duplicate logic there. The app runs fully on **Express + MongoDB** without Supabase.

---

## 4. Human–AI Symbiosis (From the Mandate)

- **Founder:** Vision, philosophy, business decisions, secrets (env vars, Stripe, SMTP), and creative direction.
- **LLM coder:** “Fingers and physical build”—implements and maintains from the handoff and this mandate map.
- **Single source of truth for execution:** **`HANDOFF-AND-ROLLOUT.md`** (what exists, what to provide, commit & rollout, file list, how to work together).
- **Single source of truth for intent and mapping:** **this file** (mandate ↔ current build).

When in doubt: implement and deploy according to `HANDOFF-AND-ROLLOUT.md`; align behavior and copy with the philosophy in `Frontend/src/lib/philosophy.js` and the anti-Druj / Conscious Player goals described in the mandate.

---

## 5. Four Phases (Mandate) vs What’s Done

| Phase in mandate                             | Status in repo                                                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Project initialization & architecture** | Philosophy file, layout, nav (Archive, Verification, Manifesto, Cart), separation of verification vs presentation.                                          |
| **2. AI verification engine**                | Python script, trusted_hashes.json, GitHub Action, backend verification API + certificate ID, VerificationBadge + VerificationHashBlock; optional Supabase. |
| **3. Storefront & cosmic design**            | Artifact page at `/#/artifact/:slug`, Alchemical theme, scarcity, expandable hash, lore, “Initiate Acquisition.”                                            |
| **4. Automation & deployment**               | Stripe webhook (fulfillment, download grant, physical_fulfillment, email, audit log); Vercel deployment docs; Ritual of Addition.                           |

---

## 6. Post-Launch Evolution (From the Mandate)

- **Private sanctuary first:** Use the site for deep work and a small set of artifacts before scaling.
- **Expand artifacts:** Use `docs/RITUAL-OF-ADDITION.md`; add hashes to `trusted_hashes.json`; add items with `downloadUrl` / `stockQty` / `lore` as needed.
- **Fulfillment:** `PhysicalFulfillment` is the disc-burn queue; extend with tasking or notifications if needed.
- **Language and tone:** Keep “Claim Artifact,” “Preserve History,” “Initiate Acquisition”; avoid “BUY NOW” and aggressive marketing.
- **Content:** Manifesto can grow into essays/blog; keep verification and provenance central.

---

## 7. Quick Reference for the Coder

- **Execute rollout and daily work:** Use **`HANDOFF-AND-ROLLOUT.md`**.
- **Understand why and how mandate maps to code:** Use **this file**.
- **Add artifacts:** Use **`docs/RITUAL-OF-ADDITION.md`**.
- **Deploy and webhooks:** Use **`docs/DEPLOYMENT.md`**.
- **Verification system end-to-end:** Use **`docs/VERIFICATION-SYSTEM.md`** and **`scripts/README-verification.md`**.

Do **not** assume the project is Next.js or Supabase-only; the current build is Vite + Express + MongoDB with optional Supabase pieces.
