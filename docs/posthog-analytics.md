# PostHog Analytics

BCN initializes PostHog in `src/components/analytics/posthog-provider.tsx` after the visitor grants analytics cookie consent.

## Environment

- `NEXT_PUBLIC_POSTHOG_KEY=phc_...`
- `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`
- `NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE=0`
- `NEXT_PUBLIC_POSTHOG_DEBUG=false`

Use `NEXT_PUBLIC_POSTHOG_DEBUG=true` only in development or a short staging check.

## Verification

1. Accept analytics cookies.
2. Open DevTools Network and filter for `eu.i.posthog.com`.
3. Navigate between `/`, `/home`, `/join-mobile`, `/join-desktop`, `/membership`, `/audit`, `/login`, `/sign-up`, and `/dashboard`.
4. Confirm `$pageview` appears in PostHog Live Events with `route_area`.
5. Trigger one custom event, such as starting checkout or completing the audit, and confirm the named event appears in Live Events.
6. Confirm that no Session Replay is created. The application hard-disables replay even if a stale environment sets a non-zero sample rate.

## Privacy Notes

DOM click/submit autocapture, session replay, browser console capture, browser exception autocapture, performance capture, heatmaps, dead-click capture, feature-flag requests and remote extension loading are explicitly disabled for the payment-safety release. Anchor attributes, hidden form fields, current URLs and nested third-party payloads can contain reset, invitation or return-path credentials that ordinary input/query masks do not reliably cover. Initial referrer/current-location persistence is disabled, and the capture sanitizer recursively covers ordinary properties plus `$set` and `$set_once` person updates. Keep the environment sample rate at `0`; changing it or PostHog project remote config does not override the application safety lock.

Pageview and custom-event destinations pass through the shared analytics location sanitizer. Keep private values out of event properties at the call site as well as at the persistence/capture boundary.

Server-side events are prepared in `src/server/analytics/posthog.ts`. Wire them into Stripe or onboarding flows only when the event is idempotent and does not include email, Stripe object IDs, payment details, or private member content.
