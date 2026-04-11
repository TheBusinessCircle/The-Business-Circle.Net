# Calling Infrastructure

This repository keeps the new calling stack separate from the existing Ably-powered community realtime system.

## Components

- Next.js app: auth, room creation, permission checks, room pages, admin controls, and server-side token issuance.
- LiveKit: self-hosted SFU for browser media routing.
- coturn: separate STUN/TURN relay for difficult network paths and future split-host deployments.
- PostgreSQL via Prisma: room, participant, host permission, schedule, request, audit, and config state.
- Redis: LiveKit coordination for the current single-node deployment and a clean upgrade path later.

## Environment model

- `LIVEKIT_URL` is the browser-facing websocket/HTTPS endpoint.
- `LIVEKIT_SERVER_URL` is the server-to-server endpoint used by the app for room management. Keep this on a private network address when LiveKit moves off the main app VPS.
- `TURN_DOMAIN`, `TURN_REALM`, and `TURN_SHARED_SECRET` are used to mint TURN REST credentials per user on demand.
- `TURN_TTL_SECONDS` controls how long a TURN credential remains valid after it is issued.

## Current v1 topology

- App, Postgres, Redis, LiveKit, and coturn can run on the same VPS for launch.
- Founder and admin rooms retain higher room caps through server-enforced policy rather than infrastructure-level priority queues.
- Member-hosted group rooms remain permission-based and can be disabled globally without touching the media services.
- Ably community messaging stays untouched and continues to operate independently.

## TLS and public routing

- Production should expose the app behind HTTPS as usual.
- `LIVEKIT_URL` should be a public `wss://` endpoint such as `wss://rtc.thebusinesscircle.net`.
- `TURN_DOMAIN` should resolve publicly, for example `turn.thebusinesscircle.net`.
- This repo keeps coturn in secure shared-secret mode and now supports TURN/TLS directly through `TURN_TLS_ENABLED`, `TURN_TLS_PORT`, and the `TURN_TLS_*` certificate path variables.
- The default Docker deployment expects certificate files at `.secrets/coturn/fullchain.pem` and `.secrets/coturn/privkey.pem` on the server, mounted into coturn as `/etc/coturn/certs/...`.
- If you terminate TURN/TLS on `443/tcp` instead of `5349/tcp`, update `TURN_TLS_PORT` and the firewall rules to match.

## Future split-host upgrade

- Move LiveKit and coturn to a dedicated realtime VPS first.
- Keep the app on the main VPS and change `LIVEKIT_SERVER_URL` to the new internal/private address.
- Keep `LIVEKIT_URL` and `TURN_DOMAIN` pointed at the public realtime host.
- Redis can remain on the realtime host with LiveKit or move to a managed/private Redis service if multi-node scaling is needed.
- Increase the LiveKit RTP range and coturn relay range only after measuring active usage; the current narrowed `40000-40100` and `41000-41040` defaults are intentional for a guarded launch.

## Operational notes

- The app never exposes LiveKit secrets or TURN shared secrets to the browser.
- LiveKit join tokens are issued only after auth, tier, room, cap, and schedule checks pass.
- TURN credentials are generated server-side per user and expire automatically.
- Scheduled rooms and audit data stay in PostgreSQL, which means admins can review room history even after media rooms close.
