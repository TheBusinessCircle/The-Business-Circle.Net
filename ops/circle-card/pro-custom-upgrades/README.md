# Circle Card Pro and custom-design upgrades

## Customer journey

- Account menu **Upgrades** opens the Pro page.
- Pro remains £9.99 per month through its existing subscription checkout.
- A custom card design is an optional **£49.99 one-off, per card**, available
  only after current paid Pro access is confirmed by the server.
- The customer chooses their own card, supplies a design brief and explicitly
  accepts the scope: branding/content/layout, mobile checks and one round of changes.
- Fixed-price Stripe Checkout records a separate service order. It does not
  generate a finished design automatically.
- Paid orders appear at /app/owner/custom-builds. Prepare and approve the design
  for the specified card using the existing design/deployment workflow, then
  mark its delivery complete. Queue controls never publish or modify card data.

## Preservation and access

Cancelling Pro does not remove presentation before the paid-through date.
After paid access ends, the public view follows Free rules; the stored design,
content and service order are retained. Resuming paid Pro restores a completed,
paid design without a second design fee. Checkout attempts and unfinished
orders do not disable existing self-service Studio designs.

Existing bespoke cards and complimentary grants are not retroactively charged
or converted into service orders. Ordinary Pro self-service customisation remains
included. New custom deliveries must use the existing Liquid/Studio public
renderer and entitlement gate; do not introduce a hard-coded public bypass.

## Payments and isolation

The amount and currency are server-selected (4999 pence, GBP). The order is
bound to an authenticated owner, their card and their Circle-only Stripe customer.
A database uniqueness constraint and locked checkout reuse prevent repeated clicks
from creating duplicate orders. Provider idempotency protects retry attempts.

Signed webhook processing runs after signature verification and before the
subscription classifier. Completed and delayed payment events retrieve current
provider evidence before fulfilment. Unpaid sessions do not grant paid status.
Refunds/disputes recheck current payment state; replay does not overwrite
completed design progress. A customer return URL alone never grants payment.
Custom purchases do not award recurring Pro-referral commission.

## Deployment

The single-file installer embeds the exact new payload, copies the active
release, and patches its existing menu, Pro page, public entitlement gate,
webhook route, exact API allowlist, owner navigation and Prisma schema.
It preserves current Hucknall changes, commissions and custom previews.

The production build and action-manifest check run before switch-over.
The installer then adds the custom-order table with a checked migration record,
grants only the active runtime's required table operations, and extends the
existing Circle-only Stripe webhook event list. No endpoint secret is rotated.
No customer subscription, payment, payout or design order is created by installation.

The candidate is checked before nginx switches. Switch failures restore the
previous nginx config. The additive table and extra webhook event subscriptions
are deliberately retained on rollback; financial records are never dropped.
The previous release remains available.

Local checks: 202 unit/regression tests, four patch/payload tests and a TypeScript
check against a separately generated Prisma client. Production build, live
authenticated UI checks and a naturally occurring paid order remain deployment
and post-deployment acceptance steps.
