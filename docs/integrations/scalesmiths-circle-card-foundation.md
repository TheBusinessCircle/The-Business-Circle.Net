# ScaleSmiths × Circle Card partner foundation

Status: **isolated development branch / NOT deployed / NOT connected** (21 Nov 2026).

## What exists already in Circle Card

- Users already own multiple `CircleCard` records; `cardType`, `isDefaultCard`, `isPublished`, `showInDiscover`, and archive state exist.
- The existing Circle Card Pro billing and access engine handles paid Stripe subscriptions, BCN included Pro, grandfathered grants and ambassador access.
- The new work does not replace this architecture, existing authentication, founder cards, billing or public card routes.

## Implemented on the draft branch (not deployed)

- Additive Prisma models/migration for verified partner account linking, one partner-owned ScaleSmiths card, sponsorship dates, public portfolio records, unique client attribution, immutable event receipts and a centrally managed company brand template.
- Scoped staging partner dashboard with personal-card selector toggle, approved-field partner identity editor and a consent-gated client portfolio.
- Founder-admin staging page for choosing an exact Circle Card user ID, issuing one-time account-link claims and editing central brand information. Signed-in partners claim their own link token before backend approval.
- Account-link token cryptography (256-bit random token, SHA-256 hash storage, 10-minute expiry, single-use transactional consume), no email auto-matching.
- Separate branded partner card issuance after the signed `partner.approved` event, and suspensions/exits that unpublish it without touching personal cards or Stripe payments.
- Versioned Zod event schema, OpenAPI draft, HMAC signature validation, body-size/time guards, transactional idempotent webhook processing, stale-event rejection and cache revalidation.
- Admin-updatable ScaleSmiths company tagline/logo/website fields propagated only to assigned partner cards; personal details remain partner owned.
- A distinct sponsored Pro entitlement in the current billing resolver, with paid subscriptions taking precedence; the source is classified separately from revenue.
- Public portfolio component requiring an ACTIVE approved partner card, client consent, founder approval, delivered work and PUBLISHED state. Links to case study and client's own website are HTTPS-only.
- Focused automated tests for event schemas, signature verification, personal card selection, ownership, sponsorship separation and one-time link tokens.
- GitHub draft PR #37. The production site and ScaleSmiths integrations have **not** been updated.

## Feature flags — all default OFF

- `CIRCLE_CARD_SCALESMITHS_PREVIEW=true` enables only the staging partner workspace and public portfolio display and the branded-card generic-action guard.
- `CIRCLE_CARD_SCALESMITHS_SPONSORSHIP_ENABLED=true` allows an ACTIVE verified membership with started (non-expired) sponsorship to confer Pro. No Stripe subscription is created or cancelled.
- `CIRCLE_CARD_SCALESMITHS_WEBHOOKS_ENABLED=true` permits signed server-to-server events only when preview is also enabled and `SCALESMITHS_CIRCLE_CARD_WEBHOOK_SECRET` is configured with at least 32 bytes.
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

## Remaining before connection or deployment

1. Validate the whole branch with green GitHub CI: Prisma generate, clean PostgreSQL migration, Vitest, Next build and Next server-action build verifier. Older CI runs had issues and **a final green run is required**.
2. Run role-based integration tests using a disposable staging database and independent accounts (free, paid Pro, partner, client, founder) including concurrent replays, consent withdrawal, disputes and offboarding. Verify actual hostname and latest Circle Card deployment branch.
3. Review the draft API contract with Rhys/Jarvis, confirming partner/client IDs, event timestamps/revisions, signing key storage and whether existing ScaleSmiths data matches the nine event variants.
4. Confirm the final ScaleSmiths logo asset, brand palette, wording, offer and case-study permissions. Do not create or reuse a founder card.
5. Rehearse data migration, backup/restore, offboarding, failure scenarios and rollback in staging; review GDPR consent provenance, consent revocation latency, audit records and permitted claims.
6. Add production-secret rotation, monitoring/alerting and sender retry/dead-letter procedures before cross-system traffic is enabled.
7. Only after joint Trev/Rhys approval: deploy the validated migrations and application to staging, enable flags sequentially, exchange credentials securely, run a limited full end-to-end demo, then make a separate production go/no-go decision.

## Manual staging acceptance examples

- Partner registers a free Circle Card. Founder approves on ScaleSmiths. Only after verified linking, the separate sponsored card appears and the personal card remains intact.
- Personal card is excluded from public account card selection; partner card is shown by default. Both may later be toggled independently.
- Existing paid Pro + new sponsor -> remains paid; sponsor expiration leaves paid Pro fully intact.
- Client acquisition -> internal attributed record only. Consent + approval + completed work -> public portfolio entry with two distinct safe links.
- Withdrawn consent -> entry disappears from public card immediately, while internal attribution and audit trail survive.
- Suspension/exit -> ScaleSmiths branded card unavailable and sponsor Pro removed, not the partner's personal card or other paid Pro.
- Other Circle Card users with no ScaleSmiths record behave exactly as before.

This branch is **not production-ready** and should be reviewed as a staged foundation only.
