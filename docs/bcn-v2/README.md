# BCN 2.0 implementation review

Status: development branch; production is not changed. Flag off by default.

Update 21 October: the owner has authorised the live switch. Server access, isolated deployment verification and the remaining staging checks are still required. A 104-article free blog and twice-weekly UK schedule are implemented. See [the calendar](editorial-calendar.md) and [publication operations](editorial-operations.md). New articles remain unreleased until an actual launch date is configured.

The proposition is **Real help for real business owners.** Welcome startups and established owners of all kinds. The first financial tools use UK assumptions. Let someone complete a useful task before asking for an account.

## Delivered in source

- Blue public homepage and navigation, keeping the established logo and legal entity.
- A free starting plan at `/start`, plus the moderated `/ideas` practical-help board for business ideas and current problems.
- Reviewed free, discounted, paid and skill-swap offers; explicit owner choice opens private chat, with a private owner-reported progress record.
- Free private chat for verified BCN accounts, separate directory-message opt-in, requests/acceptance, blocking/reporting and existing-history reuse.
- `/admin/bcn-ideas` for practical-help moderation, reports and consent/status audits. Optional connected-person video is retained behind configuration and existing calling controls, off by default.
- Five account-free tools: job pricing, profit/break-even, cost comparison, manual website checklist and editable print/PDF quote builder.
- Six practical guides, dated source links and connected next steps.
- Free BCN registration and opt-in business profiles using the existing authentication system. These do not create any separate-product account or subscription.
- Searchable directory containing only newly consented, moderated listings. Legacy member records are not automatically published.
- Private request intake, administrator moderation, named-provider consent, single-use hashed expiring permission tokens, audit records and explicit introduction status.
- Provider approval and agreement references, optional related-business disclosure, potential referral fees separated from received revenue.
- Inactive-by-default affiliate offer records, an exact-host validated redirect, consented click counts and an evidenced cash-receipt ledger with duplicate-reference protection and reversals.
- Operations screen at `/admin/bcn-help`, preserving existing administrator and member entitlement controls.
- Feature-isolated public shell, BCN-only sign-in and profile surfaces, hidden legacy product entry routes, consent-gated first-party analytics and new sitemap entries.

## Deliberately not launched

Affiliate partnerships have not been applied for or approved. No live affiliate link is activated. Digital products, sponsorship, featured listings and the separate Business Opportunities board remain future work. Free private chat and Build it together are implemented on this development branch; no open public chat feed was added. Existing contracted rooms, events, paid resources and billing retain their protections. Live video connectivity and ordinary PostgreSQL staging still require verification.

Read [commercial strategy](commercial-strategy.md), [architecture and security](architecture-security.md), [deployment and membership migration](deployment-migration.md), and [verification results](verification.md).

## 21 October update: people helping people

Read [growth-and-revenue-research.md](growth-and-revenue-research.md) for the expanded audience, practical-help board, controlled pilot, acquisition experiments and revenue sequence. The blue design, `/start`, `/ideas`, free private chat and `/admin/bcn-ideas` are implementation work on this branch. This does not represent a live production rollout. Optional direct video remains off by default until the existing stack is tested on staging.
