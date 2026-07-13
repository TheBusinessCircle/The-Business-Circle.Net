# Circle Card Pro Billing and Entitlement Runbook

Status: lifecycle hardening is implemented, but Circle Card billing remains disabled. This document is an activation runbook, not permission to enable billing or deploy.

## Controlled launch scope

The first paid launch is deliberately narrow:

- Circle Card Pro only
- GBP 9.99 per month (`999` pence)
- one active or pending Circle Card subscription relationship per user
- card payments through Stripe Checkout
- subscription management through Stripe Customer Portal

The following are deferred and must not be offered by Checkout or described as launch features:

- annual billing
- Teams billing or Teams entitlements
- trials
- referral commissions, payouts and Stripe Connect
- uploaded/private custom-link files

Normal profile-photo and business-logo uploads are unaffected. Existing uploaded/private link data is retained but is not part of the initial paid launch and must not be served publicly without entitlement.

## Entitlement sources remain separate

The authoritative access loader is `loadCircleCardAccessForUser(userId)`. A paid Stripe subscription is only one possible source. The loader must continue to preserve:

- active BCN membership included Pro
- admin access
- ambassador `freeProGranted` access
- persisted `CircleCardAccessGrant` grandfathered access

These sources do not create Stripe renewal, cancellation or payment language. Circle Card subscription state must never alter BCN membership billing.

## Authoritative paid-through lifecycle

`CircleCardSubscription.accessEndsAt` is confirmed paid-through evidence. It is advanced from the paid invoice line period, not from a subscription update alone. A Stripe `active` status without a future `accessEndsAt` does not grant paid access.

Historical rows are intentionally not backfilled with invented payment dates. Nullable lifecycle fields fail closed until a paid invoice or deliberate reconciliation provides evidence.

| Stripe state and evidence | Customer state | Paid access |
| --- | --- | --- |
| No subscription or no confirmed paid-through evidence | Free, checkout pending or expired | No |
| `ACTIVE`, future `accessEndsAt` | Active | Until the effective access end |
| `ACTIVE`, cancellation scheduled, future `accessEndsAt` | Cancelling | Until confirmed `accessEndsAt` |
| `CANCELED`, future `accessEndsAt` | Cancelling / paid through | Until confirmed `accessEndsAt` |
| `CANCELED`, expired `accessEndsAt` | Expired | No |
| `ACTIVE` with recorded payment failure, confirmed prior payment and open grace | Past-due grace | Until the later of paid-through end and fixed grace end |
| `PAST_DUE`, confirmed prior payment, grace still open | Past-due grace | Until the later of paid-through end and fixed grace end |
| `PAST_DUE`, grace ended | Payment failed | No |
| `UNPAID` | Payment failed | No |
| `PAUSED` | Paused | No |
| `INCOMPLETE` or `INCOMPLETE_EXPIRED` | Incomplete | No |
| `TRIALING` | Incomplete | No; trials are not a launch product |

### Seven-day recovery grace

The first accepted `invoice.payment_failed` or compatible payment-action-required event for an invoice period records `paymentFailedAt` and `recoveryGraceEndsAt = paymentFailedAt + 7 * 24 hours`. Retries for the same invoice period do not roll that deadline forward. A genuinely later invoice period starts a new recovery cycle, even when an earlier paid recovery arrives out of delivery order; invoice ID and period evidence distinguish those cycles. During grace, confirmed paid-through evidence remains stored and Pro stays available only through the effective paid/grace end. A later paid invoice advances `accessEndsAt`, clears only the failure state it chronologically supersedes and records recovery. When grace expires without recovery, public output downgrades without deleting stored content.

## Checkout creation and deduplication

Checkout accepts the authenticated user only. The monthly product, price, plan, interval, user ID, source and referral metadata are derived on the server. A client cannot select an arbitrary price or entitlement.

Before a session is created, the service:

1. rejects while `CIRCLE_CARD_BILLING_ENABLED=false`;
2. validates required server configuration;
3. rejects standalone Checkout when Pro is already supplied by BCN, admin, ambassador or grandfathered access;
4. reuses a persisted, unexpired, open Checkout session only after revalidating its server-authored contract and exact monthly line item;
5. reuses only a Stripe customer already bound to the user's stored Circle Card relationship, creates a dedicated idempotent Circle Card customer otherwise, and never adopts a BCN or email-matched customer;
6. adopts only a single server-authored open Checkout session whose user, plan, billing period, source and exact monthly line item still match, and expires safe duplicates;
7. stops on an existing non-terminal subscription or reconciliation conflict;
8. atomically claims the single user subscription row so concurrent clicks cannot create independent sessions;
9. creates a 35-minute monthly Checkout session with a persisted server idempotency attempt;
10. verifies that the session ID and expiry were persisted before returning its URL; and
11. preserves an ambiguous network-failure attempt long enough to replay the same Stripe idempotency key, then replaces it only after Stripe session recovery finds no viable session.

