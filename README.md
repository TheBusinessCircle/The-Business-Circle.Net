# The Business Circle Network

Production-ready full-stack platform built with Next.js App Router, TypeScript, Tailwind, Prisma/PostgreSQL, Auth.js, Stripe, Zod, React Hook Form, and shadcn-style UI components.

## What is included

- Premium public marketing website (`/`, `/about`, `/membership`, `/join`, `/contact`)
- Authenticated member platform (`/dashboard`, `/dashboard/resources`, `/directory`, `/community`, `/profile`)
- Block-based resource CMS with draft/publish workflow and Cloudinary image uploads
- Discord-style community channels with tier-based chat access, realtime transport, and threaded replies
- Inner Circle premium channels and premium resources
- Event system with tier visibility
- Password reset flow (`/forgot-password`, `/reset-password`)
- Email verification flow (`/api/auth/verify-email`) with verified-email gating on community/directory
- Admin community moderation view (`/admin/community`) for message removal
- Transactional email wiring for welcome, verification, and billing receipt notifications
- Full admin backend (`/admin`) for:
  - metrics dashboard
  - site content pages (`/admin/site-content`)
  - resource management (`/admin/resources`)
  - channel management (`/admin/channels`)
  - community moderation (`/admin/community`)
  - event management (`/admin/events`)
  - member/subscription management (`/admin/members`)
- Stripe subscription integration (checkout + portal + webhook sync)

## Tech stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Auth.js / NextAuth
- Stripe
- Zod
- React Hook Form
- shadcn-style reusable UI components

## Project structure

```text
.
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ src/
│  ├─ app/
│  │  ├─ (public)/
│  │  │  ├─ page.tsx
│  │  │  ├─ about/page.tsx
│  │  │  ├─ membership/page.tsx
│  │  │  └─ contact/page.tsx
│  │  ├─ (auth)/
│  │  │  ├─ login/page.tsx
│  │  │  ├─ join/page.tsx
│  │  │  ├─ forgot-password/page.tsx
│  │  │  └─ reset-password/page.tsx
│  │  ├─ (member)/
│  │  │  ├─ dashboard/page.tsx
│  │  │  ├─ dashboard/resources/page.tsx
│  │  │  ├─ dashboard/resources/[slug]/page.tsx
│  │  │  ├─ directory/page.tsx
│  │  │  ├─ community/page.tsx
│  │  │  ├─ events/page.tsx
│  │  │  ├─ profile/page.tsx
│  │  │  └─ inner-circle/page.tsx
│  │  ├─ (admin)/admin/
│  │  │  ├─ page.tsx
│  │  │  ├─ site-content/page.tsx
│  │  │  ├─ resources/page.tsx
│  │  │  ├─ resources/[id]/page.tsx
│  │  │  ├─ resources/new/page.tsx
│  │  │  ├─ channels/page.tsx
│  │  │  ├─ community/page.tsx
│  │  │  ├─ events/page.tsx
│  │  │  └─ members/page.tsx
│  │  └─ api/
│  │     ├─ auth/[...nextauth]/route.ts
│  │     ├─ auth/verify-email/route.ts
│  │     ├─ register/route.ts
│  │     ├─ contact/route.ts
│  │     ├─ profile/route.ts
│  │     ├─ channels/[slug]/messages/route.ts
│  │     ├─ community/realtime/token/route.ts
│  │     └─ stripe/
│  │        ├─ checkout/route.ts
│  │        ├─ portal/route.ts
│  │        └─ webhook/route.ts
│  ├─ auth.ts
│  ├─ components/
│  └─ lib/
├─ middleware.ts
└─ .env.example
```

## Database architecture

Prisma models:

- `User`
- `Profile`
- `Business`
- `Resource`
- `ResourceBlock`
- `Category`
- `Channel`
- `Message`
- `Event`
- `Subscription`
- `SiteContent`
- Auth.js adapter models (`Account`, `Session`, `VerificationToken`)

## Access model

- Public: marketing pages only
- Foundation Member: dashboard, Foundation resources, directory, standard channels, standard events
- Inner Circle: all standard features + premium resources/channels/events
- Admin: full admin backend and all member access

Route guards are enforced by `middleware.ts` and server-side checks in admin actions/APIs.

## Docker setup (recommended)

1. Copy environment file:
   ```powershell
   Copy-Item .env.example .env
   ```
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set real secrets:
   - `NEXTAUTH_SECRET`
   - `AUTH_SECRET`
   - Stripe keys if billing is enabled
