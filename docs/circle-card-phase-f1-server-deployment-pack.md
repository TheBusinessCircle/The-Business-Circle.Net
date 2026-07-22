# Phase F1 server-specific systemd deployment pack

This is an auditable preparation and rollback runbook, not deployment approval. Nothing in this pack may be run until the operations pack is separately committed, archived deterministically, adversarially reviewed, and verified from externally recorded hashes. Never put secret values in Git, chat, command arguments, journals, or deployment logs.

## Immutable identities

The four identities are separate and must never be substituted:

| Identity | Exact value | Purpose |
| --- | --- | --- |
| Historical production baseline | `5fa2bbf6ac7d39aa14636882bbae2d2713faf11a` | Records the currently deployed application, establishes the rollback candidate parent, and preserves historical live evidence. It is not built as the immutable rollback artifact. |
| Approved rollback application candidate | `5d1f81bb05a01b08e1134785c2f86b77c8969fe3` | Historical BCN behavior plus the reviewed Phase E3 immutable-runtime correction. It is the only rollback build, probe, selector, and proof source. |
| Approved forward application | `2c83694de301b0244c5586c1598aceb10fa2214b` | The only source for forward BCN and Circle Card artifacts. |
| Operations-pack commit | recorded after review | Identifies these scripts and this runbook. It is never an application build source. |

The rollback candidate must be a clean, single-parent, non-merge commit whose parent is the historical baseline and whose exact diff is:

- `M next.config.ts`;
- `A src/config/rollback-immutable-runtime-cache.test.ts`; and
- `A docs/bcn-phase-e3-rollback-immutable-runtime-cache.md`.

The forward commit must be a clean, single-parent commit whose parent is `c95b10d82d192c273812a40c2c9d1e9e73791b96` and whose exact diff is the three reviewed Phase E2 files. `application-identities.mjs` verifies parent, file set, status, mode, raw-diff digest, and committed-file hashes after each detached checkout. Branch names are never deployment identities.

The rollback application source review is complete. Linux-isolated fixture generation, provenance-gated real `next start`, Ubuntu immutability/image-load evidence, and systemd rehearsal remain outstanding. No production deployment is approved.

## Release and evidence layout

```text
/var/www/builds/rollback-5d1f81bb05a01b08e1134785c2f86b77c8969fe3-<unique>/
/var/www/builds/forward-2c83694de301b0244c5586c1598aceb10fa2214b-<unique>/
/var/www/rollbacks/5d1f81bb05a01b08e1134785c2f86b77c8969fe3/
/var/www/releases/2c83694de301b0244c5586c1598aceb10fa2214b/
/var/www/current-bcn -> verified rollback or forward artifact
/var/www/current-bcn-rollback-probe -> verified rollback artifact
/var/www/current-circle-card -> forward artifact
/var/www/shared/public/uploads/
/var/www/shared/private/<authority-specific-subtrees>/
/var/www/shared/generated/community-source-previews/
/var/lib/thebusinesscircle/artifacts/2c83694de301b0244c5586c1598aceb10fa2214b-5d1f81bb05a01b08e1134785c2f86b77c8969fe3/
/var/lib/thebusinesscircle/deployment-state/
/var/lib/thebusinesscircle/boot-eligibility/bcn.json
/opt/thebusinesscircle/deployment-packs/<exact-operations-commit>/
```

Forward BCN binds `127.0.0.1:3000`, its candidate binds `127.0.0.1:3100`, Circle Card binds `127.0.0.1:3200`, and the rollback probe binds `127.0.0.1:3300`. The isolated Nginx origin-TLS rehearsal binds `127.0.0.1:8443` only.

The historical `/var/www/The-Business-Circle.Net` remains unchanged as evidence. It never becomes a post-convergence writer or reboot target. Forward and rollback artifacts use the same canonical database and authority-split persistent storage; rollback never reverse-syncs uploads or restores PostgreSQL.

## Detached builds and cache exclusion

Rollback and forward use separate, newly created, disposable detached checkouts. A failed or existing workspace is never reused. Each checkout rejects source `.env*`, stale `.next`, `node_modules`, ignored executable inputs, extra commits, wrong parents, and unreviewed file changes. Dependency lifecycle scripts run only as `phase-f1-build`, with no production database, Stripe, Resend, webhook, cron, LiveKit, TURN, environment-file, or system authority.

Build order is rollback first, forward second. Both builds use synthetic unreachable build values. Build-attempt state lives outside the checkout in the root-only deployment-state directory; it has a unique identifier and cannot be reused after consumption, failure, or completion. Nothing writes a lifecycle marker into the source tree. Source manifests are compared before install, after `npm ci`, and after build. The locked dependency tree receives its own before/after manifest, so a build cannot mutate installed Prisma engines, Sharp, esbuild, Next, or another runtime dependency before promotion.

