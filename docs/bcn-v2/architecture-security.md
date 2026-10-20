# Architecture, data boundaries and security review

Source baseline: main commit `5fa2bbf6ac7d39aa14636882bbae2d2713faf11a`. The repository is public. No real environment files or customer datasets were imported into the checkout or committed.

## Verified architecture

- Next.js 15.5.15 App Router; React 19; TypeScript and Tailwind. New public pages reuse the application, logo, metadata helpers and privacy controls.
- PostgreSQL via Prisma 7.7.0 and the pg driver adapter. Existing adapter-pg is pinned at 7.4.2; alignment should be evaluated separately, not silently upgraded here.
- Auth.js/NextAuth 5 beta with a Prisma adapter, credentials hashing, verification, password reset, JWT sessions and server-side entitlement checks.
- Stripe subscription provisioning, pending registrations, products/prices, webhook idempotency and billing portal routes. No live billing configuration was changed.
- PostHog EU support plus a first-party analytics API/database. Existing PostHog replay and autocapture safeguards are retained.
- Existing grouped routes: public marketing/insights/legal; protected resources/directory/messages/community/events/calls/profile/dashboard; admin content, members, moderation, revenue, email and system operations.
- Existing resource CMS, publication/approval states, category/tag/block models, Cloudinary uploads, directory/profile models, direct-message permissions and moderation audit data remain reusable. No existing table or customer row is deleted.
- Existing integrations include Ably, LiveKit/TURN, Resend and Cloudinary. New core tools require none of them.

## New route map

| Route | Access / purpose |
| --- | --- |
| `/`, `/tools`, `/tools/[slug]` | Public, full results with no account |
| `/advice`, `/advice/[slug]` | Public practical guides |
| `/find-help` → `POST /api/bcn/help` | Public, bounded and rate-limited private intake |
| `/business-directory` | Public search of consented and moderated new records |
| `/connections`, `/how-we-work` | Public journeys and commercial disclosures |
| `/opportunities` | Clearly marked future area; noindex |
| `/register` → `POST /api/bcn/register` | Optional free BCN account, no Stripe provisioning |
| `/dashboard`, `/profile` → `POST /api/bcn/profile` | Existing authenticated BCN account, no paid entitlement needed for new profile |
| `/dashboard?view=legacy` and existing member areas | Existing contractual access and billing controls retained with original gates |
| `/help-consent?token=...` → `POST /api/bcn/consent` | Expiring bearer permission for a named provider; GET never grants permission |
| `/admin/bcn-help` → `POST /api/bcn/admin` | Fresh administrator and suspension checks, queue, providers, moderation and evidenced receipts |
| `/go/[slug]` | Inactive-by-default approved affiliate destination only; no arbitrary redirect target |

## New data

Seven additive tables: `BcnHelpRequest`, `BcnProvider`, `BcnHelpAudit`, `BcnBusinessProfile`, `BcnAffiliateOffer`, `BcnAffiliateClick`, `BcnRevenueEntry`. No new external database, payment account or shared identity integration. Existing users retain their original records; new profile publication is opt-in and starts unapproved.

Introduction states: RECEIVED → REVIEWED → AWAITING_CONSENT → CONSENTED → INTRODUCED → CLOSED. Rejection is available before introduction. Declining a proposal returns the request to REVIEWED and clears the proposed provider and token. Re-proposals invalidate the previous token. An administrator must record actual introduction after permission; the application does not automatically email a provider. Record withdrawal before sharing by rejecting/closing appropriately and entering the reason; do not share after withdrawal.

## Separation of the independent product

`BCN_V2_ENABLED=true` is required, alongside a valid deployment URL. It refuses to activate when APP_URL is the independent product's domain. The new public, auth and member shells never load its workspace navigation, notification data or registration forms. BCN-facing card pages, dashboard paths, uploaded-card entry paths, product APIs and the product manifest return a neutral 404 on the enabled BCN deployment. BCN's legacy registration endpoint is closed there; free registration has its own handler.

Internal models, assets, server actions, webhook processing, subscription/referral/commission services and internal scheduled endpoints remain present. They may still support the separate product and are deliberately not deleted. Shared auth retains legitimate BCN accounts.

**Deployment requirement:** confirm BCN and the independent product are separate processes/builds, environment files, proxy upstreams and release targets before enabling the flag. A single multi-host process is not a supported rollout target for this flag. Repository code alone cannot prove the VPS routing topology. Do not deploy this branch over the separate product or share a new BCN environment with it.

## Security controls in new flows

- Zod input schemas, exact configured-origin checks, JSON-only mutations, actual streaming request-size caps, bounded field lengths and server-controlled user IDs.
- Existing shared Redis rate limiter reused. New intake, registration, profile, consent, admin mutation and redirect endpoints fail closed in production if shared Redis is absent or unavailable. In-memory limits are development-only for these flows.
- Administrator identity, role and suspension are checked against the database on every new admin mutation. Member profile updates derive the owner from the session.
- Consent tokens are 256 random bits; only SHA-256 hashes are stored. Expiry is seven days, proposals are single-use and updates are transactional. Audit records contain state changes, not raw tokens. No contact information appears on the token page.
- Named provider approval is rechecked when proposing, consenting and introducing. A positive fee requires a written agreement reference. A database check constrains permission-dependent states and nonnegative potential fees.
- A redirect needs active approval, a recorded programme reference and disclosure, HTTPS and an exact allowed hostname. Destinations come from the admin-managed record, never a visitor parameter.
- Received revenue uses integer pence, unique payment references, evidence references and separately signed reversals. The new ledger counts BCN receipts only, not provider turnover or affiliate clicks. Manual evidence review remains necessary.
- New first-party analytics mounts only after analytics consent. No calculator amounts, quote details, enquiry text, tokens or customer contact fields are sent. `/help-consent` is excluded from new first-party collection and has no-referrer/no-store/noindex protection. Existing PostHog sanitisation is retained.
- Free-directory publication requires consent, moderation, an active account and verified email. A profile change removes approval. Existing profiles are not automatically made public in the new directory.

## Remaining launch gates and limits

- No production database or VPS shell was available. Current deploy SHA, reverse proxy, process supervisor, backups and account-to-subscription mapping remain unverified.
- Existing deployment documentation offers VPS/Docker instructions; it does not prove what production currently runs. CI tests/builds on PRs but has no deployment job.
- The existing CSP permits unsafe-inline and unsafe-eval; tightening this across legacy services needs a separate compatibility change. It is not made stricter speculatively here.
- Consent links must be sent privately to the actual requester through an approved operational process. Suppress/redact token query strings in proxy/application access logs and monitoring before launch; a no-referrer policy does not remove server access logs.
- Review the privacy supplement, lawful bases, provider notices, retention/erasure process, complaints handling and affiliate disclosures before public launch. The 12-month closed-request retention target needs an approved scheduled retention process; no data deletion job was executed or enabled here.
- Verify proxy IP-header trust and multi-instance Redis behaviour on staging. Payload limits also need reverse-proxy enforcement.
- Test email delivery/verification, recovery and existing membership portal with synthetic staging accounts. This work sends no live customer communications.
- Automated accessibility and local browser results are evidence for the sampled flows, not a full accessibility or penetration-test certification.
