# Deployment instructions and membership transition

The owner authorised the BCN 2.0 switch on 21 October 2026 after the private preview was presented. Proceed through the technical release checks with authorised hosting access; do not request the same conversational approval again. No billing changes are included or authorised. The current blocker is server access and verification of isolated deployment topology, backups and staging. See editorial-operations.md for the 104-article schedule and current access boundary.

## Evidence and access boundary

The inspected repository has a shell deployment helper, a VPS production runbook and Docker Compose files. GitHub CI installs, generates Prisma, applies migrations to a CI PostgreSQL service, tests and builds; it does not deploy. Public BCN currently redirects the root to the membership entry page. This checkout cannot identify the actual production process manager, deployed commit or exact proxy routing. Obtain those read-only facts and a tested backup/rollback point before releasing.

## Staging release

1. Use an isolated BCN checkout on `codex/bcn-2-free-business-help`; do not deploy from a separate-product checkout. Pin the reviewed commit. Confirm no automatic production deployment is tied to this branch or PR.
2. Create a synthetic staging database using the existing PostgreSQL infrastructure, not a copy of private data from another product. Use test-mode payment configuration only if testing legacy membership functions; the five public tools need no payment service.
3. Configure the existing database, Auth.js, Redis and email variables using the current production environment validator/runbook. Add `BCN_V2_ENABLED=true` for both build and runtime. Keep `BCN_DIRECT_CALLS_ENABLED=false` until the existing LiveKit/TURN service passes an isolated two-browser staging test; enabling it does not create a new paid service. The production build's APP_URL/NEXTAUTH_URL must satisfy the repository's canonical production URL validator. For an alternate staging hostname, use a host-approved proxy mapping or the established development environment; do not weaken canonical URL validation just to make a preview build pass.
4. Run `npm ci`, `npm run db:generate`, `npx prisma migrate deploy`, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build`. Review any existing baseline failures documented in verification rather than ignoring new failures. Do not use `prisma db push`, `migrate dev`, a reset or demo seeding against production.
5. Verify sign-in/recovery/verification, free-account dashboard/profile, a private help request, admin moderation, a declined and an accepted named-provider proposal, token replay, provider withdrawal, and actual revenue/reversal records. Test shared Redis failure: new mutation routes must return 503.
6. Test the independent live product read-only before and after the approved BCN release. Confirm login, card/wallet, referrals, commissions and billing separately using authorised test accounts. No changes to those systems are part of this task.
7. Approve the privacy text and agree provider operating procedures. Activate no affiliate offer until its programme and destination are approved. Build an approved retention process before collecting live enquiries.

## Production release after approval

- Record running commit, process/upstream, environment, health checks and database backup. Verify the backup can restore to an isolated environment.
- Review the additive SQL `20261020230000_bcn_free_help`. It creates only seven new tables, their indexes, foreign keys and domain checks. Also review `20261021010000_bcn_connection_preferences` (an opted-out-by-default preference on the new profile table) and `20261021020000_bcn_build_together` (four new request/offer/report/audit tables and indexes). Existing customer and subscription tables are untouched.
- Use the site's actual existing release mechanism once verified. Install/generate, apply approved migrations and build the reviewed BCN commit with the same flag and canonical configuration used in staging. Switch only the BCN upstream/process.
- Check public homepage, all tools, sitemap/canonicals, mobile/desktop sign-in, free profile, private intake and admin. Check legacy entitlement and billing portal behaviour. Confirm no visible independent-product links, branding or features in BCN.
- Verify an independent-product control request against the unchanged baseline. Never run its Stripe setup or billing scripts as part of BCN deployment.
- Submit the reviewed sitemap in the owner's Search Console. Review indexed URLs, backlinks and top landing pages before making any broad redirect or content-removal decision.

## Rollback

Restore the previously deployed build and its original environment with the flag unset/off. Keep the eleven additive tables and any new records; do not roll them down or drop data. A flag change alone does not necessarily remove prerendered pages, so use the previous build artifact. Restore the database only for a separately reviewed incident plan. No subscription cancellation, refund or entitlement change is needed for an application rollback.

## Membership migration plan

1. Export a private read-only reconciliation of local User, Subscription, PendingRegistration, Stripe customer/subscription, discounts, invoices, payment/refund status, cancellation dates and contractual terms. Keep identifiers outside this public repository. Inspect pending registrations for partially completed checkouts before changing acquisition routes.
2. Classify actual rights, not just whether money was collected: active discounted plans, prepaid annual terms, trials, cancellation-at-period-end, failed/incomplete plans and administrators/grants. A £0 invoice does not prove a subscription or entitlement is irrelevant.
3. Preserve existing account logins, valid paid/granted access and billing portal controls. New free features neither create paid subscriptions nor erase old obligations. Pending legacy registrations require case-by-case recovery rather than automatic deletion.
4. Prepare customer-specific communications: explain the free tools, which existing services remain available, any proposed future change, the effective date and support route. Do not imply cancellation, refunds or changed rights until those actions are approved and performed.
5. Obtain explicit owner approval for every live billing migration batch. Record scope, expected effect, customer notice, discounts/prepaid access and rollback/remedy plan. No batch, cancellation, refund, price change or customer email was executed here.

Suggested communication draft for later review:

> We are opening new Business Circle tools and practical guides for everyone to use free. Your existing account and current membership arrangements remain in place. You can continue to sign in with your usual details. If we propose any change to your membership, we will explain it directly before it takes effect. Contact contact@thebusinesscircle.net with questions about your account or billing.

## Operations and reporting

Test new idea submission → request moderation → free/discounted offer → offer moderation → owner choice → private chat → report/block → owner-reported progress. Check foreign-owner reads/writes, expired/rejected requests, misleading prices and duplicate acceptance. Confirm existing group-call/paid-resource permissions remain. Assign a moderator, approve the new terms/privacy text and document Online Safety Act scope and relevant risk/access assessments before a broad community launch. See the growth research brief for authoritative guidance and limits.

Use `/admin/bcn-ideas` for practical-help moderation, reports and consent audits. Use `/admin/bcn-help` for review and evidence-backed receipts. Proposed referral fees and affiliate clicks are demand indicators, not income. Existing analytics can supply consented page/source/return-visit views; the new screen adds tool start/completion, request status, introductions, clicks and BCN receipts. Reconcile manually recorded receipts with bank/network settlement evidence, with explicit reversals for refunds. Do not combine them with the service provider's own sales.

Review the six editorial drafts with an accountable human editor before public launch. UK VAT assumptions were checked against HMRC on 20 October 2026: standard 20%, reduced 5%, zero-rated and exempt supplies differ. The tools deliberately do not calculate tax liability or handle construction reverse charge/special schemes. No search ranking, affiliate income or customer outcome is guaranteed.
