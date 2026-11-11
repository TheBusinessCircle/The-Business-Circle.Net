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

## Root-cause checkpoint: recovery manifest incompatibility (11 November 2026, 22:11 GMT)

The 2 October recovery runner at `/opt/circle-card-recovery/run.mjs` asserts there is exactly one verified deployment record for the live Nginx proxy port. Its line-14 assertion failed during the latest nightly run. The user-run SHA directory inspection proves:

- Registry root: `/var/lib/thebusinesscircle/circle-card-artifacts`; **54** SHA-named directories.
- **39** contain parseable `public-release.json` manifests, all status `PUBLIC_VERIFIED`, with each `applicationSha` agreeing with its SHA directory.
- **0** manifests have `publicPort == 3386`. Exactly **0** satisfy the runner's three conditions for the live public release.
- Real live production: `circle-card-bransons-account-20261109-115143.service`, PID on `127.0.0.1:3386`.
- Historical native installer code in `ops/circle-card/hucknall-hub/install-membership-repair.py` writes a separate `deployment.json` under its own state directory; this is **not** evidence that the central registry was updated.

**Do not fabricate a `PUBLIC_VERIFIED` registry record or bypass `assert.equal(records.length, 1)`.** That would falsely certify provenance. Repair must identify the true live release provenance, align recovery's selection with independently verified deployed artifact(s), and still validate database and app restore. Retain the old recovery service, timer, and script for rollback. Until a restorable backup is proven, prohibit live Circle Card code deployment.

## Immediate safety-copy option independent of the stale recovery registry

`one-shot-safety-backup.py` is a guarded manual PostgreSQL dump that identifies the actual live service, verifies healthy origin HTTP, reads the database URL **in memory** from the protected live process, validates the PostgreSQL URI, checks >= 5 GiB free disk, and creates a new root-private custom-format `pg_dump` archive under `/var/backups/circle-card-safety`. It caps output size at 2 GiB and checks `pg_restore --list`. It writes a SHA-256 and metadata manifest, never a connection URL or credentials.

Use no-argument mode for read-only precheck; `--backup` explicitly creates the dump. This is a valuable **new database safety copy**, not a completed restore test, not a full backup of files/uploads, and not a repair of the failed automatic recovery timer. It does not modify Circle Card's database. If preconditions fail it aborts without changing the site.

`recovery-bridge-plan.py` is read-only; it compares the actual live service with alternate native-installer deployment records and reports the old runner's redacted invocation structure. Use its results to design a compatible repair rather than fabricate a `PUBLIC_VERIFIED` record.

## PostgreSQL CLI root-cause and safe fix (11 November 2026, 23:16 GMT)

The user-run diagnostic found `DIRECT_URL` absent, `DATABASE_URL` present, and `psql` attempting the **local Unix socket / default OS database role** instead of the application database target. It reported role-not-found and missing-socket signals. The original one-shot backup code mistakenly put a full PostgreSQL connection URI in the `PGDATABASE` environment variable; for our client invocation, this was **not interpreted as a connection URI**.

`one-shot-safety-backup.py` and `backup-failure-diagnosis.py` now parse the vetted runtime URL and pass **separate** libpq `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and `PGPASSWORD` environment values, together with supported SSL connection options. Only the child process receives those credentials, never command-line arguments or logs. Tests confirm percent-decoding, role/host/database separation and rejection of unexpected connection options. Do not claim a backup exists until a user-run `--backup` prints a verified archive; an archive-list check is still **not** an isolated full restore test.

The installed client is PostgreSQL 14.24. The live server database major version is **not yet confirmed** because the previous `psql` query targeted the wrong Unix socket. If the corrected connection exposes a server newer than client 14, handle version compatibility separately without upgrading the actual production database or OS blindly.

## Verified production PostgreSQL restore and next file-protection gate (11 November 2026)

The user confirmed the exact private archive `/var/backups/circle-card-safety/circle-card-db-20261111T232300Z.dump` (3.09 MiB, SHA256 `1cc9b8cc72d8da831c17cda6c77eb51e2a459714e0f95c18773950fee796dad7`) successfully restored into a temporary PostgreSQL 14 cluster with no TCP listener. **132 public tables** restored, matching the 132 archive TABLE DATA entries. The production database was never connected to or modified and the isolated database was stopped and deleted. The printed outcome was `RESTORE_TEST_PASSED`. This verifies that particular database backup; it does **not** demonstrate application-file completeness, encrypted offsite safety or the automatic timer's compatibility.

`live-app-safety-archive.py` provides a guarded root-private snapshot of the *actual active* release, systemd unit, effective site Nginx configuration, native deployment receipt and its rollback state, and any existing external Bransons sample assets. It preserves symlinks as symlinks and refuses to follow external targets; it checks for the verified database archive, live service identity, vhost health, >5 GiB free disk and snapshot size caps. Run it with no arguments to check first, then with `--backup` to create a new private archive. It **does not** capture all unspecified external uploads, domains, remote services or payment processor state. Do not present it as complete disaster recovery.

**The old `circle-card-recovery.timer` still requires its own compatibility repair.** Until its replacement is validated, do not falsely register the November live release as a historical `PUBLIC_VERIFIED` artifact. Continue preserving the current/rollback services and existing backups.

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
