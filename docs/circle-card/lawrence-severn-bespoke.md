# Lawrence Severn & Son bespoke Circle Card

The owner's existing prepared-card slug `lawrence-severn-son-4b134d448659` receives a dedicated cream/burgundy heritage layout. It reuses the current card's phone, address, hero photo, active gallery, spin, wallet, share and vCard controls. The gallery remains Pro-gated and inactive photos are omitted. All other cards retain their existing renderer.

The original screenshot uploads have delivery crops that remove the surrounding phone interface. The source crop coordinates and attribution are recorded in `lawrence-severn/content.ts`. Downloaded original-pixel crops are included as preview fallback assets. No AI-generated reconstruction is used. The live private prepared card was updated to use these cropped source URLs on 2 November 2026.

## Deployment

The live `/app/prepared/...` route is not present in this repository's current main branch, and CI contains no deployment job. Do not replace the active application wholesale with this checkout. Reconcile these files into the active Circle Card release, preserving that release's prepared-card routes and ownership checks, then use its normal build, release and rollback procedure.

Confirm that the prepared renderer calls `PublicCircleCardProfile` and passes the preserved slug. Check both plan previews using the existing private record. Confirm the Pro renderer supplies its effective Pro entitlement, and ensure Free does not expose the gallery. Verify authenticated ownership, `isDemo`, unpublished state, spin/share/vCard behavior, and phone/maps/Facebook links. Check the design at 390px, 768px and desktop widths, including gallery enlargement and the mobile contact bar. No database migration, public-showcase switch, account/permission change, claim invitation, new subscription, payment or customer email is required.

The new layout is not deployed by pushing this branch. Do not mark it live until the active server release and actual prepared preview have been verified.

## Validation

Targeted tests cover exact card selection, Pro-gallery/missing-contact handling, active saved gallery content, original-photo crop delivery, and reuse of the parent's connection controls. TypeScript and ESLint validation are also required. A self-contained design preview is provided separately for owner review; it does not contain an authenticated connection session.

## Free / Pro / Custom sample integration

Custom is an explicit presentation of the existing Pro sample, not a new plan. Free and Pro keep the normal renderer. The custom renderer runs only with `presentation="custom"` on the exact Lawrence Severn draft. Its spinning identity uses the existing `CircleCardSpinToConnect` action; a supplied business logo takes precedence, otherwise a name-based brand face is used. The existing native share, wallet, contact and QR controls are preserved. Prepared demos remain demos and do not fabricate successful connections.

In the **active release's** existing prepared preview route:

1. Resolve the record using the existing signed-in ownership checks.
2. Call `resolvePreparedCardSample({ plan: searchParams.plan, presentation: searchParams.presentation, hasCustomPresentation: isLawrenceSevernCard(card) })`.
3. Pass only the returned `plan` to the existing Free/Pro sample builder. Do not alter subscriptions, paid entitlements, ownership or publication state.
4. Replace the existing two-link navigation with `PreparedCardSampleTabs`, supplying the actual preview path, returned `sample`, and the same exact-card custom flag.
5. Pass returned `presentation` into `PublicCircleCardProfile`. Custom's canonical URL is `?plan=pro&presentation=custom`; `?plan=custom` never grants a new plan.

The relevant helpers live beside the custom component. This wiring cannot be applied here because the active prepared preview route is absent from the repository. It must be reconciled into the server's active source before deployment. A repository push alone will not add the third live sample option.

## Existing account deployment

The live prepared-card source is newer than repository main. The deployment in
`ops/circle-card/lawrence-severn/install-account-preview.py` therefore clones the
identified active release, adds only the Lawrence component folder and its four
photo assets, and replaces only the authenticated prepared-preview route using
the adjacent template. It never overlays the shared public renderer, database
schema, authentication, billing, or prepared-card services from this repository.

The installer requires a pinned commit, verifies the known live service and
Nginx target, builds on port 3372, checks login, private-route protection and a
photo asset, then switches Nginx. It keeps the old service running and saves the
previous Nginx configuration. A failure before switching leaves the current site
in service. Service drop-in overrides or custom stop handling require review.

After deployment, verify the signed-in record's Custom, Free and Pro tabs at
`/app/prepared/cmvzmvkzm00g7u7ah42orvyi8/preview?plan=pro&presentation=custom`.
The record remains private; preview spins do not save connections until claimed
and published. Custom remains a presentation of Pro, not a billing plan.
