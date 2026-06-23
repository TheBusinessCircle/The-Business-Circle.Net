# Circle Card Pro Billing Activation Blueprint

Status: preparation only. Billing remains disabled.

## Current Stripe Integration Audit

Existing BCN membership billing uses:

- Checkout route: `src/app/api/stripe/checkout/route.ts`
- Billing portal route: `src/app/api/stripe/portal/route.ts`
- Stripe webhook route: `src/app/api/stripe/webhook/route.ts`
- Subscription service: `src/server/subscriptions/subscription.service.ts`
- Stripe client helpers: `src/server/stripe/*`
- Membership pricing config: `src/config/membership.ts`
- Subscription model: `prisma/schema.prisma` `Subscription`

The current `Subscription` model is BCN-membership focused. Circle Card access is intentionally separated in entitlement helpers:

- `src/lib/circle-card/permissions.ts`
- `src/lib/admin/member-access.ts`
- `src/lib/circle-card/plans.ts`
- `src/lib/circle-card/pricing.ts`

Existing webhook handling processes:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

## Future Environment Variables

Required only when `CIRCLE_CARD_BILLING_ENABLED=true`:

- `STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID`
- `STRIPE_CIRCLE_CARD_PRO_ANNUAL_PRICE_ID`

Billing flag:

- `CIRCLE_CARD_BILLING_ENABLED=false`

Current Pro pricing:

- Monthly: `GBP 9.99`
- Annual: `GBP 95.90`
- Annual discount: `20%`

## Billing Flag Strategy

When `CIRCLE_CARD_BILLING_ENABLED=false`:

- No live Circle Card Pro checkout sessions are created.
- Pro remains early access / register interest.
- Admin readiness can show whether future price env vars are configured.
- Users cannot accidentally pay.

When `CIRCLE_CARD_BILLING_ENABLED=true` in a future phase:

- The checkout route can be promoted from disabled blueprint to live session creation.
- Both Pro price IDs must be present.
- The route must require a logged-in user.
- The route must create or reuse a Stripe customer.

## Checkout Route Blueprint

Prepared route:

- `POST /api/stripe/circle-card/checkout`

Future payload:

```json
{
  "plan": "pro",
  "period": "monthly",
  "source": "dashboard"
}
```

Future metadata:

- `userId`
- `circleCardPlan=PRO`
- `billingPeriod=monthly|annual`
- `referralCode`
- `referralClickId`
- `referralSource`
- `source`

Current behavior:

- Returns disabled while billing flag is false.
- Returns blueprint-only if billing flag is true.
- Does not create Stripe Checkout sessions.

## Webhook Blueprint

Future Circle Card Pro webhook handling should branch by subscription metadata:

- `circleCardPlan=PRO`
- `userId`
- `billingPeriod`

On checkout completed / subscription active:

- Mark the user as having active Circle Card Pro access.
- Sync Circle Card subscription status separately from BCN membership.
- Preserve BCN `Subscription` membership logic and active membership tier.
- Record referral Pro conversion readiness if a referral attribution exists.

On cancellation / failed payment:

- Preserve existing cards and public URLs.
- Preserve public card data.
- Do not delete cards.
- Downgrade Circle Card entitlement after the access period ends.
- Lock or hide Pro-only features later, after separate feature-lock work.

## Entitlement Separation

Circle Card plan access must remain separate from BCN membership:

- BCN Foundation / Inner / Core remain membership products.
- Circle Card Pro is a Circle Card product.
- Active BCN membership may continue to grant `BCN_INCLUDED_PRO`.
- Paid Circle Card Pro should report as `PRO_SUBSCRIPTION`.
- Admin overrides and early access remain distinct sources.

No live user entitlement changes are made in this phase.

## Referral Reward Readiness

Future rule:

- If a referred user upgrades to active Pro, mark the referral as Pro converted.
- Keep the referral eligible for a future reward.
- Do not calculate payout.
- Do not show payable balance.
- Do not create Stripe Connect.

Current safe wording:

> Future rewards will be tracked when Pro billing is active.

## Admin Readiness

Admin Circle Card Command Centre should show:

- Billing enabled true / false
- Pro monthly price configured yes / no
- Pro annual price configured yes / no
- Pro interest leads
- Likely Pro candidates
- Referral Pro conversion readiness

Stripe price IDs must stay hidden.

## Activation Checklist

Before activating billing:

1. Create Stripe Product: Circle Card Pro.
2. Create monthly price: `GBP 9.99`.
3. Create annual price: `GBP 95.90`.
4. Set `STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID`.
5. Set `STRIPE_CIRCLE_CARD_PRO_ANNUAL_PRICE_ID`.
6. Add live checkout session creation behind `CIRCLE_CARD_BILLING_ENABLED`.
7. Add Circle Card Pro webhook branch.
8. Verify BCN membership subscription logic is unchanged.
9. Verify referral attribution persists into checkout metadata.
10. Run end-to-end test in Stripe test mode.
11. Only then set `CIRCLE_CARD_BILLING_ENABLED=true`.

## Not Included

This phase does not include:

- Live checkout buttons
- Billing activation
- Payouts
- Commission calculations
- Stripe Connect
- Withdrawal systems
- Live entitlement changes
