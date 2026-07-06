# Ritual of Addition: How to Add New Artifacts

_"Persistent Consistency is Quantum Repetition."_ This document is the single place for how new artifacts (e.g. scarce knowledge, retro discs) are added so the system runs without ad-hoc steps.

---

## 1. Add the artifact to the marketplace (data)

- **Option A – API:** Create the item via `POST /api/items/register` (authenticated) or admin flow, with:
  - `name`, `description`, `category`, `price`, `media`/`imageUrls`, and optionally `slug`, `stockQty`, `downloadUrl` (for digital fulfillment), `lore`.
- **Option B – Database:** Insert or update the **Artifact** (or equivalent) document in MongoDB (or your DB) with the same fields. Ensure `status: 'published'` when it should be buyable.

**Important for fulfillment:**

- **`downloadUrl`** – If this artifact has a digital download, set the URL here. After payment, the customer’s email will contain a link that validates their order and then redirects to this URL (or shows a message if no URL is set).
- **`stockQty`** – Set for scarcity (e.g. "Only 50 preserved copies"). Leave unset or high for “limited run” without a hard number.

---

## 2. Add verification (hash) so it can be “AI-Verified”

- Run the verification script on the **exact** file you consider the canonical source (e.g. ISO):
  ```bash
  python scripts/verify_artifact.py path/to/artifact.iso
  ```
- Copy the **SHA-256** from the output (or from your trusted source, e.g. Archive.org).
- Add an entry to **`scripts/trusted_hashes.json`** under `entries`:
  ```json
  {
    "id": "unique-id-for-this-artifact",
    "name": "Human-readable name",
    "sha256": "<64-char hex>",
    "filename_hint": "artifact.iso",
    "source_url": "https://archive.org/details/..."
  }
  ```
- Re-run the script (or let CI run) so the artifact is “verified.” The **Verification** system will then be able to attach a certificate to this artifact when you use the same `id` or slug as in the marketplace.

---

## 3. (Optional) Connect Stripe so payments trigger fulfillment

- Ensure **Stripe webhook** is pointing at your backend:
  - **Current backend (Vercel + Express):**  
    `https://<your-domain>/api/webhooks/stripe`  
    With events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, and any refund events you need.
  - **Supabase Edge Function:**  
    Point Stripe at your Supabase function URL and deploy `stripe-webhook` with the right secrets.
- On **successful payment** the system will:
  - Grant the customer a **download link** (using `downloadUrl` if set).
  - Insert a row into **physical_fulfillment** (for you to burn the disc).
  - Send a **confirmation email** with the download link and a **Certificate of Authenticity** link (when verification exists for that item).
- All of this is logged for audit (e.g. `FulfillmentTransactionLog` / `fulfillment_transaction_log`).

---

## 4. Checklist for each new artifact

- [ ] Item created in DB/API with `name`, `description`, `price`, `media`, `status: published`.
- [ ] Optional: `downloadUrl` set for digital fulfillment.
- [ ] Optional: `stockQty` set for scarcity copy count.
- [ ] Optional: `lore` (or description) set for the artifact page.
- [ ] SHA-256 added to `scripts/trusted_hashes.json` and verification run (or CI run).
- [ ] Stripe webhook configured and tested so payment triggers fulfillment and email.

Once this ritual is followed, new artifacts are added consistently and the system can run without manual intervention for fulfillment and verification.
