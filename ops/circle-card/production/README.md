# Circle Card: read-only live release preflight (11 November 2026)

The **production website does not deploy from GitHub CI**. It runs from a newer standalone Next.js release on a VPS. The default repository is older than that release; deploying or merging the full repository is **not a safe live update**.

The most recent Work session confirmed a live standalone release, but the nightly recovery process could not reliably identify it. The last verified automatic backup was from **2 November 2026**. Available RAM was under 3 GiB, below the existing native installer build floor of about 3.5 GiB. These findings are a blocker for blind production deployment.

## Step 1: gather read-only evidence on the Circle Card VPS

Run `python3 ops/circle-card/production/preflight.py` from a checkout containing this file on the **Circle Card VPS**. Alternatively, download the file from a **pinned commit** on this branch and run it with Python 3. It makes no network requests, copies no data, prints no environment variables, reads no secret contents and changes no files, services or Nginx configuration. The returned JSON is an inventory, **not permission to deploy**.

Do not mistake service names or generic Nginx loopback ports for a verified active release. This script deliberately does not claim it can prove Nginx's final routing, database consistency or backup restorability.

## Verified production routing (11 November 2026, 20:06 UTC)

The user-run read-only diagnostic identified:

- `circlecard.co.uk` HTTPS Nginx vhost -> `127.0.0.1:3386`
- Port `3386` is owned by PID `3022644`, whose process CWD is `/var/www/releases/circle-card-bransons-account-20261109-115143`
- Active systemd unit: `circle-card-bransons-account-20261109-115143.service`
- **14** active Circle Card application units (many older release directories), about **7,220 MiB** of cgroup memory reported in total (not guaranteed reclaimable)
- At preflight: about **2.88 GiB** RAM available, **10.15 GiB** disk available, virtually all swap used
- `circle-card-recovery.service` failed with exit status 1; last file metadata in `/var/lib/circle-card-recovery` dates from 2 November 2026. Files exist under `/var/backups` on 11 November, but **their identity, integrity and restorability are not verified**.
- The other Nginx ports are separate services: port 8787 points to Crypto Radar, 3000 to the older BCN web service; **do not stop either**.

Next diagnostic: `recovery-service-audit.py` (read-only; includes service listener ownership and dependency hints, backup metadata, error categories and fingerprints of relevant live source code). It provides candidate information **not** authority to stop services.

**Never stop any prior Circle Card service simply because it is not on the public Nginx port**: verify all listen sockets, reverse dependencies, background jobs, preview dependencies and rollback requirements first. Do not kill PIDs or run `disable --now` on guessed services.

## Controlled memory recovery (11 November 2026, after 21:18 UTC)

The user ran the guard-checked old-service retirement script on the VPS:

- **11 older application instances stopped successfully**, keeping live port 3386 and the two newest rollback releases on ports 3384/3385 running.
- Before: **2,926.7 MiB** available RAM; after: **8,043.8 MiB** available RAM; increase **5,117.1 MiB**.
- Swap free after: approximately **1.7 GiB**; public live systemd service remained active.
- Release directories, user data and database were not deleted or changed.
- The old units remained **enabled** for boot; `persist-retirement.py` has been prepared to disable these 11 stopped units only, with dry run and reversible enablement. Do not disable the actual live or protected rollback units.
- `recovery-deep-audit.py` is a read-only investigation of the failing timer, service entrypoint, categorized error logs and backup candidates. This is not backup verification.

**The current blocker for a live app deployment remains a verified recoverable data backup and an isolated build of the true current release**, despite recovered memory.

## Persistent cleanup and recovery fault (11 November 2026, 21:44 GMT)

User-run diagnostics confirm all 11 previously stopped older Circle Card services are now **disabled for future systemd boots**, without deleting their release directories or affecting the live service. The two rollback release units remain preserved, and live health checks passed. Available RAM remains about **7.8 GiB** and swap available **1.7 GiB**.

The daily recovery service remains **failed**, with exit code 1 and a **Node AssertionError**; its timer remains **enabled**, last triggered 11 November 02:25 and next scheduled 12 November 02:24 GMT. Failure audit saw no evidence of disk-full, DB, permission or OOM failure, but found an assertion, not the exact expression. No database backup or restore test has been validated. Historical backup-looking files under /var/backups include an Oct 3 QA dump and other earlier artifacts, not evidence of a fresh recoverable backup. Do not automatically rerun the failed timer or attempt an app deployment until its failure and backup recoverability are understood.

Next read-only diagnostic: `recovery-failure-forensics.py` reports Node recovery script path, sanitized assertion sites and stack frame line numbers without printing log messages, environment values or data records.

## Step 2: mandatory release gates

1. Identify the active HTTPS vhost, loopback port, running systemd unit, protected launcher and actual process working directory. Confirm they all point to the same current release.
2. Create and verify a recoverable database **and** application-state backup. Check backup timestamps and perform a restore test away from production. Keep the old release and Nginx config.
3. Resolve the low-memory build problem by using an isolated build environment or verified capacity, **without overwriting live binaries or changing infrastructure blind**.
4. Copy the actual live release into an isolated candidate. Apply only the reviewed target-file diff. Keep Prisma schema, permissions, authentication, billing and account data unchanged.
5. Validate production build, unit tests and isolated HTTP on a separate port; then test Free/Pro link creation, public visibility, Hucknall signup, private preview protections, Wallet, QR/vCard, commissions and billing.
6. Switch Nginx only after a verified rollback route and change-window approval. Monitor and revert immediately on failing smoke tests.

## Current source work

- PR #23: direct Free signup from Hucknall Circle Hub (CI passed; not deployed).
- PR #24: unlimited standard links on Free and Pro (CI/review required; not deployed).
- Existing bespoke cards, published identities, subscriptions and stored data must be preserved.

**Do not run** `deploy.sh`, `prisma migrate`, `git reset --hard`, `systemctl restart`, or an old installer against the active production release to shortcut these gates.