Checkout completion and expiry clear pending-session state. Route rate limiting and trusted-origin checks remain mandatory. A success query string is never proof of payment; the dashboard must wait for server-derived entitlement.

## Webhook processing and ordering

The shared webhook endpoint is `/api/stripe/webhook`. Circle Card handling recognises:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`

The webhook lease/idempotency record is retained. Completed duplicates are ignored, concurrent delivery is leased, and failures are marked retryable.

Subscription status chronology and payment chronology are separate:

- status events compare `lastStripeEventCreatedAt` and `lastStripeEventId`;
- payment events compare `lastPaymentEventCreatedAt` and `lastPaymentEventId`;
- an older subscription status event cannot overwrite newer status;
- an otherwise older `invoice.paid` event may still advance `accessEndsAt` when its confirmed period end is later;
- invoice IDs and Checkout session IDs are unique when present;
- conflicting Stripe subscription IDs set reconciliation-required metadata instead of silently replacing the relationship;
- an exact stored subscription continues to accept its stored price ID after a controlled price rotation, while unknown subscriptions still require the currently configured price; and
- Circle Card never claims a BCN/founder invoice or Checkout merely because it shares the same Stripe customer.
- BCN Checkout handling retrieves the server-side line items and mutates membership state only for exactly one quantity-one managed membership price.
- the Circle Card Portal fails closed for any legacy relationship that shares its Stripe customer with BCN, because a general Portal session cannot safely product-scope cancellation.

Safe structured logs contain event IDs, event types, user IDs and lifecycle outcomes only. Never log Stripe secrets, customer emails, payment methods or complete webhook payloads.

## Reconciliation

`reconcileCircleCardSubscriptionForUser(userId)` is a server-only recovery path. It queries Stripe with stored customer/subscription identifiers, refreshes subscription status and reuses invoice handling for either paid evidence or a safely evidenced latest failed/open invoice. This reconstructs paid-through access or the original failure/grace deadline without using subscription-period dates as payment proof.

Reconciliation:

- never accepts customer, subscription, price, plan or access dates from a client;
- never erases historical `accessEndsAt` evidence;
- does not affect ambassador, grandfathered, admin or BCN-included access;
- reports and persists a conflict when more than one non-terminal Circle Card Pro subscription exists; and
- is used only by controlled checkout/portal recovery or authenticated internal paths, not ordinary rendering or a public polling endpoint.

No recurring reconciliation cron is introduced in this phase.

## Deterministic downgrade and restoration

Downgrade is presentation and capability filtering. It never deletes or archives stored user content.

When paid access ends:

- one deterministic card remains publicly eligible, preferring the default/primary card and then stable display/creation/ID order;
- additional cards remain stored and become plan-locked/private;
- the first five eligible active links remain public in deterministic order without rewriting stored `isActive` values;
- Studio active and draft data remains stored, while the public card uses the Free presentation;
- paid Business modules remain stored but are hidden publicly;
- Creator data remains stored and Free public limits apply;
- Media Kit and Audience Snapshot paid output is hidden;
- private/file-backed links remain unavailable; and
- testimonials, wallet saves, referrals, introductions, Circle Trust, QR, vCard, Spin, notes, categories, follow-ups and basic analytics remain intact.

The same plan-target predicate protects discovery, scanner matches, wallet saves, testimonials, connections, recommendations, introductions, referrals, reports and future file delivery. Batch discovery uses one owner-card query and one batched entitlement query, rather than an entitlement query per result.

After a confirmed payment advances entitlement, the original card/link order, Studio presentation and paid module output become eligible again automatically. Users do not rebuild content.

## Studio Preview model

Free users may open Studio, edit their real card preview and save a private draft. They cannot activate or publish Studio styling. Activation always checks the authoritative server entitlement; no client flag or direct action can bypass it.

Pro users may preview, save, activate, replace and safely revert Studio designs. Activation snapshots the previous valid active design; revert swaps active/previous snapshots without deleting the private draft. Downgrade preserves the draft, current active design and previous active snapshot privately while public rendering falls back to Free. Reactivation restores the saved paid presentation.

While billing is disabled, upgrade calls to action must lead to the existing Pro interest/early-access path, never Checkout.

## Stripe configuration certification

Required only for a future enabled monthly launch:

- `CIRCLE_CARD_BILLING_ENABLED=true`
- `CIRCLE_CARD_BILLING_ACCESS_MODE=operator` for a controlled payment, or `public` only for a separately approved public launch
- `CIRCLE_CARD_BILLING_OPERATOR_USER_IDS=<verified-internal-user-id>` while access mode is `operator`
- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID=prod_...`
- `STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID=price_...`
- `CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID=bpc_...`

