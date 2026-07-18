# Circle Card dual-runtime deployment preparation

This runbook prepares one immutable release and one compilation for two independent Next.js
processes. The compiled `.next` output is copied byte-for-byte to two process-owned runtime
directories before either process starts. It is documentation only: do not apply it without an
approved production change window.

## Architecture and ownership

- `thebusinesscircle.net` is the BCN runtime and remains the sole public owner of the shared
  Stripe webhook, inbound Resend webhook, cron routes and internal automation routes.
- `circlecard.co.uk` is the Circle Card web runtime. It serves Circle Card pages, authentication,
  shared-user access, reconciliation and explicitly authorised Circle Card APIs.
- Both processes use the same PostgreSQL database, Auth.js secret and Stripe account later.
- Auth.js cookies have no `Domain`, so identical cookie names remain isolated by browser host.
- No startup scheduler or queue consumer was found. Background work is invoked through
  authenticated HTTP routes. Circle Card rejects those routes, so `PROCESS_ROLE` is unnecessary
  today. Make a process-role control mandatory before adding startup work later.
- The webhook URL remains `https://thebusinesscircle.net/api/stripe/webhook`.

## Same-build and cache conclusion

`APP_BRAND` is read by server runtime functions, middleware and dynamic layouts. It is not exposed
through a `NEXT_PUBLIC_*` setting or browser storage. Homepage, auth/member layouts, manifest,
sitemap and robots output resolve identity at runtime. Module-level constants are process-local.

Next.js writes ISR, fetch and image-optimisation caches beneath its configured distribution
directory. Two live processes must never share the same physical `.next` tree. Build once into
`.next`, copy that completed artifact to `.runtime/bcn` and `.runtime/circle-card`, and set
`NEXT_RUNTIME_DIST_DIR` per process. The source `.next` is never served. Both copies retain the
same `BUILD_ID`, while runtime cache and revalidation writes remain isolated. Never build or recopy
inside a release being read by a live process.

## Environment matrix

Never put values in this document, PM2 configuration or Git. Load them from protected per-process
files or the approved secret manager.