Both Next.js 15.5.15 corrections set `experimental.isrFlushToDisk=false` and `cacheMaxMemorySize=52,428,800`. Artifact construction removes the complete build-only `.next/cache` tree before copying or promotion. Runtime-manifest creation and verification reject `cache`, `cache/fetch-cache`, and `cache/images`. Required `BUILD_ID`, `.next/server`, `.next/static`, manifests, dependencies, and public content remain. No generic writable Next cache directory is created. Complete runtime artifacts are root-owned and read-only; only proven persistent application paths are writable through canonical storage.

The complete forward-release and rollback-release manifests cover every regular file imported, executed, or served: role-specific `.runtime` trees, required `.next` output, locked runtime `node_modules`, package metadata, required server/source files, and immutable public assets. They also record each approved dependency symlink and the three canonical persistent-storage symlinks. Dependency links must resolve inside the sealed `node_modules`; persistent links must resolve to exact canonical roots. Substitution, a missing file, an unexpected executable or ignored input, or tampering anywhere in the reachable release fails verification.

Final artifact evidence records the role, application SHA, operations identity, externally approved operations-pack identity hash, `BUILD_ID`, source-tree identity, complete release digest, environment-readiness hash, database-identity hash, storage-manifest identity, systemd-unit identity, and rehearsal-evidence identity. `BUILD_ID` is never sufficient by itself.

## Pack installation and immutable service paths

The approved archive, approved installed-tree manifest, and standalone bootstrap each have externally recorded SHA-256 identities. System `sha256sum` verifies all three before archive code can run. The bootstrap inspects every member before extraction, rejects traversal, links, special files, missing/extra entries and content mismatches, and extracts only into a new protected staging directory. The manifest declares directories as `0555`, directly invoked shell scripts as `0555`, and Node/data/template files as `0444`. Setuid, setgid, group/world-writable objects, hard links, and unexpected executable modes fail. The complete staged tree is compared with the manifest before atomic publication and again immediately afterward.

The installation path is `/opt/thebusinesscircle/deployment-packs/<exact-40-hex-operations-commit>`. There is no `current` pack symlink. Unit templates render only after pack verification; every `ExecStart` and `ExecCondition` receives the exact commit-named directory. Unresolved placeholders, branch names, mutable selectors, or a mismatch between the executing pack and external identity fail. Rendered units are root-owned, protected, hashed, and bound into durable and artifact evidence.

### Canonical candidate aggregate

Run `node ops/deploy/phase-f1/candidate-aggregate.mjs .` from the repository root. The helper enumerates only `ops/deploy/phase-f1/**`, this runbook, and `src/config/phase-f1-deployment-pack.test.ts`; rejects out-of-boundary changes, linked objects, generated artifacts, missing/duplicate normalized paths; normalizes separators to `/`; sorts paths by ordinal UTF-8 bytes; hashes each raw file; emits `relative/path<TAB>lowercase-sha256<LF>` rows internally; and SHA-256 hashes the exact UTF-8 row sequence. Output is restricted to schema version, file count, and aggregate SHA-256. Pack creation binds the same result into the external approved-pack identity and installed verification requires that binding.

### Complete Nginx dependency snapshot

The Nginx backup recursively resolves the include graph and supported local file directives, expands globs deterministically, rejects unresolved, hard-linked, special, dynamic, or unclassified dependencies, and copies the exact closure into a root-only snapshot. Symlinks remain fail-closed except for one-hop links below `/etc/nginx/sites-enabled` to regular files below `/etc/nginx/sites-available`, and one-hop links below `/etc/nginx/modules-enabled` to regular files below `/usr/share/nginx/modules-available` or `/etc/nginx/modules-available`. Each accepted link has a canonical protected parent and a root-owned, single-link, non-writable target; its exact link text, link path, canonical target, target identity, content digest and reproduced snapshot topology are evidence-bound. Chains, cycles, traversal, missing targets, writable targets and every other link topology fail. Snapshot validation resolves the reproduced link only; exact restoration recreates the original target and original link text as one evidence-matched set.

