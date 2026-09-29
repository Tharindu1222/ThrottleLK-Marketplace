# PayHere promote checkout (PayHere-only)

**Decision:** Replace bank-slip promote flow with PayHere. Payment webhook is source of truth; auto-activate placement on success.

## Flow
1. Seller selects package → `POST /api/v1/promotions/checkout` (JWT) creates `PromoRequest` (`pending`, `paymentProvider=payhere`, unique `orderId`) and returns PayHere checkout fields + `hash`.
2. Web posts auto-form to PayHere sandbox/live checkout URL.
3. PayHere `notify_url` → `POST /api/v1/promotions/payhere/notify` (public, raw body fields). Verify MD5, match amount/currency/order_id, mark paid, run shared activate/placement (same as admin approve).
4. `return_url` → promote page with `?paid=1`; UI polls `GET /promotions/status` until live (webhook may lag).
5. `cancel_url` → promote page with `?cancelled=1`.

## Env (`.env.example`)
```
PAYHERE_MERCHANT_ID=
PAYHERE_MERCHANT_SECRET=
PAYHERE_MODE=sandbox
PAYHERE_CURRENCY=LKR
# Absolute public URL to API notify (sandbox needs a reachable host; use ngrok locally)
PAYHERE_NOTIFY_URL=https://your-api.example/api/v1/promotions/payhere/notify
WEB_URL=http://localhost:3000
API_URL=http://localhost:3001
```

## Schema
- `promo_requests`: make `bank_account_id`, slip fields nullable; add:
  - `payment_provider` varchar nullable (`payhere` | `bank`)
  - `payhere_order_id` varchar unique nullable
  - `payment_status` varchar (`unpaid` | `paid` | `failed` | `chargedback`) default `unpaid`
  - `paid_at` timestamptz nullable
  - `payhere_payment_id` varchar nullable

## Security
- Hash: `md5(merchant_id + order_id + amount + currency + md5(merchant_secret).toUpperCase()).toUpperCase()` (PayHere checkout)
- Notify: verify `md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + md5(merchant_secret).toUpperCase()).toUpperCase()`
- Idempotent: if already `approved`/`paid`, return 200
- Never trust return_url alone

## UI
- Promote form: Select plan → Pay with PayHere (no bank/slip steps)
- Admin: PayHere requests show as paid auto-approved or pending unpaid; slip UI optional/hidden for payhere rows

## Out of scope
- Subscriptions, refunds UI, non-promo PayHere products