3. Start the full stack:
   ```bash
   docker compose up -d --build
   ```
4. Confirm containers are healthy:
   ```bash
   docker compose ps
   ```
5. Run Prisma migrations:
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```
6. Seed baseline data:
   ```bash
   docker compose exec app npm run db:seed
   ```
7. Open the app:
   - `http://localhost:3000`
8. Tail logs:
   ```bash
   docker compose logs -f app
   ```
9. Stop the stack:
   ```bash
   docker compose down
   ```

Notes:
- Default `docker compose up` now runs the app in production mode (`npm run start`).
- Prisma Client is generated during Docker image build.
- PostgreSQL data persists in Docker volume `postgres_data`.
- If your machine uses the legacy binary, replace `docker compose` with `docker-compose`.

Development mode with live reload (optional):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f app
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

## Production deployment

Use the full runbook for production deploys:

- [docs/deployment-runbook.md](docs/deployment-runbook.md)

## GitHub publishing

If you want to publish this project with GitHub Desktop first, use:

- [docs/github-desktop-publish.md](docs/github-desktop-publish.md)

Important:

- GitHub is the source-control layer for this project
- the running app still needs a real deployment host, database, and environment variables
- use the deployment runbook for the live environment

Quick production commands:

```bash
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production exec app npx prisma migrate deploy
docker compose --env-file .env.production logs -f app
```

The runbook includes:

- full production env var checklist
- Stripe webhook endpoint setup
- migration strategy (`migrate deploy` workflow)
- post-deploy smoke test and rollback steps

## Docker helper scripts

```bash
npm run docker:up
npm run docker:up:dev
npm run docker:generate
npm run docker:migrate
npm run docker:seed
npm run docker:logs
npm run docker:logs:dev
npm run docker:down
npm run docker:down:dev
```

## Full reset (clean database)

```bash
docker compose down -v
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

## Local setup (without Docker)

1. Install Node.js 20+ and npm.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy env file:
   ```bash
   cp .env.example .env
   ```
4. Ensure PostgreSQL is running locally and `DATABASE_URL` is correct.
5. Run migrations + seed:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
6. Start app:
   ```bash
   npm run dev
   ```

## Testing

- Run unit tests:
  - `npm run test`
- Watch mode:
  - `npm run test:watch`
- Included baseline tests:
  - subscription service status/tier/webhook dispatch logic
  - password reset token hashing and replay prevention
  - auth permission policy helpers

## Email setup (Resend)

1. Add these values in `.env`:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` (for example `The Business Circle Network <noreply@thebcnet.co.uk>`)
   - `CONTACT_NOTIFY_EMAIL` (where contact form notifications should go)
2. Send a direct test email:
   ```bash
   npm run email:test -- delivered@resend.dev
   ```
3. If running in Docker:
   ```bash
   docker compose exec app npm run email:test -- delivered@resend.dev
   ```
4. Contact form emails are now enabled:
   - Admin notification is sent to `CONTACT_NOTIFY_EMAIL` (fallback `ADMIN_EMAIL`)
   - Auto-reply is sent to the submitter

## Password reset flow

- User-facing pages:
  - `/forgot-password`
  - `/reset-password`
- API routes:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- Configuration:
  - `PASSWORD_RESET_TOKEN_TTL_MINUTES` (default `60`, bounded to `15-180`)
- Notes:
  - Reset requests are rate-limited and origin-checked.
  - Responses are account-enumeration safe (same success message for existing/non-existing emails).
  - Tokens are stored hashed in the database and invalidated after use.

## Stripe setup

- Configure products/prices in Stripe dashboard:
  - Standard £30/month
  - Inner Circle £79/month
- Put price IDs in `.env`:
  - `STRIPE_STANDARD_PRICE_ID`
  - `STRIPE_INNER_CIRCLE_PRICE_ID`
- Register webhook endpoint:
  - `POST /api/stripe/webhook`
- Subscribe to events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

## Security and scalability notes

- Passwords are hashed with `bcryptjs`.
- Tier/role checks are enforced server-side for APIs and pages.
- Stripe webhook is signature-verified.
- Prisma relations and indexes support growth in resource/chat/event data.
- Architecture is modular (`lib`, `components`, grouped routes) for future extraction into service layers.

## Dependency stability policy

Auth.js and Prisma critical packages are pinned to exact versions to reduce breaking changes from automatic updates.

- Upgrade workflow and monitoring guidance:
  - [docs/dependency-upgrade-policy.md](docs/dependency-upgrade-policy.md)
- Weekly version check command:
  - `npm run deps:check:critical`