Annual and Teams price IDs are not required.

The deliberate verifier is read-only:

```bash
npm run circle-card:billing:certify-stripe -- --env-file .env.production --mode live
```

It retrieves, but never creates or updates, the product, monthly price, dedicated Circle Card Portal configuration and shared webhook. It verifies live/test mode, exact active monthly price contract, stable metadata, Portal features/URLs and the required webhook event superset while allowing BCN-only events. It is not called during page rendering. Test-mode certification must be requested explicitly with `--mode test` and is not production certification.

## Stripe Dashboard requirements

Before a later controlled enablement:

1. Run the required read-only plan from the production repository root: `npm run circle-card:stripe:setup-live -- --env-file .env.production --mode live`.
2. After explicit approval, run the same command with `--execute`; it idempotently creates or reuses the product, monthly price, dedicated Portal and shared webhook while billing remains false.
3. If an existing shared webhook was reused, manually confirm its stored signing secret because Stripe does not return it through the endpoint API.
4. Run disabled environment validation and deliberate live certification.
5. Confirm expired/cancelled customers can still open Portal when a Stripe customer relationship exists.
6. Run environment validation, Stripe certification and a full test-mode lifecycle before any live enablement.

## Controlled launch checklist

1. Keep `CIRCLE_CARD_BILLING_ENABLED=false` through code deployment and migration.
2. Back up PostgreSQL and apply the additive lifecycle migration.
3. Configure the product, monthly price, webhook and Customer Portal in Stripe test mode.
4. Run `npm run circle-card:billing:certify-stripe -- --mode test` against test identifiers.
5. Exercise checkout interruption, duplicate click, payment, renewal, failed payment, grace, recovery, cancellation, expiry, downgrade, Portal and reactivation.
6. Configure live identifiers in the secret manager without committing them.
7. Run `npm run env:validate:production`.
8. Run live read-only certification with billing still disabled.
9. Inspect webhook deliveries and ensure no duplicate subscription exists.
10. Enable billing first in `operator` mode for only a verified, authoritative-Free internal user; prove a non-allowlisted user cannot obtain Checkout.
11. Change access mode to `public` only in a later, separately authorised change window with rollback ownership and monitoring.

## Emergency billing disable

If Checkout or entitlement behaviour is unsafe:

1. Set `CIRCLE_CARD_BILLING_ENABLED=false` in the production secret manager.
2. Restart the application processes so all instances load the disabled flag.
3. Confirm Checkout returns the disabled response and interest paths remain available.
4. Leave webhook processing enabled so legitimate renewals/cancellations continue to reconcile.
5. Do not delete Stripe subscriptions or stored content as an emergency shortcut.
6. Inspect safe logs and Stripe event delivery, reconcile affected users deliberately, and record the incident.
7. Remember that an already issued open Stripe Checkout Session can remain payable after the flag is false. If the stop requires zero further charges, identify only server-authored Circle Card sessions and expire them in Stripe; never bulk-expire BCN/founder sessions.

The flag stops new Circle Card Checkout. It cannot revoke an existing Checkout URL and is not a
substitute for webhook processing or customer support. The exact multi-instance PM2, observation,
controlled-payment and session-expiry procedure is in
[circle-card-pro-stripe-launch-checklist.md](./circle-card-pro-stripe-launch-checklist.md).

## Migration and rollback

Migration `20260712213000_circle_card_paid_through_lifecycle` is additive. Paid-through, invoice-cycle failure, Checkout recovery, reconciliation, Studio draft and previous-active fields are nullable; no historical dates are fabricated, and nullable unique indexes preserve existing rows. The migration can be applied before the new application restarts.

During rollback, leave the added columns and indexes in place until all application versions that read/write them are retired. Dropping them immediately would destroy payment evidence and saved Studio drafts. Application rollback does not require a destructive database reset.

## Deferred work

Do not add annual/Teams checkout, trials, commissions, payouts, Stripe Connect, aggressive reconciliation polling or uploaded/private file links as part of initial launch activation. The final public Pro offer and operator sequence are documented in [circle-card-pro-stripe-launch-checklist.md](./circle-card-pro-stripe-launch-checklist.md).
