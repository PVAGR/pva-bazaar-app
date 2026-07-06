## Order Workflow – Kenyan Crafts via Etsy (Phase 1)

This is the step-by-step SOP for fulfilling orders. Treat it as the “muscle memory” you and any helper can follow.

**Related:** [OPS-CUSTOMER-MESSAGES.md](./OPS-CUSTOMER-MESSAGES.md) (canned messages), [OPS-INVENTORY-TEMPLATE.csv](./OPS-INVENTORY-TEMPLATE.csv) (inventory sheet), [PHASE1-EXECUTION.md](./PHASE1-EXECUTION.md) (Phase 1 checklist).

---

### 1. When an Etsy order comes in

1. **Notification**
   - Etsy sends an email + in-dashboard notification.
   - Same day: open the order and confirm item, quantity, and ship-to country.

2. **Check inventory sheet**
   - Open your inventory sheet (see `OPS-INVENTORY-TEMPLATE.csv`).
   - Update:
     - `inventory_reserved += ordered_qty`
     - If you don’t have enough on hand, flag row in `notes` as `RESTOCK NEEDED`.

3. **Confirm with artisan (if stock is low or made-to-order)**
   - Send a short WhatsApp message with:
     - SKU name
     - Quantity
     - Target ship-by date

---

### 2. Payment & packaging prep

1. **Verify payment**
   - Ensure Etsy marks the order as “Paid”.
   - If there is any payment hold, wait for clearance before shipping.

2. **Prepare the item**
   - Inspect the piece: check beads / knots / stone surface.
   - For soapstone: wrap in soft paper + bubble wrap; use a sturdy box.
   - For beadwork: place in small fabric or kraft bag, then padded envelope or box.

3. **Add story card (optional but recommended)**
   - Slip in a small printed card:
     - Artifact name.
     - 1–2 line story (from `ETSY-LISTINGS-KENYA.md`).
     - Simple care note.

---

### 3. Shipping

1. **Purchase label**
   - Use Etsy’s shipping label system where available, or your local carrier.
   - Enter tracking number into Etsy so the buyer sees updates.

2. **Mark as shipped**
   - Once the package is handed to the carrier, mark the order as “Shipped” in Etsy.

3. **Log shipment**
   - In your sheet, add:
     - `shipped_at`
     - `tracking_number`
     - `carrier`

---

### 4. Customer communication

Use the canned messages in `OPS-CUSTOMER-MESSAGES.md`.

1. **Order confirmation (automatic via Etsy + optional personal note)**
2. **Shipment notification with tracking**
3. **Follow-up message ~10–14 days later**
   - Thank them.
   - Ask if everything arrived safely.
   - Gently invite a review if they are happy.

---

### 5. Handling problems

- **Delay**
  - If tracking stalls or customs takes time, send a short reassurance note and link to tracking.

- **Damage**
  - Ask for photos.
  - Offer: replacement (if stock / artisan capacity allows) or refund according to your policy.
  - Log incident in `notes` column for that SKU/order.

---

This workflow is intentionally simple. You can refine it later with automations, but this is enough to run a small, real business without dropping details.
