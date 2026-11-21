# ScaleSmiths × Circle Card partner foundation

Status: **isolated development branch / NOT deployed / NOT connected** (21 Nov 2026).

## What exists already in Circle Card

- Users already own multiple `CircleCard` records; `cardType`, `isDefaultCard`, `isPublished`, `showInDiscover`, and archive state exist.
- The existing Circle Card Pro billing and access engine handles paid Stripe subscriptions, BCN included Pro, grandfathered grants and ambassador access.
- The new work does not replace this architecture, existing authentication, founder cards, billing or public card routes.

## Added in this branch

- Additive Prisma models and a migration for verified ScaleSmiths account linkage, partner/card IDs, independent sponsored Pro dates, per-partner client portfolio records, link-challenge hashes and deduplicated event receipts.
- `CircleCard.showOnPublicProfile`, separate from `isPublished`: allows a card to disappear from account-level card selection while its direct URL can remain published.
- `/dashboard/circle-card/scalesmiths`: staging-only partner card management and consent-gated portfolio view.
- Staging-only `ScaleSmithsPublicPortfolio` display on `/card/[slug]`, only if the card belongs to an active partner and the project has client consent, founder approval, delivered-work evidence and PUBLISHED status.
- Strict Zod v1 event contract, HMAC SHA-256 timestamp verification and tests for publication, access and Pro preservation.
- A new sponsored Pro entitlement source and lifecycle, **independent of Stripe**, controlled by a second explicit feature flag.
- A defensive block on generic managed-partner-card changes. A dedicated scoped editor must be completed before partner personalised edits become available.

## Feature flags — all default OFF

- `CIRCLE_CARD_SCALESMITHS_PREVIEW=true` enables only the staging partner workspace and public portfolio display and the branded-card generic-action guard.
- `CIRCLE_CARD_SCALESMITHS_SPONSORSHIP_ENABLED=true` allows an ACTIVE verified membership with started (non-expired) sponsorship to confer Pro. No Stripe subscription is created or cancelled.
- **Do not enable either flag until the migration is tested, scoped editing is complete, security review passes and Trev/Rhys explicitly approve.**

## Boundary and security decisions

- ScaleSmiths CRM/partner portal is authoritative for partner ID, partner status, client ID, verified acquisition, delivered project state and consent/approval.
- Circle Card is authoritative for its own user ID, personal card, sponsored card records, local selector visibility and entitlements. It remains fully usable for unrelated customers.
- External partner IDs are immutable and scoped; ownership may only be linked through a verified, single-use, short-lived challenge bound to an authenticated Circle Card user. **Never infer identity by email or name.**
- The partner card is a separate Circle Card ID and brand-managed template, not Trev/Rhys's founder card. No partner admin privileges.
- The personal card remains owned by the partner after offboarding. Ending a sponsor only removes that sponsor's access and card; it must not cancel paid Stripe subscriptions, remove unrelated Pro grants or delete personal cards.
- Portfolio visibility requires source verification, completed work, client permission, founder approval and an active partner card. No client names from `client.acquired` appear publicly without separate `portfolio.approved` event and local publication checks.
- Public links are HTTPS only, with no embedded credentials. Do not include payment data, client messages, private project details or commission ledger entries in public payloads.
- For signed events: verify raw body signature, timestamp and schema; use the event receipt table for idempotency; reject stale/out-of-order changes and log rejections. Event payload hash is for audit and replay analysis, not a signature replacement.

## Missing before connection (not claimed built)

1. Ratify OpenAPI event schemas, entity revisions/ordering and admin ownership claims with Rhys/Jarvis.
2. Finish founder-only account-linking challenge issue/consume flow and central ScaleSmiths template/card provisioning.
3. Implement a **separately guarded, partner-editable personal-details form**. Generic card editing must remain forbidden for managed ScaleSmiths cards.
4. Add authenticated, rate-limited, signed server-to-server event receiver with durable outbox/inbox retries, strict scope validation, idempotent transaction processing and observability; keep disabled by default.
5. Wire `showOnPublicProfile` to the existing card-picker and owner landing-selection logic, not just the new staging workspace; preserve direct URL `isPublished` behaviour.
6. Integrate the locally-approved portfolio with client website thumbnail/logo rendering, clickable case study and client website links, consent revocation and event ordering.
7. Confirm entitlement/revenue-reporting logic separates ScaleSmiths sponsored Pro from paying subscribers and Circle Card referral commissions.
8. Run `npx prisma validate`, `npx prisma migrate diff`, `npx prisma migrate deploy` in disposable staging, `npm test`, `npm run build`, multi-tenant security tests, manual mobile UX review and backup/rollback rehearsal. These have not been run in the current environment.

## Manual staging acceptance examples

- Partner registers a free Circle Card. Founder approves on ScaleSmiths. Only after verified linking, the separate sponsored card appears and the personal card remains intact.
- Personal card is excluded from public account card selection; partner card is shown by default. Both may later be toggled independently.
- Existing paid Pro + new sponsor -> remains paid; sponsor expiration leaves paid Pro fully intact.
- Client acquisition -> internal attributed record only. Consent + approval + completed work -> public portfolio entry with two distinct safe links.
- Withdrawn consent -> entry disappears from public card immediately, while internal attribution and audit trail survive.
- Suspension/exit -> ScaleSmiths branded card unavailable and sponsor Pro removed, not the partner's personal card or other paid Pro.
- Other Circle Card users with no ScaleSmiths record behave exactly as before.

This branch is **not production-ready** and should be reviewed as a staged foundation only.
