# BCN Launch Readiness QA

This checklist is for final pre-launch verification. It does not change pricing, Stripe product mapping, public visual direction, or the member accent theme system.

## Test Account Matrix

Use non-production test accounts unless intentionally validating production with approved live credentials.

| Persona | Required state | Expected result |
| --- | --- | --- |
| Guest | Signed out | Public pages load; private routes redirect to `/login?from=...`; no member accent theme output appears publicly. |
| Unpaid user | Signed in, no active subscription | `/dashboard` and member-only routes redirect to `/membership` with billing context; checkout can be started from join/membership. |
| Foundation | Active subscription, `membershipTier=FOUNDATION` | Dashboard, resources, directory, community, messages, events, calls, wins, and profile are available; Inner Circle remains preview/upgrade gated. |
| Inner Circle | Active subscription, `membershipTier=INNER_CIRCLE` or role access | Foundation routes plus `/inner-circle` are available; Core-only positioning remains unavailable unless specifically granted. |
| Core | Active subscription, `membershipTier=CORE` | All member areas available; Core access copy and badges render correctly. |
| Admin | `role=ADMIN` | Admin routes are available; member routes bypass subscription gating where admin access is intended. |
| Suspended user | `suspended=true` | Authenticated private routes redirect back to login with `error=suspended`; no member workspace access. |

Helpful script: `npx tsx scripts/reset-rules-test-member.ts --verify` checks the existing BCN rules test member. Use `--tier foundation` or `--tier inner-circle` only for intentional non-production test setup.

## Stripe Checkout Smoke Test

Stripe subscriptions should use Billing APIs with Checkout Sessions. Do not test by manually creating raw PaymentIntents for membership renewals.

1. Confirm required environment variables exist for the selected tier and interval price IDs.
2. Create or use an unpaid test user and choose Foundation monthly from `/membership`.
3. Proceed to join/account setup and start Stripe Checkout.
4. Complete Checkout with a Stripe test card.
5. Confirm `checkout.session.completed` reaches `/api/stripe/webhook` with a valid signature.
6. Confirm the webhook creates/updates the local subscription, Stripe customer ID, subscription ID, price ID, status, billing interval, and membership tier.
7. Confirm first login lands in the member workspace only after payment confirmation.
8. Confirm BCN Rules acceptance appears before normal member use.
9. Repeat tier access checks for Inner Circle and Core using test prices.
10. Test cancellation/update through the Stripe billing portal and confirm member access updates after webhook delivery.

## Launch Route Checklist

Run each route on desktop and mobile widths. Check the logged-out state first, then repeat member routes with active Foundation, Inner Circle, and Core test users where relevant.

| Route | Logged out | Logged in |
| --- | --- | --- |
| `/` | Redirects to `/join-mobile` or `/join-desktop` based on device; no broken visual shell. | Redirects to `/dashboard` for active unsuspended members. |
| `/home` | Homepage loads, member preview and trust proof show no empty testimonial areas. | Public page remains readable; no member-only data leaks. |
| `/join-mobile` | Step-inside path opens route choices; membership and audit links preserve invite/from context. | Sign-in mode and billing-cancelled notices remain usable. |
| `/join-desktop` | Step-inside path opens route choices; desktop visual remains scrollable and non-overlapping. | Sign-in mode and billing-cancelled notices remain usable. |
| `/audit` | Audit start, completion, and recommended tier CTA work; result routes to `/membership`. | Same behavior unless user chooses to sign in from the join path. |
| `/membership` | Tier selection, founder allocation copy, member preview, FAQ, and reassurance blocks render. | Active members can start Stripe checkout or open billing portal without tier logic changes. |
| `/login` | Login errors and redirects remain clear. | Successful login returns to requested route or dashboard. |
| `/dashboard` | Redirects to login/membership according to auth and billing state. | First-entry checklist, billing notices, profile progress, discussions, resources, and quick actions render. |
| `/profile` | Redirects to login. | Profile save, BCN Rules acceptance, and accent theme selection persist. |
| `/blueprint` | Redirects to login. | Inner Circle/Core voting works; Foundation sees the existing gated message. |
| `/directory` | Redirects to login. | Directory cards and filters load on desktop and mobile. |
| `/inner-circle` | Redirects to login or membership according to existing permissions. | Inner Circle/Core access works; Foundation sees existing upgrade path. |
| `/core` | Redirects to login or membership according to existing permissions. | Core access works; lower tiers see existing upgrade path. |
| `/member/growth-architect` | Redirects to login. | Member Growth Architect route loads; service cards preserve member request flow. |

## Flow Checklist

1. Checkout handoff: select each membership tier and interval, continue through account setup if logged out, and confirm Stripe opens with the expected tier and billing interval.
2. Profile save: update rules acceptance, accent theme, profile basics, business details, and a profile image URL/upload in a non-production account.
3. Blueprint voting: vote Support, High Priority, Not Needed, and Needs Discussion as an eligible member; confirm counts update and Foundation remains gated.
4. Dashboard onboarding: use a newly paid test member and confirm checklist items update for accepted rules, profile completion, accent theme selection, resource read, first discussion, and Blueprint vote.
5. Founder service request: open `/member/growth-architect`, start a request, submit application/checkout services, and confirm the success or Stripe path remains connected to the member experience.
6. Public proof: confirm homepage proof areas show either real admin proof content or safe static placeholders, never empty testimonial slots.

## Member Accent Theme Regression

1. Sign in as an active member and open `/profile`.
2. Confirm the accent theme picker appears under BCN Rules Acceptance.
3. Verify Royal Blue, Emerald, Amber Gold, Crimson, and Violet can be selected.
4. Verify the profile page live-previews the selected accent and optional Workspace Atmosphere.
5. Save, refresh, and confirm the saved theme and atmosphere state persist.
6. Confirm public routes do not include member accent data attributes or any light/dark toggle.
