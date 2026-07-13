# Circle Card Pro Stripe Launch Checklist

Status: operator runbook only. The repository and current production configuration must keep `CIRCLE_CARD_BILLING_ENABLED=false` until the separately authorised public activation step. This checklist does not authorise a deployment, a live Stripe mutation or a charge.

Launch contract: **Circle Card Pro, GBP 9.99 (`999` pence), recurring monthly, no trial**. Do not add an annual price, Teams price, commission, payout or Stripe Connect configuration.

## 1. Create the product

In the intended Stripe account and mode, open **More > Product catalog**, add one active product named **Circle Card Pro**, and use a short description that matches the monthly offer. Do not create the production product from this repository or paste its identifier into source control.

Stripe reference: <https://docs.stripe.com/products-prices/manage-prices>

## 2. Create the monthly price

On that product create one active flat-rate price with exactly:

- recurring billing;
- currency `GBP`;
- amount `£9.99` / `999` pence;
- interval `month`;
- interval count `1`; and
- no trial.

Confirm the price belongs to the Circle Card Pro product. Do not create an annual or multi-currency launch price.

## 3. Configure Customer Portal

Configure the same Stripe mode's Customer Portal to allow customers to:

- update their payment method;
- see billing and invoice history; and
- cancel a subscription at period end.

Set the permitted return URL to the production application origin. Keep cancellation and pricing language monthly-only. Portal access remains useful for customers with a stored Stripe relationship even after entitlement expires.

Stripe reference: <https://docs.stripe.com/customer-management/configure-portal>

## 4. Configure the shared webhook

Use the existing HTTPS endpoint:

```text
https://thebusinesscircle.net/api/stripe/webhook
```

Subscribe it to exactly the shared integration events already declared in `scripts/stripe-webhook.ts`:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `charge.refunded`

Record the endpoint signing secret in the production secret manager. Never put it in Git, a ticket, a PR, chat or application logs. The repository helper can create or update this endpoint, so running it against live mode is an explicit live Stripe mutation and must only happen in an authorised operator window:

```bash
npm run stripe:webhook:upsert -- --env-file .env.production --url https://thebusinesscircle.net
```

Stripe reference: <https://docs.stripe.com/billing/subscriptions/webhooks>

## 5. Record configuration securely

Store these values in the deployment secret manager, not `.env.example` or any committed file:

```text
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID=prod_...
STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID=price_...
CIRCLE_CARD_BILLING_ENABLED=false
```

The identifiers must be copied from the same live Stripe account. Do not invent placeholder live identifiers.

## 6. Certify live configuration while billing is disabled

First validate the disabled fail-closed configuration:

```bash
npm run circle-card:billing:validate-env -- --env-file .env.production
```

Then run the deliberate read-only live certification without `--if-enabled`:

```bash
npm run circle-card:billing:certify-stripe -- --env-file .env.production --mode live
```

The certification retrieves only the configured product and price. It must pass secret/resource live mode, active product, active price, GBP, `999`, recurring type, monthly interval, interval count `1`, and product relationship. It does not create or modify Stripe resources. Keep `CIRCLE_CARD_BILLING_ENABLED=false` throughout.

## 7. Deploy configuration safely

In a separately authorised deployment window:

1. Take or confirm the database backup.
2. Confirm the production migration is applied with `npx prisma migrate deploy`; never use `prisma db push` in production.
3. Deploy the reviewed application and secret values with billing still `false`.
4. Restart every application instance so all instances see the same disabled flag.
5. Confirm the Pro page uses register-interest CTAs and `POST /api/stripe/circle-card/checkout` returns the disabled response.
6. Confirm ordinary profile-photo and business-logo uploads still work.
7. Confirm webhook delivery remains online.

## 8. Run the controlled operator checkout

Do this only after an explicit go/no-go approval. Use an operator-owned account and a controlled window in which the public cannot unintentionally enter Checkout.

1. Confirm there is no existing Circle Card subscription for the operator account.
2. Set `CIRCLE_CARD_BILLING_ENABLED=true` in the controlled production configuration and restart all instances.
3. Open Circle Card Pro through the intended feature journey and press the monthly CTA once.
4. Confirm Checkout shows the correct product, `£9.99`, monthly recurrence and no trial.
5. Complete the charge using an operator-controlled payment method.
6. Confirm the relevant Checkout, subscription and paid-invoice webhooks are delivered successfully.
7. Confirm the dashboard shows Pro only after server-derived entitlement and returns to the intended Circle Card capability.
8. Confirm a second press/session cannot create a duplicate subscription.
9. If public activation is not proceeding immediately, set the flag back to `false` and restart every instance.

Never infer success from `?billing=success`; the entitlement loader and paid-through invoice evidence remain authoritative.

## 9. Refund and cancellation procedure

For a test that must be unwound:

1. Cancel the operator subscription in Customer Portal or the Stripe Dashboard, choosing the timing approved for the test.
2. If a refund is authorised, open the payment in Stripe and issue the appropriate full or partial refund; record the business reason in the operator incident/change record.
3. Confirm `charge.refunded` and subscription lifecycle events reach the shared webhook.
4. Confirm any period-end access follows stored paid-through evidence and that expiry falls back to Free without deleting cards, links, Studio designs or paid-module content.
5. Do not delete the local subscription row or user content as a shortcut.

Stripe references: <https://docs.stripe.com/refunds> and <https://docs.stripe.com/billing/subscriptions/cancel>

## 10. Activate public billing

Only after the operator checkout, lifecycle checks, monitoring owner and rollback owner are all signed off:

1. Reconfirm the four live Stripe secrets/identifiers and the certification result.
2. Reconfirm the Pro public copy is monthly-only and the webhook endpoint is healthy.
3. Set `CIRCLE_CARD_BILLING_ENABLED=true` in the production secret manager.
4. Restart every application instance.
5. Verify a signed-out CTA requests authentication, a Free signed-in CTA opens the protected Checkout route, and non-Stripe entitled users are not offered Checkout.
6. Monitor safe action logs, webhook deliveries, duplicate-subscription alarms and support channels.

## 11. Emergency billing shutoff

If Checkout, entitlement or lifecycle behaviour is unsafe:

1. Set `CIRCLE_CARD_BILLING_ENABLED=false` immediately.
2. Restart every application instance.
3. Confirm new Checkout requests fail closed and CTAs return to register-interest behaviour.
4. Leave webhooks and Customer Portal operating so legitimate payment, cancellation and recovery evidence continues to reconcile.
5. Do not delete Stripe subscriptions or stored user content.
6. Inspect privacy-safe logs and Stripe deliveries, reconcile affected accounts deliberately, and record the incident.

The flag stops new Circle Card Checkout. It does not revoke paid-through access, disable Portal or replace subscription support procedures.
