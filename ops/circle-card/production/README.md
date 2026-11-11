# Circle Card: read-only live release preflight (11 November 2026)

The **production website does not deploy from GitHub CI**. It runs from a newer standalone Next.js release on a VPS. The default repository is older than that release; deploying or merging the full repository is **not a safe live update**.

The most recent Work session confirmed a live standalone release, but the nightly recovery process could not reliably identify it. The last verified automatic backup was from **2 November 2026**. Available RAM was under 3 GiB, below the existing native installer build floor of about 3.5 GiB. These findings are a blocker for blind production deployment.

## Step 1: gather read-only evidence on the Circle Card VPS

Run `python3 ops/circle-card/production/preflight.py` from a checkout containing this file on the **Circle Card VPS**. Alternatively, download the file from a **pinned commit** on this branch and run it with Python 3. It makes no network requests, copies no data, prints no environment variables, reads no secret contents and changes no files, services or Nginx configuration. The returned JSON is an inventory, **not permission to deploy**.

Do not mistake service names or generic Nginx loopback ports for a verified active release. This script deliberately does not claim it can prove Nginx's final routing, database consistency or backup restorability.

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