Configuration, public certificates, private keys/secret material, immutable binary modules, and unsupported/runtime paths are classified separately. `load_module` is parsed apart from text includes. Relative module names use the Nginx module prefix (`/usr/lib/nginx` on the reviewed Ubuntu layout), and module binaries must resolve below `/usr/lib/nginx/modules` or `/usr/share/nginx/modules`. They are copied and hashed as raw bytes without UTF-8 decoding, newline conversion or template substitution; only the configuration's path token is rewritten to the snapshot binary. Mode, size, ownership expectation and source/snapshot identities are recorded. Public certificate fingerprints, SANs and expiry plus non-secret key-pair identities are evidence-bound; private material remains protected and is never printed. All captured references are rewritten to snapshot paths, and `nginx -t` runs against the extracted prefix. Restore must use the entire evidence-matched dependency set; piecemeal restoration is forbidden.

Runtime environment files contain only the exact service allowlist. `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, and `SEED_MODE` are tooling-only and are absent from both BCN and Circle Card web processes; validation or seed work uses a separate short-lived protected environment. `/proc/<pid>/environ` verification compares names only and fails on any extra authority. Circle Card never receives BCN webhook, cron, inbound, membership, LiveKit, TURN or unrelated delivery credentials, and public billing mode remains a hard stop.

## Rollback provenance and proof

The rollback build must run the committed-candidate flow in `src/config/rollback-immutable-runtime-cache.test.ts` from exact SHA `5d1f81bb05a01b08e1134785c2f86b77c8969fe3`. Final fixture generation cannot run from an uncommitted review diff. Provenance must bind the actual candidate SHA, historical parent, exact three-file set, raw Git diff digest, reviewed-file hashes, package identities, Next.js `15.5.15`, `BUILD_ID`, and recomputed full artifact manifest. It must record a synthetic build, absent production authority, enforced Linux loopback-only/no-route network isolation, and historical BCN identity. Forward Circle Card identity is rejected.

A skipped fixture-generation or real-server test is incomplete evidence and blocks cutover. The rollback proof cryptographically binds:

- the rollback SHA and historical parent;
- exact rollback commit structure evidence;
- post-install/build proof that the rollback source commit remained clean and exact;
- committed-candidate provenance;
- rollback artifact manifest;
- Linux real-`next start` evidence;
- Ubuntu immutability evidence;
- image-load approval;
- current private smoke evidence;
- canonical database and shared-storage identities;
- environment readiness;
- systemd unit hashes; and
- the external operations identity.

Non-empty marker files are insufficient. Every protected evidence file is root-owned, single-link, mode `0600`, and content-hashed in the proof.

## Forward Phase E2 evidence

The forward build uses only `2c83694de301b0244c5586c1598aceb10fa2214b`. Evidence must prove the exact Phase E2 commit structure, resolved disk flushing disabled, the 50 MiB memory cap, immutable before/after manifests, absent fetch/image disk caches, authenticated `revalidatePath`/`revalidateTag`/`unstable_cache`, insight behavior, repeated images, both dual-runtime start orders, brand isolation, session isolation, owner-route isolation, and separate BCN/Circle Card process caches. Skipped evidence never counts.

## Systemd and durable state

The new runtime supervisor is systemd, not PM2. Services execute directly as `bcn-app` or `circle-card-app` with exact groups, loopback listeners, `NoNewPrivileges`, empty capability sets, `ProtectSystem=strict`, `ProtectHome=true`, `PrivateTmp=true`, `UMask=0027`, root-owned read-only runtime paths, narrow `ReadWritePaths`, and journald output. PM2 is retained only as captured transition/rollback evidence until boot ownership is deliberately adopted.

The root-only checksummed state remains under a mode-`0700` directory and is never made readable to an application UID. Stable BCN `ExecCondition` instead validates `/var/lib/thebusinesscircle/boot-eligibility/bcn.json`, an atomically published, root-owned, single-link, mode-`0444` record in a root-owned non-writable parent. It contains no secret and binds the exact operations commit, selector role, application SHA, complete release-manifest digest, protected-state digest, and monotonic generation. The unprivileged condition recomputes the selected read-only release manifest before startup; missing, stale, altered, or selector/artifact-mismatched eligibility fails. The Ubuntu rehearsal must prove `bcn-app` can read it but cannot replace it or traverse protected state.

The checksummed durable state records separately:

- `forwardApplicationSha`, `rollbackApplicationSha`, `historicalProductionSha`, and `operationsIdentity`;
- forward BCN, forward Circle Card, and rollback BCN artifact digests;
- forward and rollback rehearsal evidence digests;
- database and final storage identities;
- systemd-unit identity;
- active BCN selector; and
- Circle Card traffic status.

Transitions reject identity substitution. `rollback-boot-ready` requires final storage identity, rollback selector, rollback proof, rollback provenance, rollback private smoke, immutable/image evidence, and verified systemd identity. `forward-live` requires the forward selector, complete Phase E2 evidence, both private forward artifacts, dual-brand isolation, and matching database/storage identities. Public Circle Card status is not accepted before `traffic-switched`.

Durable order:

Forward path: `none -> prepared -> candidates-verified -> freezing -> writers-frozen -> storage-converged -> rollback-boot-ready -> rollback-live -> forward-bcn-switch-pending -> forward-bcn-starting -> forward-bcn-live -> forward-live -> traffic-switched -> finalized`.

Traffic rollback path: `forward-live|traffic-switched|finalized -> circle-traffic-removed -> rollback-switch-pending -> rollback-starting -> rollback-live`. A failed rollback start returns transactionally to `circle-traffic-removed`, restores the forward selector and eligibility, and verifies forward BCN without re-enabling Circle traffic.

`forward-bcn-switch-pending` remains rollback-owned: the rollback process, binding, and boot eligibility stay authoritative while the root selector change is attempted. After the selector changes, state immediately advances to `forward-bcn-starting` and publishes forward eligibility before restart. A kill or reboot between filesystem operations fails closed; re-entry restores rollback and `rollback-live` before retry. After forward BCN verifies, `forward-bcn-live` is recorded before Circle Card starts. Circle Card remains private until its independent gate passes. Any later failure restores and verifies rollback transactionally.

Rollback first removes the exact reviewed Circle Card Nginx site link, validates and reloads the no-Circle configuration, proves Circle is no longer routed while BCN and its invalid-signature webhook remain correct, records `circleCardTrafficStatus=disabled`, and atomically publishes strict routing-removal evidence. Only then may `circle-card.service` stop. If routing removal fails, Circle Card stays running.

From `freezing` onward the historical PM2 checkout cannot become the automatic boot target. Every reboot point is governed by the checksummed state and opposing PM2/systemd `ExecCondition` rules.

## Mandatory Ubuntu evidence

Both identities require rehearsal on Ubuntu 22.04.5, Node 22.22.2, four CPUs, and approximately 7.7 GiB RAM using unprivileged systemd users and root-owned read-only artifacts.

Rollback rehearsal covers committed-candidate fixture generation, provenance-gated real `next start`, historical homepage and login redirect, invalid Stripe signature, shared uploads, private permissions, all revalidation mechanisms, insight routes, sequential/burst/sustained images, CPU, RSS, available memory, p50/p95, errors, crashes, and restarts.

Forward rehearsal covers immutable content, both private runtimes and both start orders, brand/session/owner-route isolation, authenticated revalidation, insights, repeated image load, resource headroom, and absence of immutable mutation.

Hard stops include any skipped mandatory evidence, wrong SHA/artifact, immutable mutation, `EACCES`, relevant image 5xx, crash, OOM, unexpected restart, uncontrolled RSS, threatening sustained CPU, unacceptable measured latency, failed revalidation, failed historical behavior, or failed brand isolation. No universal performance threshold is invented; the operator records the baseline and explicitly approves measured VPS headroom.

Ubuntu must also execute the two POSIX-only pack tests that Windows cannot prove: exact installed execute/read-only modes with direct execution of a harmless installed shell fixture, and complete release symlink ownership/canonical-target behavior. It must exercise candidate starts where `systemctl start` fails after activation, activating timeouts, verifier/smoke failures, stop failures, lingering listeners, and SIGKILL/reboot at every forward transaction boundary.

## Structured evidence, database publication, Nginx, and raw HTTP

Authenticated browser gates, active routing, routing removal, and traffic switch use strict JSON with exact fields. Each root-owned, mode-`0600`, single-link record binds operations/application identities, artifact, systemd-unit, Nginx, database and storage digests, execution time, reviewer, and every individual result. Existence is never approval. Active routing separately requires Free and existing-Pro behavior, operator-only billing, independent sessions, shared account identity, no real charge, no live email, host rejection, the raw owner-route matrix, cache bypass, and no mutating HTTP redirect. Validators run immediately before each dependent transition.

Cloudflare/TLS approval parses origin addresses with Node's IP parser rather than a pattern approximation. The IPv4 origin must be a syntactically valid public unicast address; unspecified, loopback, multicast, link-local, private, carrier-grade NAT, documentation and other reviewed reserved ranges fail. The IPv6 decision is exactly `explicit-ipv6` or `explicitly-no-aaaa`: the former requires a valid public unicast IPv6 address and the latter requires a null address plus a reviewed reason. Private origins are not approved by this pack's public-origin policy. The real-IP source is exactly the `cloudflare-official-ip-ranges` identity at `https://www.cloudflare.com/ips/`, bound to the reviewed IPv4/IPv6 range-set SHA-256 and retrieval date. Arbitrary URLs and labels fail. Local fixtures validate this schema without network access; controlled retrieval, redirect/domain verification, and comparison with the real Cloudflare ranges remain deployment gates.

