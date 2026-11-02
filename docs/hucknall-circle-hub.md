# Hucknall Circle Hub

The public hub lives at `/card/hucknall-circle-hub`. It is a system directory card, with categories, search, sharing and links to public Business Circle Cards. It is not a user-owned card record and does not impersonate a business or create Wallet connections.

## Eligibility

- A published, unarchived BUSINESS card, Discover explicitly enabled, a full normalized UK postcode in district NG15, an unsuspended owner, and visibility under the owner's existing card allowance.
- The coverage label is “Hucknall & NG15”. Matching follows the NG15 postcode district requested for this launch, rather than claiming a precise town boundary.
- New business onboarding requires a full postcode before publication. The full editor requires it when creating a new Business card. Existing owners can add it and a category in the editor or Settings.
- Matching is computed from current card state. Opting out, unpublishing, archiving, suspension, changing postcode or losing card visibility removes eligibility. There is no persistent membership table to leave stale listings behind.
- Existing cards are not automatically enrolled or given inferred postcodes. The migration adds nullable fields only.
- Directory responses contain no full postcodes, account details or private contact fields. A business may separately choose to publish its address on its own card.

## Ranking

Within each category, higher Circle Trust directory scores come first. The score uses existing public Circle Trust signals while excluding the existing `bcn-member` membership point. Pro, custom design, and subscription prices are not ranking inputs. Equal scores sort by name, then slug. New businesses with zero scores remain eligible.

This is not a customer star-rating service or proof of a checked business address. Existing Trust semantics are preserved: profile signals, verified connections and approved wallet testimonials. The directory explains this distinction.

## Monetisation

Directory membership stays free. Existing Pro and custom-design routes remain optional. This change does not create checkout sessions, alter subscriptions, set a custom design price or enroll anyone into paid billing.

## Integration and deployment

Source base: `aa1843030ced6de537c8d6ec660f3af942604c68` on `feat/lawrence-severn-bespoke`. This is the latest referenced butcher-card branch. The running standalone deployment must be identified before release; this branch must not be used as a whole-site replacement without reconciling its runtime changes.

1. Integrate the hub changes into the actual current Circle Card release source, preserving existing standalone routes, branding, billing, auth and bespoke cards. If clean routes are required, use its existing route helper for onboarding and Pro links in the hub page.
2. Back up the database and record the active release. Check for an existing user card with slug `hucknall-circle-hub`; the migration refuses a collision rather than taking over that card.
3. Run `prisma validate`, `prisma generate`, focused tests, TypeScript and the normal production build on that release source.
4. Apply migration `20261102233000_circle_card_local_business_hubs` before activating code that selects the new fields. Do not use `db push` against production.
5. Verify with authorized test businesses: free account; valid NG15 postcode; category; consent off/on; unpublish; postcode outside NG15; archive; suspension; card allowance; equal scores; changed trust; mobile layout; search/filter; share; public card backlink; and returning owners' settings saves.
6. Confirm no full postcode appears in directory HTML or React payload. Confirm no businesses appear merely because their postcode was saved without Discover consent.
7. For rollback, restore the previous app release. Leave the additive nullable columns in place so captured owner settings are preserved.

## Validation completed before handoff

- Prisma schema validation and client generation.
- TypeScript against the selected GitHub branch's source manifest plus new hub files.
- Focused tests for postcode matching, lifecycle, ranking, current consent recheck, public payload privacy, canonical entitlement checks, signup publication and public rendering.
- ESLint on feature files and modified application files.

Production migration, production build, browser/device acceptance and live rollout remain unverified. The available SSH connection was denied, so no live database or deployment was changed.
