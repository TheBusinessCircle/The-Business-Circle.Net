# Native Hucknall hub and Circle Discover foundation

User authorization: Trev requested a professionally presented Hucknall destination, normal Circle profile/connection/Wallet behaviour, Discover enabled and public Google-readable About content. This supersedes the earlier private-only presentation scope for the native hub. The original prepared design draft remains private.

## Changes

- Real `CircleCard` ID `cmvzwzm3y000amkahigz25s8r`, owned by the exact creator of the existing prepared draft, published at `/card/hucknall-circle-hub` with Discover ON.
- Native viewer authentication, Spin to Connect, Wallet save/remove, connection requests, QR, vCard, share and Trust controls are reused from the current public-card renderer. Existing server actions are not replaced.
- One immutable community-hub ID has a sponsored identity allowance. It does not displace either existing personal/business card or expand ordinary users' limits. Existing allowance counters may need a community-hub label in a later workspace polish pass; this is not a paid-plan upgrade.
- The real public hub queries currently eligible, opted-in NG15 businesses using canonical public-card entitlement checks. Illustrative cards remain confined to the private design preview.
- Eligible businesses display a server-rendered "Part of Hucknall Circle Hub" link on the shared public card route, covering Free, Pro and bespoke layouts. Together with the directory link this provides navigation in both directions. The membership link rechecks current publication, Discover consent and postcode, hides if the hub is unavailable, and never exposes the full postcode. It is an internal link, not an external backlink or a promise of search ranking.
- Existing business owners can set postcode, category and Discover consent at `/card/hucknall-circle-hub/join`. Joining is free. The full postcode is not displayed in directory output.
- Researched, original About content is rendered as HTML at `/card/hucknall-circle-hub/about`, with canonical metadata, AboutPage/WebSite structured data, relevant references and a dedicated sitemap. The robots wrapper retains existing private exclusions and adds the hub sitemap. The authenticated join page stays noindex.

## Deployment

Run `install-native-hub.py --ref <pinned commit>` in the server's existing root SSH session. It identifies and clones the current release, copies the narrow payload, applies guarded transformations to that release's native renderer, plan selector, Prisma model and robots metadata, then generates a scoped Prisma client. Shared dependency stores are refused rather than modified.

The additive migration creates two nullable business directory fields and one index, recording its checksum in Prisma migration history. Existing business addresses are not inferred or enrolled. This migration remains in place if the later application build fails; older code can continue to run with the additional nullable columns.

Only after the isolated build and service health checks pass does the activation script create the native identity for the draft's existing owner, set publication and Discover consent, and verify the public hub, About page, sitemap and robots output. The old Nginx target is retained for rollback. A failed pre-switch activation is reversed to the recorded prior hub state without deleting identities or changing other cards.

The original prepared draft stays private and its native published identity uses a separate table record. The same ID is valid because the records are in different tables. Future ownership transfer requires coordinated review of the native identity, management rights and the original draft, not simply a name change.

## Acceptance

After deployment, verify public and signed-in views, owner self-save behaviour, a different user's Wallet save/remove and Spin/connection flow, actual Discover visibility, mobile layout, category/search, vCard and QR. Recheck the existing butcher and Precision previews. Verify HTTP 200 without authentication for the hub, About and sitemap and no noindex header/meta on public content. Google indexing is not guaranteed by crawlability and must be observed separately.

Full general-signup postcode enforcement and direct editing of the new fields throughout every existing shared-card editor remain the broader local-hub integration work. The dedicated free join route provides an owner-authorized path immediately; this release does not falsely claim every older editor has already been upgraded.

## Research sources

Original content was checked on 3 November 2026 against Ashfield District Council's Hucknall Market page; Discover Ashfield's Hucknall town-centre and St Mary Magdalene pages; Hucknall Tourism & Regeneration Group's history; Nottinghamshire's Historic Environment Record; and NET's Hucknall stop information. They are linked from the About page. No Google reviews, photos or business listings were copied, and no partnership, inspection or endorsement is claimed.
