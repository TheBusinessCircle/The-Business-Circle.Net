# The Business Circle Network

Production-ready full-stack platform for The Business Circle Network: a founder-led business brand built around a controlled member environment and a growing ecosystem for serious business owners.

The product is designed to feel structured from the first screen. Public pages clarify the room, the join flow leads into secure paid entry, and the member experience stays focused on useful discussion, stronger context, and steady business progress rather than noise.

## Positioning

The platform operates across three layers:

1. `Network` is the brand identity.
2. `Environment` is what members actually enter.
3. `Ecosystem` is what grows from the right people being inside it.

That order matters throughout the product:

- `Environment` first
- `Ecosystem` second
- `Network` as identity

## What is included

- Premium public website for positioning, founder context, membership guidance, join, contact, and FAQ
- Secure join flow with payment-first activation for paid memberships
- Authenticated member environment across dashboard, resources, directory, community, events, and profile areas
- Tier progression across Foundation, Inner Circle, and Core
- Structured discussion rooms with tier-based access, threaded replies, and realtime transport
- Resource CMS with draft and publish workflow plus Cloudinary uploads
- Events with tier visibility and member-only access
- Founder pricing, annual billing, Stripe Checkout, billing portal access, and webhook sync
- Email verification gating where required for higher-trust member areas
- Full admin backend for content, rooms, events, moderation, members, and subscription visibility

## Access model

- Public: brand, positioning, founder context, insights, contact, FAQ, and membership guidance
- Foundation: the core member environment with resources, events, directory visibility, and wider discussion rooms
- Inner Circle: a tighter layer inside the ecosystem with stronger context, deeper rooms, and more selective access
- Core: the highest-level protected room for operators carrying heavier decisions and wanting a calmer, more serious environment
- Admin: full operational control across site content, members, billing visibility, moderation, and platform management

Route protection is enforced in `middleware.ts` and backed up by server-side checks in actions, loaders, and APIs.

## Membership and billing

Standard pricing currently maps to:

- Foundation: `GBP30/month` or `GBP288/year`
- Inner Circle: `GBP79/month` or `GBP756/year`
- Core: `GBP149/month` or `GBP1428/year`

Founder pricing is supported per tier:

- Foundation founder: `GBP15/month` or `GBP144/year`
- Inner Circle founder: `GBP39/month` or `GBP372/year`
- Core founder: `GBP74/month` or `GBP708/year`

Paid membership access is granted only after trusted server-side Stripe confirmation. A user does not receive live paid-member access from the initial account form alone.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Auth.js / NextAuth
- Stripe
- Zod
- React Hook Form
- Reusable shadcn-style UI components

## Project structure

```text
.
|-- prisma/
|   |-- schema.prisma
|   `-- seed.ts
|-- src/
|   |-- app/
|   |   |-- (public)/
|   |   |-- (auth)/
|   |   |-- (member)/
|   |   |-- (admin)/admin/
|   |   `-- api/
|   |-- auth.ts
|   |-- components/
|   |-- config/
|   |-- lib/
|   |-- server/
|   `-- types/
|-- middleware.ts
`-- .env.example
```

## Stripe setup

Add Stripe price IDs in `.env` for standard, annual, and founder variants:

- `STRIPE_FOUNDATION_MONTHLY_PRICE_ID`
- `STRIPE_FOUNDATION_ANNUAL_PRICE_ID`
- `STRIPE_INNER_CIRCLE_MONTHLY_PRICE_ID`
- `STRIPE_INNER_CIRCLE_ANNUAL_PRICE_ID`
- `STRIPE_CORE_MONTHLY_PRICE_ID`
- `STRIPE_CORE_ANNUAL_PRICE_ID`
- `STRIPE_FOUNDING_FOUNDATION_MONTHLY_PRICE_ID`
- `STRIPE_FOUNDING_FOUNDATION_ANNUAL_PRICE_ID`
- `STRIPE_FOUNDING_INNER_CIRCLE_MONTHLY_PRICE_ID`
- `STRIPE_FOUNDING_INNER_CIRCLE_ANNUAL_PRICE_ID`
- `STRIPE_FOUNDING_CORE_MONTHLY_PRICE_ID`
- `STRIPE_FOUNDING_CORE_ANNUAL_PRICE_ID`

Register the webhook endpoint:

- `POST /api/stripe/webhook`

Subscribe Stripe to these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

The checkout and webhook flow is designed to stay idempotent and to keep paid access tied to trusted Stripe state.

## Local setup

### Without Docker

1. Install Node.js 20+ and npm.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

4. Ensure PostgreSQL is running and `DATABASE_URL` is correct.
5. Run migrations and seed data:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. Start the app:

   ```bash
   npm run dev
   ```

### With Docker

1. Copy environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   ```bash
   cp .env.example .env
   ```

2. Set real secrets in `.env`, including:
   - `NEXTAUTH_SECRET`
   - `AUTH_SECRET`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - Stripe keys if billing is enabled
3. Start the stack:

   ```bash
   docker compose up -d --build
   ```

4. Run migrations:

   ```bash
   docker compose exec app npx prisma migrate deploy
   ```

5. Seed baseline data:

   ```bash
   docker compose exec app npm run db:seed
   ```

6. Open the app at `http://localhost:3000`.

Development mode with live reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f app
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

## Production deployment

For a VPS deployment without Docker:

```bash
npm ci
npx prisma generate
npm run db:migrate:prod
npm run build
npm run start
```

Use the full production runbook:

- [docs/deployment-runbook.md](docs/deployment-runbook.md)

The runbook covers:

- production environment variable checklist
- shared Redis rate-limiting setup
- Stripe webhook endpoint setup
- migration strategy with `migrate deploy`
- post-deploy smoke testing and rollback guidance

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

## Testing

- Run the full test suite with `npm run test`
- Run watch mode with `npm run test:watch`

Current baseline coverage includes:

- subscription service status, tier, webhook, and provisioning logic
- password reset token hashing and replay prevention
- auth permission and membership access helpers

## Email setup

Using Resend:

1. Add these values in `.env`:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `CONTACT_NOTIFY_EMAIL`
2. Send a direct test email:

   ```bash
   npm run email:test -- delivered@resend.dev
   ```

3. If running in Docker:

   ```bash
   docker compose exec app npm run email:test -- delivered@resend.dev
   ```

## Security and resilience notes

- Passwords are hashed with `bcryptjs`
- Role and tier checks are enforced server-side for pages and APIs
- Stripe webhook requests are signature-verified
- Paid access is granted from trusted Stripe confirmation, not client-side assumptions
- Rate limiting supports shared Redis via Upstash or compatible KV aliases
- Prisma relations and indexes are structured for growth in resources, events, discussions, and members
- Application logic is organised across `lib`, `server`, `components`, and grouped routes to keep the codebase maintainable as the ecosystem expands

## Dependency stability policy

Auth.js and Prisma critical packages are pinned to exact versions to reduce breaking changes from automatic updates.

- Upgrade workflow and monitoring guidance: [docs/dependency-upgrade-policy.md](docs/dependency-upgrade-policy.md)
- Weekly version check command: `npm run deps:check:critical`
