# TrooperPing

Crowdsourced live highway **state-trooper / LEO** sightings for US drivers.

Mobile-first map (Leaflet + OpenStreetMap / Carto dark tiles). No paid map keys.

**TrooperPing Pro** — **$5.99/mo** Stripe subscription unlocks the live nationwide feed, reporting, and flagging. Free users get a blurred Austin demo map only.

## Features (MVP)

- GPS locate + big **I see a trooper** report button (subscribers)
- Report type: **moving** | **parked/posted**, optional note, anonymous
- Nearby pings API with soft fade (~45 min) and hard expire (~2 hr)
- Stripe Checkout subscription + Customer Portal + webhook sync
- Free tier: Austin demo seeds only (`demo: true`), read-only
- Basic per-IP rate limits + flag endpoint (subscribers)
- Short Terms / disclaimer
- PWA manifest basics

## Tech

- Next.js 14 App Router + TypeScript + Tailwind
- Stripe (`stripe` npm) for Checkout + Billing Portal
- JSON file stores: `data/pings.json`, `data/subscribers.json`
- httpOnly signed session cookie after successful Checkout

### API

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/pings?lat=&lng=&radiusKm=` | Full nearby feed if subscribed; else Austin demo + `demo:true` |
| `POST` | `/api/pings` | Create ping — **requires subscription** (402 otherwise) |
| `POST` | `/api/pings/[id]/flag` | Flag — **requires subscription** |
| `POST` | `/api/checkout` | Create Stripe Checkout Session (`mode: subscription`) |
| `POST` | `/api/checkout/complete` | Exchange `session_id` → set session cookie |
| `POST` | `/api/stripe/webhook` | `checkout.session.completed`, `customer.subscription.updated/deleted` |
| `GET` | `/api/me` | `{ subscribed: boolean, … }` |
| `POST` | `/api/billing-portal` | Stripe Customer Portal session |

## Environment

Copy `.env.example` → `.env.local` and fill in:

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...          # or create via npm run stripe:setup
NEXT_PUBLIC_APP_URL=http://localhost:3000
SESSION_SECRET=long-random-string
```

`npm run build` succeeds **without** Stripe keys. Checkout / portal return a clear `503 stripe_not_configured` until keys are set.

### Browser setup

For a one-time setup without putting keys in chat, open **`/setup-stripe`** while the app is running.
Paste Stripe **Test mode** keys only. The form saves them to `.env.local` and best-effort creates the
TrooperPing Pro $5.99/month price. Restart `npm run start` afterward so the server loads the new
environment values; a rebuild is not required for the API route.

## Stripe test-mode setup

1. Create a [Stripe account](https://dashboard.stripe.com/register) and switch to **Test mode**.
2. Copy **Secret** and **Publishable** keys from [API keys](https://dashboard.stripe.com/test/apikeys) into `.env.local`.
3. Create the product + price:

   ```bash
   export STRIPE_SECRET_KEY=sk_test_...
   npm run stripe:setup
   ```

   Paste the printed `STRIPE_PRICE_ID=price_…` into `.env.local`.

4. Forward webhooks with the [Stripe CLI](https://stripe.com/docs/stripe-cli):

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`.

5. Start the app:

   ```bash
   npm run build && npm run start
   # or: npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000), tap **Subscribe — $5.99/mo**, and pay with a test card:

   | Field | Value |
   |-------|--------|
   | Card | `4242 4242 4242 4242` |
   | Expiry | Any future date |
   | CVC | Any 3 digits |
   | ZIP | Any |

   More cards: [Stripe testing docs](https://stripe.com/docs/testing).

7. After redirect, `/api/me` should show `subscribed: true`. Use **Manage billing** for the Customer Portal (enable in Stripe Dashboard → Settings → Billing → Customer portal).

## Run locally

```bash
cd trooper-ping
npm install
npm run build
npm run start
```

Dev mode:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data

- Pings: `data/pings.json` (delete to re-seed Austin demo)
- Subscribers: `data/subscribers.json` (keyed by Stripe customer id / email)

Do **not** commit real Stripe secrets or `.env.local`.

## Future: App Store / Capacitor

This web MVP can be wrapped for iOS/Android later with [Capacitor](https://capacitorjs.com/).

## Deploy notes

- Single-instance friendly (in-memory rate limits + local JSON files).
- For multi-instance / serverless, swap stores for a shared DB and use Redis/KV for rate limits + session.
- Repo: https://github.com/iamstarr337-ops/trooper-ping

## Disclaimer

User-generated content. Obey laws. No unsafe driving. Not affiliated with any LEO agency.
