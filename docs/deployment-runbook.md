# Deployment Runbook

This runbook is the production checklist for deploying The Business Circle Network.

## 1) Production prerequisites

- Domain configured (example: `thebcnet.co.uk`) with DNS pointing to your server/load balancer.
- SSL/TLS enabled (proxy, CDN, or ingress).
- Docker + Docker Compose installed on the host.
- PostgreSQL connectivity confirmed from the app container.
- Stripe products/prices created for:
  - Standard (`£30/month`)
  - Inner Circle (`£79/month`)
- Resend domain configured and verified.
- Ably API key created (if realtime chat is enabled).

## 2) Environment variable checklist

Use a production env file (example: `.env.production`) and set:

### Core app

- `APP_URL=https://thebcnet.co.uk`
- `NEXTAUTH_URL=https://thebcnet.co.uk`
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

### Resource media uploads (Cloudinary)

- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`
- `CLOUDINARY_RESOURCE_FOLDER=business-circle/resources`

## 3) Deploy with Docker Compose

From project root on the server:

```bash
docker compose --env-file .env.production up -d --build
```

Confirm services:

```bash
docker compose ps
docker compose logs -f app
```

## 4) Run database migrations (required)

```bash
docker compose --env-file .env.production exec app npx prisma migrate deploy
```

Optional seed for initial environments only:

```bash
docker compose --env-file .env.production exec app npm run db:seed
```

## 5) Stripe webhook setup

In Stripe Dashboard:

1. Create endpoint: `https://thebcnet.co.uk/api/stripe/webhook`
2. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
3. Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

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
- Admin pages load (`/admin`, `/admin/resources`, `/admin/community`).
- Stripe checkout + portal redirect correctly.
- Contact form sends to `contact@thebcnet.co.uk`.

## 8) Rollback

If deploy fails:

1. Roll back to previous image/tag.
2. Restore previous env file if variables changed.
3. If migration caused issues, restore DB backup.
4. Restart stack:
   - `docker compose --env-file .env.production up -d`