Candidate cleanup records ownership before `systemctl start`. Its real Bash per-unit function returns a result instead of terminating the outer loop, so journal capture, stop, inactive-state wait, MainPID disappearance and port release are attempted for every invocation-owned private unit even after an earlier failure. The safe fixture sources both production cleanup functions and injects fake systemd, journal, listener, PID and wait commands; it proves each first-unit failure class still permits complete second-unit cleanup, preserves failed ownership, clears only successful ownership and never touches stable BCN. This fixture does not replace the real Ubuntu systemd, SIGKILL or reboot rehearsal.

The database dump is built in an exclusive partial directory. `pg_restore --list`, archive size, SHA-256, canonical database identity and restore-list digest are verified before strict evidence is created. The archive, checksum and evidence directory is atomically published and revalidated as an exact three-file set before state evidence appears. A partial set, hard link, checksum/list mismatch, interrupted publication, or stale collision is not authoritative.

The Nginx baseline requires a configuration-change lock and successful live `nginx -t`. It records enabled links and certificate references, compares pre/post manifests, verifies archive content, extracts into a protected validation root, rewrites only isolated prefix/log/PID references, and runs `nginx -t` against the extracted snapshot without reload or live listener binding. Live files are compared again afterward. Windows fixture tests validate manifest consistency; actual extracted-snapshot validation and exact restore remain mandatory on Ubuntu.

