# Deployment Runbook

This runbook is the production checklist for deploying The Business Circle Network.

## 1) Production prerequisites

- Domain configured (example: `thebusinesscircle.net`) with DNS pointing to your server/load balancer.
- SSL/TLS enabled (proxy, CDN, or ingress).
- PostgreSQL connectivity confirmed from the app process.
- Shared Redis configured for production rate limiting (Upstash Redis recommended).
- Stripe products/prices created for:
  - Standard (`£30/month`)
  - Inner Circle (`£79/month`)
- Resend domain configured and verified.
- Ably API key created (if realtime chat is enabled).

## 2) Environment variable checklist

Use a production environment (systemd, PM2, or host-level env manager) and set:

### Core app

- `APP_URL=https://thebusinesscircle.net`
- `NEXTAUTH_URL=https://thebusinesscircle.net`
- `AUTH_SECRET=<64+ char random secret>`
- `NEXTAUTH_SECRET=<64+ char random secret>`

### Database

- `DATABASE_URL=postgresql://...` (production DB)
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

### Auth

- `AUTH_MAGIC_LINK_ENABLED=false` (or true if enabled intentionally)
- `AUTH_BCRYPT_ROUNDS=12` (or higher with acceptable CPU cost)
- `PASSWORD_RESET_TOKEN_TTL_MINUTES=60`

### Shared rate limiting

- `UPSTASH_REDIS_REST_URL=https://...`
- `UPSTASH_REDIS_REST_TOKEN=...`
- Or provider-compatible aliases:
  - `KV_REST_API_URL=https://...`
  - `KV_REST_API_TOKEN=...`
- Optional:
  - `RATE_LIMIT_REDIS_PREFIX=ratelimit:business-circle`

### Billing (Stripe)

- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `STRIPE_STANDARD_PRICE_ID=price_...`
- `STRIPE_INNER_CIRCLE_PRICE_ID=price_...`

### Email (Resend)

- `RESEND_API_KEY=re_...`
- `RESEND_FROM_EMAIL=The Business Circle Network <noreply@thebcnet.co.uk>`
- `CONTACT_NOTIFY_EMAIL=contact@thebcnet.co.uk`

### Community realtime (optional but recommended)

- `ABLY_API_KEY=...`
- `ABLY_CHANNEL_PREFIX=community`
- `NEXT_PUBLIC_COMMUNITY_REALTIME_ENABLED=true`
- `NEXT_PUBLIC_ABLY_CHANNEL_PREFIX=community`

### Internal calling stack

- `LIVEKIT_URL=wss://rtc.your-domain`
- `LIVEKIT_SERVER_URL=http://livekit:7880` (or an internal/private host if LiveKit moves to another VPS)
- `LIVEKIT_API_KEY=...`
- `LIVEKIT_API_SECRET=...`
- `LIVEKIT_TCP_PORT=7881`
- `LIVEKIT_RTC_PORT_START=40000`
- `LIVEKIT_RTC_PORT_END=40100`
- `LIVEKIT_USE_EXTERNAL_IP=true` (recommended on most cloud VMs)
- `TURN_DOMAIN=turn.your-domain`
- `TURN_REALM=turn.your-domain`
- `TURN_SHARED_SECRET=<random secret for TURN REST auth>`
- `TURN_UDP_PORT=3478`
- `TURN_TLS_ENABLED=true`
- `TURN_TLS_PORT=5349`
- `TURN_TLS_CERTS_DIR=./.secrets/coturn`
- `TURN_TLS_CERT_FILE=/etc/coturn/certs/fullchain.pem`
- `TURN_TLS_KEY_FILE=/etc/coturn/certs/privkey.pem`
- `TURN_MIN_PORT=41000`
- `TURN_MAX_PORT=41040`
- Optional:
  - `TURN_TLS_CA_FILE=/etc/coturn/certs/chain.pem`
  - `TURN_TLS_CIPHER_LIST=DEFAULT:@SECLEVEL=2`
  - `TURN_TTL_SECONDS=3600`

### Resource media uploads (Cloudinary)

- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`
- `CLOUDINARY_RESOURCE_FOLDER=business-circle/resources`
- `CLOUDINARY_PROFILE_FOLDER=business-circle/profiles`

## 3) Deploy on VPS (no Docker)

From project root on the server:

```bash
npm ci
npx prisma generate
npm run db:migrate:prod
npm run build
npm run start
```

Recommended: run `npm run env:validate:production` locally (it requires dev dependencies).

Before the first deploy, place your TURN certificate files at `.secrets/coturn/fullchain.pem` and `.secrets/coturn/privkey.pem` on the server (or adjust the `TURN_TLS_*` paths if you use a different location).

## 4) Run database migrations (required)

```bash
npm run db:migrate:prod
```

Optional seed for initial environments only:

```bash
npm run db:seed
```

## 5) Stripe webhook setup

In Stripe Dashboard:

1. Create endpoint: `https://thebusinesscircle.net/api/stripe/webhook`
2. Subscribe to events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `charge.refunded`
3. Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

This single webhook endpoint handles both membership billing updates and founder-service payment updates.

You can also create or update the endpoint from the repo with:

```bash
npm run stripe:webhook:upsert -- --url https://thebusinesscircle.net
```

Verify endpoint delivery in Stripe logs after first test payment.

## 6) Production database migration strategy

Use this process for every schema change:

1. Create migration locally:
   - `npx prisma migrate dev --name <change_name>`
2. Commit migration files under `prisma/migrations`.
3. Deploy app image.
4. Run `npx prisma migrate deploy` in production.
5. Verify app health and key flows.

Rules:

- Do not use `prisma db push` in production.
- Always apply migrations before validating web flows.
- Take a DB backup/snapshot before major schema changes.

## 7) Post-deploy smoke test

- Public pages load (`/`, `/about`, `/membership`, `/contact`).
- Authentication works (`/login`, password reset flow).
- Member dashboard, resources, and community work.
- `/join` still preserves tier selection, invite handling, and checkout redirects.
- `/calls` loads for paid members and direct-call buttons appear on eligible member surfaces.
- `/admin/calling` loads with realtime overview, request review, permissions, schedules, and audit data.
- Admin pages load (`/admin`, `/admin/resources`, `/admin/community`).
- `/admin/security` and `/admin/system-health` show `Shared Redis` for rate limiting.
- Stripe checkout + portal redirect correctly.
- Contact form sends to `contact@thebcnet.co.uk`.

## 8) Calling network and firewall notes

- Open `3000/tcp` for the Next.js app (or your reverse-proxied web port).
- Open `7880/tcp` only if clients connect directly to LiveKit there; otherwise front it with TLS and expose only the public realtime endpoint.
- Open `7881/tcp` for LiveKit WebRTC over TCP.
- Open `40000-40100/udp` for LiveKit RTP/RTCP media on this controlled v1 deployment.
- Open `3478/udp` and `3478/tcp` for coturn.
- Open `5349/tcp` for TURN/TLS.
- Open `41000-41040/udp` for coturn relay traffic.
- If you later terminate TURN/TLS on `443/tcp` instead, update `TURN_TLS_PORT` and the firewall rules to match.

See [calling-infrastructure.md](./calling-infrastructure.md) for the split-host upgrade path and realtime deployment notes.

## 9) Rollback

If deploy fails:

1. Roll back to previous image/tag.
2. Restore previous env file if variables changed.
3. If migration caused issues, restore DB backup.
4. Restart the app process (systemd/PM2) after rollback.

## Docker (local/dev only)

If you prefer Docker for local development, use:

```bash
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```
