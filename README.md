# FlowState Trading

**Practice like a pro. Trade like one.**

A web-based forex trading simulator that replays historical price data bar-by-bar. Build discipline, test your edge, and track your performance — without risking a cent.

---

## Stack

- React + Vite + TypeScript (strict)
- Tailwind CSS v4
- TradingView Lightweight Charts v5
- Supabase (auth, database, Edge Functions)
- Stripe (subscriptions)
- Vercel (deployment)

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in all values:

| Variable | Source |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks (see below) |
| `VITE_STRIPE_MONTHLY_PRICE_ID` | Stripe → Products → Monthly price ID |
| `VITE_STRIPE_ANNUAL_PRICE_ID` | Stripe → Products → Annual price ID |

### 3. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in **SQL Editor**:

```sql
-- Paste contents of: supabase/migrations/001_initial_schema.sql
```

3. Deploy the webhook Edge Function:

```bash
supabase functions deploy stripe-webhook
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Stripe setup

1. Create two recurring products:
   - Monthly: $5/month
   - Annual: $48/year

2. Create a webhook pointing to:
   ```
   https://<project>.supabase.co/functions/v1/stripe-webhook
   ```
   Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`

3. Copy **Price IDs** to `.env.local`

### 5. Run

```bash
npm run dev        # http://localhost:5173
npm run build      # production build
```

---

## Historical Data

The simulator ships with 2000 bars of synthetic EURUSD M1 data at `data/sample/EURUSD_M1_sample.json`.

To use real HistData.com data:

1. Download ASCII CSV from [histdata.com](https://www.histdata.com/download-free-forex-historical-data/)
2. Place `.csv` files in `data/raw/`
3. Run: `npx ts-node scripts/ingest_histdata.ts`
4. Update the import in `src/hooks/useReplay.ts` to point to processed JSON

Regenerate synthetic sample data:
```bash
node scripts/generate_sample_data.mjs
```

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add all env vars from `.env.example` in Vercel project settings
4. Deploy — `vercel.json` handles SPA routing automatically

---

## V1 Feature Status

| Feature | Status |
|---|---|
| Landing page (hero, pricing, how-it-works) | Done |
| Auth (signup/login/protected routes) | Done |
| Bar-by-bar chart replay | Done |
| TradingView Lightweight Charts v5 | Done |
| Long/Short trade entry with SL/TP | Done |
| Auto SL/TP hit detection | Done |
| Chart markers + price lines | Done |
| Win/Loss result modal | Done |
| Stats dashboard | Done |
| Session review page | Done |
| Stripe Checkout | Done |
| Supabase webhook handler | Done |
| Vercel config | Done |

## What Requires Manual Setup

1. **Stripe products** — create monthly ($5) and annual ($48), add price IDs to env
2. **Supabase DB** — run the SQL migration
3. **Stripe webhook** — point to deployed Supabase Edge Function
4. **Real candle data** — swap synthetic data with actual HistData CSVs for production
5. **For testing** — set `is_subscribed = true` on your profile row manually, or complete a Stripe Checkout flow