Restore is never a file-by-file overlay. Under the same exclusive configuration lock, the operator re-verifies archive/checksum/evidence, extracts to a new protected staging root, compares the extracted manifest with both recorded manifests, runs isolated staged `nginx -t`, prepares an atomic whole-baseline replacement while preserving the current directory as evidence, then runs live `nginx -t` before a reload. Any mismatch aborts before replacement; a failed live validation restores the preserved whole directory, never a mixed subset.

The Circle HTTP raw-target map rejects repeated separators, case variants, encoded slashes/dots, owner suffixes and query disguises before the general redirect; all non-GET/HEAD requests are rejected before redirect. The target gate uses `curl --path-as-is` for GET, HEAD, POST, PUT, PATCH, DELETE and OPTIONS, verifies missing/unknown/duplicate Host and forwarded-host mismatch, and uses a unique cache-bypass token plus non-`HIT` Cloudflare headers. The exact BCN webhook remains owned by the BCN apex.

## Remaining deployment sequence — do not execute during pack development

1. Commit and independently publish the reviewed Phase F1 operations archive.
2. Install it only after external bootstrap, archive, manifest, and operations-commit verification.
3. Prepare protected environments and one canonical database identity.
4. Create a fresh rollback checkout at `5d1f81bb05a01b08e1134785c2f86b77c8969fe3`.
5. Run committed-candidate provenance and the isolated Linux rollback build.
6. Construct and rehearse the immutable rollback artifact privately.
7. Create a separate fresh forward checkout at `2c83694de301b0244c5586c1598aceb10fa2214b`.
8. Construct forward BCN and Circle Card artifacts from that one forward build.
9. Run complete Phase E2, image-load, and dual-brand rehearsals.
10. Prepare systemd units and canonical persistent storage without switching traffic.
11. Record the fully bound prepared state and verify rollback proof.
12. Start private forward candidates and the rollback probe; retain their evidence.
13. Freeze every legacy writer and perform final source-authoritative storage convergence.
14. Point the stable selector at the rollback artifact and make systemd rollback the reboot-safe owner.
15. Verify rollback BCN live, including homepage, login, uploads, and invalid Stripe signature.
16. Atomically select the forward BCN artifact and verify it; restore the already-proven rollback selector on failure.
17. Start Circle Card privately and record `forward-live` only after it passes; public Circle traffic remains disabled.
18. Stage and validate Nginx/TLS, run the raw request matrix, publish strict active-routing and authenticated evidence, and only then record the public traffic switch.
19. Validate public behavior, sessions, shared users, operator-only billing, webhook ownership, and no live email/charge during initial smoke.
20. Preserve rollback artifacts, database state, shared uploads, journals, deployment logs, manifests, and all proof evidence.

Rollback removes Circle Card traffic independently, reprobes the exact rollback candidate against current database/storage, switches the root-owned selector atomically, and never fetches, rebuilds, reverse-syncs, restores the database, or deletes failed evidence.
