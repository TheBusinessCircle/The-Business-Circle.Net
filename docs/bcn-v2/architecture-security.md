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
| `/start` | Public browser-only starting plan, text download and practical pathways |
| `/ideas` | Public search of approved, unexpired practical-help requests |
| `/ideas/new`, `/ideas/mine`, owner-only parts of `/ideas/[id]` | Verified-account submissions, private offers and owner controls; noindex |
| `/messages`, `/messages/[threadId]` → `POST /api/bcn/conversations` | Free verified-account chat, rules acceptance, participant access and recipient choice |
| `/calls/[roomId]` | Optional accepted-pair calling, explicit flag/configuration plus existing permissions |
| `/admin/bcn-ideas` → `POST /api/bcn/ideas` | Fresh administrator moderation, reports and auditable state/consent decisions |
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

The initial seven additive tables: `BcnHelpRequest`, `BcnProvider`, `BcnHelpAudit`, `BcnBusinessProfile`, `BcnAffiliateOffer`, `BcnAffiliateClick`, `BcnRevenueEntry`. Four further practical-help tables and an opted-out-by-default profile preference extend this to eleven tables; see the 21 October section below. No new external database, payment account or shared identity integration. Existing users retain their original records; new profile publication is opt-in and starts unapproved.

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

## 21 October: practical help and free private conversations

Four additive tables (`BcnIdeaRequest`, `BcnIdeaOffer`, `BcnIdeaReport`, `BcnIdeaAudit`) extend the original seven. A separate `acceptsMessages` field on the new business-profile table defaults to false; existing profile-publication permission is not treated as permission for directory chat requests.

New authenticated mutation endpoints `/api/bcn/ideas` and `/api/bcn/conversations` use the configured-origin guard, a bounded JSON reader, shared limiter fail-closed behaviour in production, fresh active/verified accounts and server-controlled ownership. Idea status transitions run in serializable transactions. Only administrators can moderate. Owners cannot approve their own requests/offers or read another owner's private offers. Helper consent plus owner selection of a reviewed offer opens a two-person thread in the existing direct-message tables; replay returns the same thread. No payment or automatic fee is created.

New requests expire after thirty days and are limited to two open requests per owner. Edits return to review and withdraw earlier offers. Operators review explicit scope, timing, full prices and evidence behind claimed discounts. Free and swap offers cannot contain a cash price; discounted offers require a higher comparison price. Those checks do not establish professional credentials or prove a usual price is genuine.

The existing private-message service permits verified active BCN accounts without a subscription only when the isolated BCN 2.0 flag is active. The original deployment and separate product retain their old gates. Directory requests also require an approved, public profile with the separate messaging opt-in. Consent on acceptance, participant authorization, blocking, reports and archive controls remain. The UI exposes names, not account emails. Historical attachments remain protected by participant access; no new upload facility was added to the free chat composer.

Optional direct calling requires `BCN_DIRECT_CALLS_ENABLED=true`, secure LiveKit configuration, existing global/emergency controls, verified/rules-accepted connected participants and no block. It is off by default. Free authentication at room APIs is followed by room-type permissions; group rooms retain the subscription/tier/host rules. The presence endpoint validates room access before accepting a ping, preventing an outsider from creating their own invitation. Access/token responses omit unnecessary room/user data in BCN mode. Call exit returns to private chats. Configuration readiness and invitation tests are not a real media-connectivity test. Blocking denies new/repeated call access; users should leave an existing call immediately if needed. Revalidation cannot recall media already received or an already-issued token by itself; test the existing provider's active-session removal and emergency shutdown in staging before enabling direct calls.

New private idea, chat, account and call routes are excluded from page analytics; private referrers are redacted. Replay stays disabled. Board state, moderation records, owner-reported progress, introductions and evidenced receipts are distinct measures. No board match is labelled earned revenue or independently verified success.

Publication and offer/contact permissions are recorded. Retention targets are review targets, not automated deletion jobs. The staging/release review must cover the expanded privacy/terms text, moderator capacity, complaints handling, an Online Safety Act scope assessment and any applicable risk/access assessments. Adult-only terms do not establish that children cannot access the service. See `growth-and-revenue-research.md` for Ofcom, ASA and ICO sources and the commercial implications.
