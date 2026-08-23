# Supabase Fulfillment (Optional)

If you use **Supabase** as the backend and want Stripe to trigger fulfillment there, use the **`stripe-webhook`** Edge Function and the tables below.

## Tables (run in SQL editor)

```sql
-- For disc burn queue (one row per paid order that needs physical fulfillment)
create table if not exists physical_fulfillment (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  item_id text not null,
  item_name text,
  customer_email text,
  customer_name text,
  status text not null default 'pending' check (status in ('pending', 'burn_queued', 'burned', 'shipped', 'delivered')),
  notes text,
  burned_at timestamptz,
  shipped_at timestamptz,
  tracking_number text,
  created_at timestamptz default now()
);
create index idx_physical_fulfillment_order on physical_fulfillment (order_id);
create index idx_physical_fulfillment_status on physical_fulfillment (status, created_at desc);

-- Immutable audit log for every fulfillment action
create table if not exists fulfillment_transaction_log (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  order_id text,
  action text not null,
  payload jsonb,
  success boolean default true,
  error_message text,
  created_at timestamptz default now()
);
create index idx_fulfillment_log_created on fulfillment_transaction_log (created_at desc);
```

## Deploy Stripe webhook function

1. Set secrets:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```
2. Deploy:
   ```bash
   supabase functions deploy stripe-webhook
   ```
3. In **Stripe Dashboard** → Webhooks → Add endpoint:
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_failed`, etc.

The function inserts into `physical_fulfillment` and `fulfillment_transaction_log`. Email and certificate delivery can be added by calling your email API from the function or via a Supabase trigger.

## Main app (no Supabase)

The **Express + MongoDB** backend already implements full fulfillment in `backend/routes/webhooksStripe.js`: download grant, `PhysicalFulfillment` row, `FulfillmentTransactionLog`, and confirmation email with Certificate link. Use that unless you are moving the backend to Supabase.
