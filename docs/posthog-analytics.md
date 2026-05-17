# PostHog Analytics

BCN initializes PostHog in `src/components/analytics/posthog-provider.tsx` after the visitor grants analytics cookie consent.

## Environment

- `NEXT_PUBLIC_POSTHOG_KEY=phc_...`
- `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`
- `NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE=0.25`
- `NEXT_PUBLIC_POSTHOG_DEBUG=false`

Use `NEXT_PUBLIC_POSTHOG_DEBUG=true` only in development or a short staging check.

## Verification

1. Accept analytics cookies.
2. Open DevTools Network and filter for `eu.i.posthog.com`.
3. Navigate between `/`, `/home`, `/join-mobile`, `/join-desktop`, `/membership`, `/audit`, `/login`, `/sign-up`, and `/dashboard`.
4. Confirm `$pageview` appears in PostHog Live Events with `route_area`.
5. Trigger one custom event, such as starting checkout or completing the audit, and confirm the named event appears in Live Events.
6. For replay, use a staging session with `NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE=1`, then confirm a recording appears in Session Replay.

## Privacy Notes

Inputs are masked, sensitive URL parameters are redacted, and text inside `[data-member-sensitive]`, `[data-sensitive]`, `.ph-mask`, or `[data-posthog-mask]` is masked in replay. Use those attributes/classes for new private member, billing, auth, or admin surfaces.

Server-side events are prepared in `src/server/analytics/posthog.ts`. Wire them into Stripe or onboarding flows only when the event is idempotent and does not include email, Stripe object IDs, payment details, or private member content.
