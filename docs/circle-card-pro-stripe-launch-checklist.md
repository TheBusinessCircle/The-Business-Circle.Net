# Circle Card Pro automated Stripe operator runbook

Status: operator procedure only. Keep `CIRCLE_CARD_BILLING_ENABLED=false` until a separately authorised public launch. Do not run these commands from a developer machine, commit `.env.production`, create Checkout sessions during setup, or add annual, trial, Teams, Connect, commission or payout resources.

The launch contract is one live **Circle Card Pro** product and one active GBP `999` pence monthly, licensed, flat-rate price with no trial. The dedicated Circle Card Portal permits payment-method updates, invoices and period-end cancellation, but no plan or quantity switching. The shared webhook URL is `https://thebusinesscircle.net/api/stripe/webhook`.

## 1. Production-server preflight

1. Deploy the reviewed code with billing still disabled; do not execute the operator during application build or startup.
2. Sign in to the production server as the restricted application operator and change to the checked-out repository root.
3. Confirm `.env.production` exists at the repository root, is ignored and untracked, is readable only by the operator where the platform supports Unix permissions, and contains:

   ```text
   APP_URL=https://thebusinesscircle.net
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_... # existing shared endpoint, if one exists
   CIRCLE_CARD_BILLING_ENABLED=false
   ```

4. Confirm the working tree/revision is the approved release and that no Stripe resource identifiers or secrets are in Git, the change ticket, shell history or logs.

## 2. Required dry run

Run exactly:

```bash
npm run circle-card:stripe:setup-live -- --env-file .env.production --mode live
```

This command reads all matching products, prices, Portal configurations and webhooks and prints a masked change plan. It makes no Stripe or file mutation without `--execute`. Review every `create`, `reuse`, `adopt-metadata`, `update` or `reactivate` action. Stop on any reported duplicate or ambiguous resource; correct the account deliberately rather than rerunning until it succeeds.

The resolver uses stable metadata (`product_key=circle_card_pro`, `price_key=circle_card_pro_monthly_gbp`, and `configuration_key=circle_card_pro_portal`). One exact legacy price without the price key may be adopted by adding metadata; it is not duplicated. Creation calls use stable idempotency keys, and the script re-inspects live state before mutation.

## 3. Explicit live execution

After an authorised operator approves the dry-run plan, run exactly:

```bash
npm run circle-card:stripe:setup-live -- --env-file .env.production --mode live --execute
```

The command refuses to proceed unless the mode is explicitly live, the key starts `sk_live_`, the origin is exactly `https://thebusinesscircle.net`, billing is explicitly false, the command is at the Git root, and root `.env.production` is ignored and untracked.

It creates or reuses only the Circle Card resources in the launch contract. It never archives or deletes Stripe resources. It creates a separate Circle Card Portal configuration and records its `bpc_...` identifier so Circle Card sessions select it explicitly; existing BCN Portal behaviour continues to use its existing/default configuration.

For the exact shared webhook URL, the command reuses one enabled endpoint, reactivates one unambiguous disabled endpoint, or creates one endpoint. Updating takes the union of existing and required events, so BCN-only events are preserved. More than one enabled endpoint at the exact URL is a hard conflict. Stripe does not reveal an existing endpoint's signing secret through this API; manually confirm that the stored `STRIPE_WEBHOOK_SECRET` belongs to the reused endpoint. A newly created secret is written to `.env.production` and is never printed.

## 4. Environment update and recovery

The operator writes only these managed values, without duplicate keys and while preserving unrelated values and comments:

```text
STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID=prod_...
STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID=price_...
CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID=bpc_...
STRIPE_WEBHOOK_SECRET=whsec_... # only when Stripe returned a new endpoint secret
CIRCLE_CARD_BILLING_ENABLED=false
```

Before a changed file is replaced, the script creates `.env.production.backup-<UTC timestamp>` and applies permission mode `600` to the backup and resulting environment file where supported. Store/handle that backup as a secret and remove it only under the normal secret-retention procedure.

To revert the file, stop application processes that could reload it, compare the timestamped backup, copy the approved backup contents back to `.env.production`, restore mode `600`, and rerun environment validation. Do not automatically delete or deactivate the newly created Stripe resources; record them and decide rollback separately so BCN resources cannot be removed accidentally.

## 5. Read-only certification while disabled

Run:

```bash
npm run circle-card:billing:validate-env -- --env-file .env.production
npm run circle-card:billing:certify-stripe -- --env-file .env.production --mode live
```

Certification retrieves and verifies the configured product, price, dedicated Portal and one enabled exact-URL shared webhook. It checks live mode; active state; stable identity metadata; GBP `999`; monthly interval count `1`; licensed flat-rate billing; no trial; product relationship; Portal URLs and allowed features; and the required webhook event superset. Extra BCN webhook events are valid and must remain. Certification is read-only, does not create Checkout, and does not enable billing.

## 6. Controlled launch sequence

In a later separately approved deployment/launch window:

1. Back up the database and deploy the approved application configuration with `CIRCLE_CARD_BILLING_ENABLED=false`.
2. Restart every application instance and run disabled-mode validation plus live read-only certification.
3. Confirm public CTAs still use the interest journey, the protected Checkout route fails closed, Portal uses the dedicated Circle Card configuration, normal uploads work, and the shared webhook remains healthy.
4. During a controlled operator checkout window only, enable billing on all instances, use an operator-owned account, verify £9.99 monthly/no trial in Checkout, pay once, and require successful webhooks plus authoritative server entitlement before treating Pro as active.
5. Verify duplicate Checkout protection, intended return journey, cancellation, payment recovery, downgrade preservation and restoration. If public launch is not immediate, disable billing again.
6. For an authorised refund, use Stripe's normal payment refund flow, retain the audit reason, and confirm `charge.refunded` delivery. Cancel through Portal or the approved Stripe operator flow; never delete application subscription rows or user content.
7. Publicly enable billing only after sign-off from the launch, monitoring and rollback owners.

## 7. Emergency shutoff

Set `CIRCLE_CARD_BILLING_ENABLED=false`, restart every instance, and confirm new Checkout requests fail closed. Leave webhooks and Portal operating so legitimate subscription evidence continues to reconcile. Do not delete Stripe subscriptions, shared webhook events, or stored Circle Card content. Investigate with privacy-safe application logs and Stripe delivery records before any account correction.