| Setting/group | BCN process | Circle Card process | Reason |
| --- | --- | --- | --- |
| `APP_BRAND` | `bcn` | `circle-card` | Trusted runtime selector |
| `APP_URL`, `AUTH_URL`, `NEXTAUTH_URL` | BCN HTTPS origin | Circle HTTPS origin | Host-bound links/Auth.js |
| `NEXT_RUNTIME_DIST_DIR` | `.runtime/bcn` | `.runtime/circle-card` | Isolated Next runtime cache |
| `DATABASE_URL` | Required, shared | Required, shared | One User/Card data model |
| Host/seed safeguards (`POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, `SEED_MODE`) | Existing validator requirement | Not required | Not read by Circle web runtime |
| `AUTH_SECRET`, `NEXTAUTH_SECRET` | Required, shared values | Required, same values | Same credentials; host cookies |
| Redis/KV rate-limit settings | Required, shared | Required, shared | Cross-process abuse controls |
| Circle Stripe secret/product/price/Portal config | Required | Required | Webhook vs Checkout/Portal/reconcile |
| `STRIPE_WEBHOOK_SECRET` | Required | Explicitly blank | BCN owns webhook |
| BCN membership Stripe price IDs | Required | Explicitly blank | Circle denies purchase journey |
| Billing enable/access mode/operator IDs | Existing controlled values | Same controls | Never public during this launch |
| BCN Resend key/identity | Required | Explicitly blank | BCN email only |
| Circle Resend key/identity | Required | Required | BCN lifecycle jobs; Circle auth |
| Resend inbound secret/forward address | Required | Explicitly blank | BCN-owned inbound webhook |
| Cron/automation secrets and sources | Required where applicable | Explicitly blank/disabled | BCN-owned jobs |
| Cloudinary/media settings | Required where used | Required where Circle uploads | Shared durable assets |
| PostHog public settings | Shared build values | Same build values | Build-time public configuration |
| LiveKit/TURN settings | Existing BCN requirements | Explicitly blank | Calls denied on Circle |

The production validator requires both email identities for BCN and only Circle Card identity for
Circle. The BCN owner also requires webhook/inbound and cron protection. Explicit email brand—not
`APP_BRAND`—chooses the API key. Both processes use shared database/auth, one shared Redis/KV pair,
and media configuration required by reachable features. No `NEXT_PUBLIC_*` setting selects brand.

## Hermetic local smoke harness

The harness stages only Git-tracked files under `.sandbox/dual-runtime-smoke`, excludes every
`.env*`, Git data and existing builds, and never enumerates/copies arbitrary untracked files. It
inherits only an explicit OS variable allowlist. It requires an explicitly local development
PostgreSQL URL because Next page-data collection imports database-backed routes.

```powershell
$env:SMOKE_DATABASE_URL = "postgresql://local-user:local-password@127.0.0.1:5432/dual_runtime_smoke"
$env:SMOKE_AUTH_SECRET = "replace-with-a-local-random-value-of-at-least-32-characters"
npm run smoke:dual-runtime:build
npm run smoke:dual-runtime
```

The first command compiles once with BCN and creates two copies with the same `BUILD_ID`. The
second starts them on `127.0.0.1:3100` (BCN) and `127.0.0.1:3200` (Circle), then repeats with the
opposite start order. It uses unmistakable synthetic Stripe/Resend settings, disables billing,
never calls delivery/Checkout endpoints and rejects non-local database hosts.

## PM2 preparation

Use [dual-runtime.ecosystem.example.cjs](../ops/pm2/dual-runtime.ecosystem.example.cjs) only as a
reviewed template. It preserves `the-business-circle-network` and adds `circle-card`, one fork each,
on distinct loopback ports. It does not rely on PM2 `env_file` support or shell expansion. It parses
two absolute protected files using `node:util.parseEnv`; require a reviewed Node version supporting
that API. Launch from a sanitised shell containing only the three paths below and normal OS values.
The Circle process explicitly blanks BCN owner secrets to defeat stale PM2 inheritance.

After one successful offline build:

```bash
test ! -e .runtime
mkdir .runtime
cp -a .next .runtime/bcn
cp -a .next .runtime/circle-card
cmp .next/BUILD_ID .runtime/bcn/BUILD_ID
cmp .next/BUILD_ID .runtime/circle-card/BUILD_ID

export RELEASE_DIR=/srv/the-business-circle/releases/<approved-sha>
export BCN_ENV_FILE=/path/to/protected/bcn-runtime.env
export CIRCLE_CARD_ENV_FILE=/path/to/protected/circle-card-runtime.env
pm2 startOrRestart ops/pm2/dual-runtime.ecosystem.example.cjs --only circle-card --update-env
pm2 logs circle-card --lines 100 --nostream
pm2 startOrRestart ops/pm2/dual-runtime.ecosystem.example.cjs \
  --only the-business-circle-network --update-env
pm2 save
```

The protected files must be outside the Git release and the release must contain no production
environment file. Never dump PM2 environments. Keep direct ports firewalled and accessible only to
local Nginx. Circle Card can be stopped independently.

## Nginx preparation

Review [dual-runtime.conf.example](../ops/nginx/dual-runtime.conf.example). It uses explicit server
names, a rejecting default server and no wildcard proxy. Nginx overwrites, rather than forwards,
the trust-relevant headers:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

The example certificate paths are placeholders. Replace them only after separate DNS/TLS review;
do not run Certbot here. The exact BCN webhook location preserves the raw body, buffers the request,
limits it to 1 MiB, uses 60-second upstream timeouts and never redirects. Circle Nginx denies
webhook, inbound, cron and internal routes before proxying as defence in depth. Page GET/HEAD www
canonicalisation is performed by validated application policy; www APIs/mutations are not redirected.

Next's image optimiser performs headerless in-process subrequests for local images. Middleware
therefore excludes only known public image directories, the public-image handler and root image
files, while the outer `/_next/image` request remains host-validated and blocks BCN-owned sources.
This safe-static exclusion relies on the rejecting Nginx default host and loopback-only ports;
extension-ending application APIs remain inside middleware.

Next itself emits a same-host 308 for repeated-slash/backslash URLs before middleware. This does not
execute the target, and Nginx's default `merge_slashes on` normalises public requests internally so
the Circle ownership policy then returns 404. Verify that behavior with the reviewed Nginx build;
direct application ports must remain loopback-only.

## Smoke-test matrix

| Area | BCN | Circle Card | Verification |
| --- | --- | --- | --- |
| Homepage | Existing `/` | Circle `/` | Harness |
| Product/legal | Legacy `/circle-card`; BCN legal | `/pro`, `/teams`, standards; Circle legal | Harness/unit |
| Auth | Existing branded paths | Circle-branded clean paths | Unit/browser |
| Protected home | `/dashboard` | `/app` and children | Harness/browser |
| Public card/referral | `/card/[slug]`, `/r/[code]` | Same | DB/manual |
| Manifest/SEO/assets | BCN identity | Circle identity/start `/app` | Harness/unit |
| BCN-only pages | Existing | GET/HEAD policy; mutations 404 | Harness/unit |
| Webhook/jobs/inbound | Credential/signature protected | 404 for all methods | Harness/unit |
| Host/proxy | BCN allowlist | Circle allowlist | Harness/unit |
| Cookies | Host-only | Host-only | Unit/browser |
| Billing return | BCN origin | Circle `/app` | Unit; no charge |
| Email identity | BCN; Circle for owned lifecycle | Circle only | Unit; no send |

## Required authenticated browser test after deployment

Use one approved test account in separate browser profiles or isolated cookie jars:

1. Sign into BCN and verify only a BCN host cookie is created; Circle remains signed out.
2. Sign into Circle with the same credentials; confirm no duplicate User/Card and BCN stays signed in.
3. Sign out of either host and confirm the other browser session remains present; repeat in reverse.
4. Confirm Circle registration source, no paid BCN membership, no unintended Circle Pro and data reuse.
5. Verify brand-bound verification/reset links through an approved preview/sink without live email.
6. Confirm service-worker/manifest scope is host-local and no browser storage token bridge exists.

## Production deployment order (do not execute)

1. Record deployed Git SHA, immutable release path, PM2 process/save state, health and log locations.
   Record protected environment-file paths, permissions and hashes without displaying contents.
2. Back up active Nginx files and protected `nginx -T` output. Confirm a restorable database backup,
   uploaded-content preservation, current environment-file backup and previous release directory.
3. Baseline BCN homepage/login and verify an invalid-signature webhook POST reaches the application
   rejection rather than redirect, 404 or 502.
4. Create a new release directory for the exact approved SHA. Verify clean tree and ensure no
   `.env.production`, `.runtime` or existing build is present.
5. Run `npm ci`, Prisma generate/migration status and tests in the offline release. Phase E adds no
   migration; do not mutate production data.
6. Prepare least-privilege protected process files outside the release. Validate BCN and Circle
   independently without printing values. Confirm placeholder credentials fail.
7. Build exactly once offline. Copy `.next` into both `.runtime` trees, compare `BUILD_ID` values,
   then treat the source and runtime artifact trees as immutable except for their process-owned caches.
   Never build in the current live directory.
8. Start Circle privately. Curl its loopback port with canonical Host, matching forwarded Host and
   HTTPS proto. Verify unknown/cross-brand/image-proxy and every owner-only route/method fails.
9. Switch only BCN to the new release with `--update-env`. Existing BCN remains the webhook target
   until PM2 performs its controlled replacement. Immediately recheck BCN auth and webhook baseline.
10. Stop on any difference. Nginx still points at the BCN port, so Circle public routing is untouched.
11. Install reviewed Nginx files beside the backup, run `nginx -t`, then reload—never blindly restart.
12. Verify TLS, default-host rejection, canonical/www behavior and both origins externally. Confirm
    Stripe still names exactly `https://thebusinesscircle.net/api/stripe/webhook`.
13. Run public/authenticated shared-user isolation tests. Keep billing disabled or operator-only and
    ensure external schedulers still target BCN only.
14. Inspect Checkout/Portal URL construction without a charge. A controlled live £9.99 operator
    charge requires separate explicit approval.
15. Inspect logs independently, record final health and save approved PM2 state. Preserve the old
    release, Nginx backup and failed-release evidence through the rollback window.

## Rollback

1. Remove public Circle routing first by restoring the Nginx backup, run `nginx -t`, then reload.
   Do not change the BCN webhook upstream.
2. Stop/delete only `circle-card`; preserve logs, database and uploaded content.
3. Point `RELEASE_DIR` and BCN protected-file path to the recorded previous immutable release and
   `startOrRestart --only the-business-circle-network --update-env` from its reviewed config.
4. Verify BCN homepage/login/dashboard and the invalid-signature webhook baseline; confirm external
   Stripe retries still reach BCN.
5. Restore saved PM2 state only if targeted rollback fails. Do not delete releases or roll database
   state backward: Phase E has no migration.
6. Retain failed-release caches, Nginx backup and logs without printing credentials.

## Stop conditions

Stop before traffic switching if the tree is dirty, SHA/build IDs differ, validation fails, Host and
forwarded Host disagree, Circle reaches any owner route, cookies contain `Domain`, alternating smoke
output crosses brands, the release contains production env files, either process points at `.next`
or a shared runtime directory, any test sends mail/contacts live Stripe, webhook health regresses,
or the recorded previous release cannot be restored.
