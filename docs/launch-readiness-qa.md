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

## Member Accent Theme Regression

1. Sign in as an active member and open `/profile`.
2. Confirm the accent theme picker appears under BCN Rules Acceptance.
3. Verify Royal Blue, Emerald, Amber Gold, Crimson, and Violet can be selected.
4. Verify the profile page live-previews the selected accent and optional Workspace Atmosphere.
5. Save, refresh, and confirm the saved theme and atmosphere state persist.
6. Confirm public routes do not include member accent data attributes or any light/dark toggle.
