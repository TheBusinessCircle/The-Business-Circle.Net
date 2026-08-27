# Phase F1 server-specific systemd deployment pack

This is an auditable preparation and rollback runbook, not deployment approval. Nothing in this pack may be run until the operations pack is separately committed, archived deterministically, adversarially reviewed, and verified from externally recorded hashes. Never put secret values in Git, chat, command arguments, journals, or deployment logs.

## Immutable identities

The four identities are separate and must never be substituted:

| Identity | Exact value | Purpose |
| --- | --- | --- |
| Historical production baseline | `5fa2bbf6ac7d39aa14636882bbae2d2713faf11a` | Records the currently deployed application, establishes the rollback candidate parent, and preserves historical live evidence. It is not built as the immutable rollback artifact. |
| Approved rollback application candidate | `8db8236c16ebb5a02ec5b90f7e5308008cff7086` | Historical BCN behavior plus the reviewed Phase E3 immutable-runtime correction. It is the only rollback build, probe, selector, and proof source. |
| Approved forward application | `b43a1e4e708bc9f02ef83bd63dab1db1f366b32e` | The only source for forward BCN and Circle Card artifacts. Its exact parent is the machine-readiness correction `6949bb2b7ef0ce28e5983751f3c8a10accde99b3`, and its cumulative reviewed base is the immutable-runtime baseline `2c83694de301b0244c5586c1598aceb10fa2214b`. |
| Operations-pack commit | recorded after review | Identifies these scripts and this runbook. It is never an application build source. |

The rollback candidate must be a clean, single-parent, non-merge commit whose parent is the historical baseline and whose exact diff is:

- `M next.config.ts`;
- `A src/config/rollback-immutable-runtime-cache.test.ts`; and
- `A docs/bcn-phase-e3-rollback-immutable-runtime-cache.md`.

The forward commit must be the clean, single-parent test-integration follow-up whose exact parent is `6949bb2b7ef0ce28e5983751f3c8a10accde99b3`. Its cumulative reviewed diff is measured from `2c83694de301b0244c5586c1598aceb10fa2214b` and consists only of `M package.json`, `M scripts/validate-production-env.ts`, and `A tests/validate-production-env.test.ts`. `application-identities.mjs` verifies the exact head, parent, reviewed base, cumulative file set, status, mode, raw-diff digest, and committed-file hashes after each detached checkout. Branch names are never deployment identities.

The rollback application source review is complete. Linux-isolated fixture generation, provenance-gated real `next start`, Ubuntu immutability/image-load evidence, and systemd rehearsal remain outstanding. No production deployment is approved.

## Release and evidence layout

```text
/var/www/builds/rollback-8db8236c16ebb5a02ec5b90f7e5308008cff7086-<unique>/
/var/www/builds/forward-b43a1e4e708bc9f02ef83bd63dab1db1f366b32e-<unique>/
/var/www/rollbacks/8db8236c16ebb5a02ec5b90f7e5308008cff7086/
/var/www/releases/b43a1e4e708bc9f02ef83bd63dab1db1f366b32e/
/var/www/current-bcn -> verified rollback or forward artifact
/var/www/current-bcn-rollback-probe -> verified rollback artifact
/var/www/current-circle-card -> forward artifact
/var/www/shared/public/uploads/
/var/www/shared/private/<authority-specific-subtrees>/
/var/www/shared/generated/community-source-previews/
/var/lib/thebusinesscircle/artifacts/b43a1e4e708bc9f02ef83bd63dab1db1f366b32e-8db8236c16ebb5a02ec5b90f7e5308008cff7086/
/var/lib/thebusinesscircle/deployment-state/
/var/lib/thebusinesscircle/boot-eligibility/bcn.json
/opt/thebusinesscircle/deployment-packs/<exact-operations-commit>/
```

Forward BCN binds `127.0.0.1:3000`, its candidate binds `127.0.0.1:3100`, Circle Card binds `127.0.0.1:3200`, and the rollback probe binds `127.0.0.1:3300`. The isolated Nginx origin-TLS rehearsal binds `127.0.0.1:8443` only.

The historical `/var/www/The-Business-Circle.Net` remains unchanged as evidence. It never becomes a post-convergence writer or reboot target. Forward and rollback artifacts use the same canonical database and authority-split persistent storage; rollback never reverse-syncs uploads or restores PostgreSQL.

## Detached builds and cache exclusion

Rollback and forward use separate, newly created, disposable detached checkouts. A failed or existing workspace is never reused. Each checkout rejects source `.env*`, stale `.next`, `node_modules`, ignored executable inputs, extra commits, wrong parents, and unreviewed file changes. Dependency lifecycle scripts run only as `phase-f1-build`, with no production database, Stripe, Resend, webhook, cron, LiveKit, TURN, environment-file, or system authority.

Git checkout accepts only the exact `TheBusinessCircle/The-Business-Circle.Net` repository at `github.com`. SSH transport is bound to the single reviewed GitHub Ed25519 host key in the immutable pack's `github.com.known_hosts`; the installed trust file is root-owned, single-link, mode `0444`, readable but not writable by `phase-f1-build`, and not writable by either runtime user. Checkout supplies a fixed `GIT_SSH_COMMAND` from an `env -i` invocation with `StrictHostKeyChecking=yes`, the pack trust file as the only user host-key authority, no global or interactive SSH configuration, Ed25519-only host-key negotiation, disabled host-key updates/DNS trust, and no inherited identity agent. Missing, changed, linked, writable, wrong-algorithm or extra-host trust fails before network checkout. HTTPS remains accepted only for the exact same repository and cannot redirect checkout to another host or repository.

Private-repository authentication uses one generated Ed25519 GitHub deploy key at the fixed protected Phase F1 path. The private key is never stored in the repository or operations pack: `prepare-git-auth-material.sh` creates it directly under a root-controlled directory as `phase-f1-build:phase-f1-build` mode `0400`, satisfying OpenSSH strict private-key metadata, preventing later build-user mutation, and remaining inaccessible to both runtime users. Only the public key may be displayed for separate repository-scoped GitHub registration. `verify-git-authentication.sh` performs a read-only exact-repository probe through the pinned host trust and publishes closed, value-free, commit-bound readiness evidence. Checkout requires that evidence and forces `IdentitiesOnly=yes`, the exact identity file, no agent, no default identity/config fallback and no caller override. Material generation, GitHub registration/readiness verification, and checkout are separately authorised gates. The one-purpose `recover-git-auth-material.sh` accepts only the known pre-registration two-file partial state with the obsolete root/group-readable metadata, no readiness evidence, no checkout and no process reference; it changes metadata only, proves private bytes unchanged internally, and requires the build user to derive the exact matching public key before succeeding.

An authentication implementation/republication gate does not generate or display production key material. A fresh deployment next uses `SEPARATELY_AUTHORIZED_PHASE_F1_BUILD_GIT_DEPLOY_KEY_GENERATION_PUBLIC_KEY_REGISTRATION_AND_AUTHENTICATION_READINESS_UNDER_<CURRENT_OPERATIONS_COMMIT>_AUTHORITY`. When the exact pre-registration obsolete-metadata partial pair has instead been recovered and verified, the exact next gate is `SEPARATELY_AUTHORIZED_PHASE_F1_BUILD_GIT_DEPLOY_KEY_PUBLIC_KEY_DISPLAY_GITHUB_REGISTRATION_AND_AUTHENTICATION_PROBE_UNDER_<CURRENT_OPERATIONS_COMMIT>_AUTHORITY`. Only those gates obtain the public key through `git-authentication.mjs public-key`, require the operator to register it as a read-only deploy key for the exact repository, and run the committed read-only authentication verifier. Neither creates an application checkout. Only after `GIT_AUTH_READY` may a later chained-readiness/fresh-checkout/offline-cache gate proceed.

Git-authentication readiness is operations-commit-bound and is stale after an authority-only transition by default. A separately authorised gate may invoke `git-authentication.mjs carry-forward` with only the exact canonical source-evidence SHA-256, the current operations commit and `IDENTITY_ONLY_GIT_AUTH_READINESS_CARRY_FORWARD`. The source authority is derived from the protected canonical v1 readiness evidence; callers cannot provide a source authority, lineage, evidence path, destination, repository, host, key path or semantic mutation. The source must be `READY`, its exact repository/host/authentication/read-only semantics must validate, the current protected deploy-key pair and runtime isolation must revalidate, pinned Git transport trust must pass, and the source authority must occur on the unique protected authority lineage resolved through verified pack history. Failed or reversed exchanges do not enter that lineage.

The v1 readiness candidate differs only in `operationsCommit`. The source, candidate and closed value-free carry-forward report are fsync-backed no-replace publications; the canonical source is preserved before a dedicated `renameat2(RENAME_EXCHANGE)` operation atomically exchanges it with the exact commit-derived candidate slot. Unsafe metadata, a changed key pair, repository/host drift, semantic change, partial state, arbitrary paths, a failed exchange or uncertain post-exchange state fails closed. Implementation and execution remain separate gates. After a new pack containing this mechanism becomes authoritative, the exact next gate is `SEPARATELY_AUTHORIZED_GIT_AUTHENTICATION_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_CHAINED_ENVIRONMENT_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_FRESH_TRUSTED_ROLLBACK_CHECKOUT_AND_OFFLINE_NPM_CACHE_POPULATION_UNDER_<CURRENT_OPERATIONS_COMMIT>_AUTHORITY`.

Every Git command that opens a disposable checkout runs as the exact `phase-f1-build` owner. Root continues to validate protected filesystem metadata and publish protected evidence, but it does not open the build user's repository and does not add a `safe.directory` exception. `build-user-git.mjs` accepts only a canonical mode-`0750`, exact-owner checkout directly below `/var/www/builds`, executes `/usr/bin/git` through a fixed `sudo -u phase-f1-build -- env -i` argument vector, fixes `HOME`, `PATH` and all Git configuration inputs, disables optional locks, and rejects `-c`, `safe.directory`, `--git-dir`, `--work-tree` and config-environment injection. Shell guards use the equivalent committed same-owner read-only context. Clone/fetch retain the separately pinned Git transport and deploy-key contract; local inspection receives no SSH override or agent state.

Before a checkout is identity-verified, any command failure invokes the committed failed-checkout classifier. Cleanup accepts only a canonical, same-filesystem, mode-`0750`, `phase-f1-build`-owned invocation-shaped directory directly below `/var/www/builds`; it rejects mountpoints, symlink roots, active process references, live selector references, protected evidence, published handoff/identity state, wrong application identity or any arbitrary path. A detached `HEAD` alone is not trusted identity evidence and may exist in a `PARTIAL_UNTRUSTED` attempt; cleanup never opens that repository as root. The target is revalidated by device/inode immediately before guarded recursive removal, the build parent is fsynced, and a root-only value-free cleanup record is published without replacement. An identity-evidenced, handoff-published or ambiguous checkout is preserved for separate investigation and is never reused.

Build order is rollback first, forward second. Both builds use synthetic unreachable build values. Build-attempt state lives outside the checkout in the root-only deployment-state directory; it has a unique identifier and cannot be reused after consumption, failure, or completion. Nothing writes a lifecycle marker into the source tree. Source manifests are compared before install, after `npm ci`, and after build. The locked dependency tree receives its own before/after manifest, so a build cannot mutate installed Prisma engines, Sharp, esbuild, Next, or another runtime dependency before promotion.

Both Next.js 15.5.15 corrections set `experimental.isrFlushToDisk=false` and `cacheMaxMemorySize=52,428,800`. Artifact construction removes the complete build-only `.next/cache` tree before copying or promotion. Runtime-manifest creation and verification reject `cache`, `cache/fetch-cache`, and `cache/images`. Required `BUILD_ID`, `.next/server`, `.next/static`, manifests, dependencies, and public content remain. No generic writable Next cache directory is created. Complete runtime artifacts are root-owned and read-only; only proven persistent application paths are writable through canonical storage.

The complete forward-release and rollback-release manifests cover every regular file imported, executed, or served: role-specific `.runtime` trees, required `.next` output, locked runtime `node_modules`, package metadata, required server/source files, and immutable public assets. They also record each approved dependency symlink and the three canonical persistent-storage symlinks. Dependency links must resolve inside the sealed `node_modules`; persistent links must resolve to exact canonical roots. Substitution, a missing file, an unexpected executable or ignored input, or tampering anywhere in the reachable release fails verification.

Final artifact evidence records the role, application SHA, operations identity, externally approved operations-pack identity hash, `BUILD_ID`, source-tree identity, complete release digest, environment-readiness hash, database-identity hash, storage-manifest identity, systemd-unit identity, and rehearsal-evidence identity. `BUILD_ID` is never sufficient by itself.

## Pack installation and immutable service paths

The approved archive, approved installed-tree manifest, and standalone bootstrap each have externally recorded SHA-256 identities. System `sha256sum` verifies all three before archive code can run. The bootstrap inspects every member before extraction, rejects traversal, links, special files, missing/extra entries and content mismatches, and extracts only into a new protected staging directory. The manifest declares directories as `0555`, directly invoked shell scripts as `0555`, and Node/data/template files as `0444`. Setuid, setgid, group/world-writable objects, hard links, and unexpected executable modes fail. The complete staged tree is compared with the manifest before atomic publication and again immediately afterward.

The installation path is `/opt/thebusinesscircle/deployment-packs/<exact-40-hex-operations-commit>`. There is no `current` pack symlink. Unit templates render only after pack verification; every `ExecStart` and `ExecCondition` receives the exact commit-named directory. Unresolved placeholders, branch names, mutable selectors, or a mismatch between the executing pack and external identity fail. Rendered units are root-owned, protected, hashed, and bound into durable and artifact evidence.

### Atomic authoritative-identity exchange

The installed commit-named `atomic-identity-exchange.py` is the only approved primitive for replacing `/var/lib/thebusinesscircle/approved-phase-f1-pack.json` or reversing that replacement. No inline or improvised Python, shell `mv`, `cp`, redirection, ordinary rename, or overwrite-capable replacement is permitted. The utility calls the libc `renameat2` symbol with `AT_FDCWD` and `RENAME_EXCHANGE`; an unavailable symbol or filesystem operation fails closed without a raw-syscall-number or weaker-rename fallback.

The authority and exchange slot are root-owned, single-link, mode-`0600`, 851-byte regular files in the canonical `/var/lib/thebusinesscircle` directory and on its filesystem. The authority path is exact. The slot is `.approved-phase-f1-pack.exchange-<exact-operations-commit>.json`. The independently preserved historical file is root-owned, single-link, mode `0600`, 851 bytes, and located at `/var/lib/thebusinesscircle/phase-f1-identity-history/<historical-operations-commit>/approved-phase-f1-pack.json`. It is never used as a mutable selector.

Immediately before an authority switch, the operator must run the committed probe from the exact installed pack. The probe directory must be an approved new absent path on the target filesystem; the utility creates it, performs the forward and reverse `RENAME_EXCHANGE` operations over two synthetic 851-byte files, fsyncs and verifies each result, and removes only its verified files and empty directory after success:

```bash
test ! -e "/var/lib/thebusinesscircle/.phase-f1-identity-exchange-probe-${OPS_COMMIT}"
/usr/bin/python3 \
  "/opt/thebusinesscircle/deployment-packs/${OPS_COMMIT}/atomic-identity-exchange.py" \
  probe \
  --directory "/var/lib/thebusinesscircle/.phase-f1-identity-exchange-probe-${OPS_COMMIT}"
```

A skipped probe is not deployment evidence. Probe failure retains its synthetic evidence rather than recursively deleting uncertain state. Stop for inspection.

After the preserved history file and corrected exchange slot have been atomically published without overwrite and independently verified, the exact forward invocation is:

```bash
/usr/bin/python3 \
  "/opt/thebusinesscircle/deployment-packs/${OPS_COMMIT}/atomic-identity-exchange.py" \
  exchange \
  --authority /var/lib/thebusinesscircle/approved-phase-f1-pack.json \
  --exchange-slot "/var/lib/thebusinesscircle/.approved-phase-f1-pack.exchange-${OPS_COMMIT}.json" \
  --preserved-history "/var/lib/thebusinesscircle/phase-f1-identity-history/${HISTORICAL_OPS_COMMIT}/approved-phase-f1-pack.json" \
  --pre-authority-sha256 "${HISTORICAL_IDENTITY_SHA256}" \
  --pre-slot-sha256 "${CORRECTED_IDENTITY_SHA256}" \
  --preserved-history-sha256 "${HISTORICAL_IDENTITY_SHA256}" \
  --post-authority-sha256 "${CORRECTED_IDENTITY_SHA256}" \
  --post-slot-sha256 "${HISTORICAL_IDENTITY_SHA256}" \
  --expected-parent /var/lib/thebusinesscircle \
  --expected-size 851
```

The same installed utility is the only rollback implementation. After inspecting and proving the authority contains the corrected identity, the slot contains the historical identity, and the preserved history remains historical, the exact reverse invocation is:

```bash
/usr/bin/python3 \
  "/opt/thebusinesscircle/deployment-packs/${OPS_COMMIT}/atomic-identity-exchange.py" \
  exchange \
  --authority /var/lib/thebusinesscircle/approved-phase-f1-pack.json \
  --exchange-slot "/var/lib/thebusinesscircle/.approved-phase-f1-pack.exchange-${OPS_COMMIT}.json" \
  --preserved-history "/var/lib/thebusinesscircle/phase-f1-identity-history/${HISTORICAL_OPS_COMMIT}/approved-phase-f1-pack.json" \
  --pre-authority-sha256 "${CORRECTED_IDENTITY_SHA256}" \
  --pre-slot-sha256 "${HISTORICAL_IDENTITY_SHA256}" \
  --preserved-history-sha256 "${HISTORICAL_IDENTITY_SHA256}" \
  --post-authority-sha256 "${HISTORICAL_IDENTITY_SHA256}" \
  --post-slot-sha256 "${CORRECTED_IDENTITY_SHA256}" \
  --expected-parent /var/lib/thebusinesscircle \
  --expected-size 851
```

The caller supplies all four named identities only from the externally verified historical and corrected publication records. The utility repeats metadata and SHA-256 validation immediately before its single syscall, fsyncs the containing directory afterward, and verifies the complete post-exchange state without parsing or rewriting JSON. A precheck failure means no syscall was attempted. A syscall error records the errno name and number and is never retried with another primitive. `POST_EXCHANGE_VERIFICATION_FAILED exchange_may_have_occurred=true` means the state is uncertain: do not claim rollback, do not improvise another operation, and stop for protected inspection before separately approving the documented reverse exchange. Neither installed pack is removed during or after rollback.

### Deterministic six-file publication

`create-pack-artifact.mjs` refuses an existing output directory and publishes exactly six new single-link regular files: the archive, installed manifest, standalone bootstrap, approved identity, `EXTERNAL-SHA256SUMS`, and `PUBLICATION-SUMMARY-<exact-operations-commit>.txt`. It writes the five core files first without overwrite, reads their completed bytes back to calculate exact sizes and SHA-256 identities, parses the generated manifest and USTAR archive to derive their entry counts, renders the summary, and verifies the exact six-file directory before succeeding. A link, extra or missing filename, existing destination, malformed manifest or archive, identity mismatch, or manually supplied summary fails closed.

The summary schema is `phase-f1-publication-summary-v1`. Its UTF-8, no-BOM, LF-only rows have one final LF and a fixed order: schema, operations commit, forward SHA, rollback SHA, historical SHA, installed path, candidate schema/count/SHA-256, manifest total/file/directory counts, archive format/member count, then the five core output filename/size/SHA-256 records sorted by ordinal UTF-8 filename bytes. It contains no clock, workstation, operator, hostname, local path, environment, credential, or self-hash field. All inputs are immutable commit identities or generated core-file bytes, so checkout line-ending conversion and host metadata cannot affect it.

`EXTERNAL-SHA256SUMS` retains its four-row external bootstrap contract: archive, installed manifest, bootstrap, and approved identity. It does not checksum itself or the later summary. The summary independently records the completed checksum file's own size and SHA-256 alongside the other four core outputs; the summary's SHA-256 is calculated only after generation and remains external evidence to avoid circular content.

### Canonical candidate aggregate

Run `node ops/deploy/phase-f1/candidate-aggregate.mjs . HEAD c95b10d82d192c273812a40c2c9d1e9e73791b96` from the clean repository root. The command resolves `HEAD` and the approved operations base to immutable commit objects, requires the requested source commit to equal the clean workspace HEAD, and never reads a candidate file from the checkout. Pack creation calls the same committed implementation with the exact operations commit and base commit.

The candidate path set is the NUL-delimited `git diff --name-only --no-renames` result for the approved base-to-source commit range. It must contain changes beneath `ops/deploy/phase-f1/**`, this runbook, and `src/config/phase-f1-deployment-pack.test.ts`, with both boundary files present. Paths must be canonical non-absolute UTF-8 Git paths using `/`, may not contain empty, dot, parent-traversal, backslash, generated, environment, archive, dump, or log components, and may not repeat. Each selected path is resolved with `git ls-tree` in the exact source commit, must be a present `100644` or `100755` blob, and is read with `git cat-file blob`. Missing commits, missing blobs, deletions, renames, symlinks, Git links, unsupported modes, special objects, malformed paths, dirty workspaces, and source-HEAD substitutions fail closed.

Entries are sorted by ordinal UTF-8 path bytes. For each entry the aggregator hashes the exact committed blob bytes with SHA-256, emits `path<TAB>lowercase-blob-sha256<LF>` into an internal UTF-8 row sequence, counts the sorted rows, and SHA-256 hashes that exact row sequence. It performs no newline conversion or other content normalization. Filesystem timestamps, checkout modes, `core.autocrlf`, editor settings, OneDrive behavior, and LF/CRLF checkout transformations therefore cannot affect the result. Output is restricted to schema version, file count, and aggregate SHA-256; the enclosing approved identity binds that result to the same exact operations commit.

### Complete Nginx dependency snapshot

The Nginx backup recursively resolves the include graph and supported local file directives, expands globs deterministically, rejects unresolved, hard-linked, special, dynamic, or unclassified dependencies, and copies the exact closure into a root-only snapshot. Symlinks remain fail-closed except for one-hop links below `/etc/nginx/sites-enabled` to regular files below `/etc/nginx/sites-available`, and one-hop links below `/etc/nginx/modules-enabled` to regular files below `/usr/share/nginx/modules-available` or `/etc/nginx/modules-available`. Each accepted link has a canonical protected parent and a root-owned, single-link, non-writable target; its exact link text, link path, canonical target, target identity, content digest and reproduced snapshot topology are evidence-bound. Chains, cycles, traversal, missing targets, writable targets and every other link topology fail. Snapshot validation resolves the reproduced link only; exact restoration recreates the original target and original link text as one evidence-matched set.

Configuration, public certificates, private keys/secret material, immutable binary modules, and unsupported/runtime paths are classified separately. `load_module` is parsed apart from text includes. Relative module names use the Nginx module prefix (`/usr/lib/nginx` on the reviewed Ubuntu layout), and module binaries must resolve below `/usr/lib/nginx/modules` or `/usr/share/nginx/modules`. They are copied and hashed as raw bytes without UTF-8 decoding, newline conversion or template substitution; only the configuration's path token is rewritten to the snapshot binary. Mode, size, ownership expectation and source/snapshot identities are recorded. Public certificate fingerprints, SANs and expiry plus non-secret key-pair identities are evidence-bound; private material remains protected and is never printed. All captured references are rewritten to snapshot paths, and `nginx -t` runs against the extracted prefix. Restore must use the entire evidence-matched dependency set; piecemeal restoration is forbidden.

Runtime environment preparation requires an explicit canonical root-owned, mode-`0600`, single-link sanitised operator input. Historical dotenv files and PM2 environments are names-only legacy evidence, never value authorities, and are never copied wholesale. Only the committed allowlist can migrate. `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, `SEED_MODE`, `POSTGRES_DB`, and `POSTGRES_USER` are tooling-only and are absent from BCN, Circle Card, and build JSON; validation or seed work uses a separate short-lived protected tooling context. `DEMO_MEMBER_PASSWORD` and `RESEND_TEST_TO` are unsupported and never migrate.

The read-only preflight treats `pm2 jlist` solely as an internal value-safe input to the committed `preflight-pm2-report.mjs` normalizer. Raw PM2 JSON is held in memory, is never displayed or stored, and is discarded after one exact `businesscircle` record is reduced to the closed `name`, `pid`, and `status` schema. `pm2_env.args`, argv, command-line fields, raw PM2 records, and alternate command-line sources are excluded. Parse, schema, missing-application, and ambiguous-application failures emit fixed codes plus the expected safe application name only.

Historical dotenv reporting is restricted to the exact committed value-inspection allowlist derived from `environment-groups.cjs`. Parsed data is immediately projected onto that allowlist. Recognised tooling, legacy, unsupported, and runtime-fixed names are presence-only; unknown names contribute only to an aggregate names-only count. Their values are never retrieved from the parsed object, compared, classified as empty/placeholder/conflicting, hashed, fingerprinted, measured, or emitted. Before output, the complete report is validated against a closed schema containing only approved names, classifications, symbolic source identifiers, statuses, readiness metadata, and the unknown-name count. Approved sources are emitted only as `HISTORICAL_DOTENV` and `HISTORICAL_DOTENV_PRODUCTION`; literal source paths and rejected paths are never reflected.

The protected backup source is denied internally by the exact policy path `/var/www/The-Business-Circle.Net/.env.backup-20260720-164833`, but its filename, path, extension, timestamp and metadata are never output. Any attempted use emits only the fixed `PROTECTED_BACKUP_SOURCE_DENIED` issue code or the symbolic `PROTECTED_BACKUP_SOURCE` identifier. Git worktree status is passed as NUL-delimited input to the committed closed-schema summarizer and never prints changed paths. Operators must not manually inspect, reference, or troubleshoot the protected backup. The prior `ae6be06a2446e08cda8be099897dc7932f780a03` authority-switch attempt was automatically rolled back because the protected filename appeared in closed-schema output; that installed pack is inactive evidence and must never be made authoritative again.

The committed Git-blob proof schema is `phase-f1-value-free-preflight-static-proof-v2`. Version 2 adds the protected-source policy and Git-status summarizer blobs to the proof boundary and proves opaque denial, symbolic sources, fixed errors, non-reflection of rejected paths, closed Git-status output, and the absence of post-serialization replacement controls.

Manual `pm2 show`, `pm2 describe`, `pm2 env`, `pm2 jlist`, `pm2 prettylist`, `pm2 report`, `printenv`, dotenv `cat`/`grep`/`source`, shell environment dumps, and `/proc/*/environ` dumping remain prohibited. Only the exact committed preflight may invoke `pm2 jlist` and the two approved historical dotenv paths for its closed value-free report.

The protected authority is exactly `/etc/thebusinesscircle/bcn/runtime.env.json` (`root:bcn-app`, `0640`), `/etc/thebusinesscircle/circle-card/runtime.env.json` (`root:circle-card-app`, `0640`), and `/etc/thebusinesscircle/build/build.env.json` (`root:phase-f1-build`, `0640`). Each is staged with restrictive creation, complete-write verification, file `fsync`, exact ownership and mode, and atomic same-directory no-replace hard-link publication. The temporary link is removed immediately, each final file must be regular with link count one, parent directories are `fsync`ed, and any partial set is guardedly removed only when its device/inode identity still matches the invocation. Any existing target stops publication without overwrite.

Authoritative readiness validates all three protected JSON files, schema and permissions, required names, shared-value equality, runtime isolation, and exactly one complete Redis pair: either `UPSTASH_REDIS_REST_URL` plus `UPSTASH_REDIS_REST_TOKEN`, or `KV_REST_API_URL` plus `KV_REST_API_TOKEN`, never a partial pair or both pairs. BCN may receive an approved `BCN_COMMUNITY_AUTOMATION_ENABLED`; Circle Card never receives it and the Circle launcher fixes it to `false`. Circle Card must use a Resend API identity different from BCN. Missing names remain value-free hard gates.

The names `COMPOSE_APP_ENV_FILE`, `LIVEKIT_PORT`, `LIVEKIT_RTC_PORT_END`, `LIVEKIT_RTC_PORT_START`, `LIVEKIT_TCP_PORT`, `LIVEKIT_USE_EXTERNAL_IP`, `TURN_MAX_PORT`, `TURN_MIN_PORT`, `TURN_TLS_CA_FILE`, and `TURN_TLS_CIPHER_LIST` are legacy infrastructure metadata. `POSTGRES_DB` and `POSTGRES_USER` are legacy tooling-only. `NEXT_PUBLIC_LIVEKIT_URL` and `NEXT_PUBLIC_SITE_URL` are deliberately excluded legacy browser configuration. All fourteen may appear in the separately labelled legacy names-only report but never in protected runtime or build JSON. `/proc/<pid>/environ` verification compares names only and fails on any extra authority. Circle Card never receives BCN webhook, cron, inbound, membership, LiveKit, TURN or unrelated delivery credentials, and public billing mode remains a hard stop.

### Protected environment acquisition

The installed commit-named `environment-acquisition.mjs` is the only approved Phase F1 mechanism for comparing approved sources, collecting new operator values, and assembling the sanitised dotenv consumed by `prepare-environment.sh`. Ad hoc `cp`, `grep`, `cat`, `printenv`, `pm2 env`, shell exports, inline scripts, command-line values and manual dotenv construction are prohibited. The utility never accepts a source path, PID or variable value on its command line.

Set only these non-secret shell variables after installing the exact pack:

```bash
OPS_COMMIT=<exact-installed-operations-commit>
PACK="/opt/thebusinesscircle/deployment-packs/${OPS_COMMIT}"
PLAN="/var/lib/thebusinesscircle/deployment-state/phase-f1-environment-selection-${OPS_COMMIT}.json"
ACQUISITION_DIR="/run/thebusinesscircle/phase-f1-environment-${OPS_COMMIT}"
INPUT="${ACQUISITION_DIR}/operator-input.env"
```

The value-free selection plan schema is `phase-f1-environment-selection-plan-v1`. It is UTF-8 JSON at the exact commit-bound `PLAN` path, root-owned, mode `0600`, regular, single-link, and published without replacement by a separately reviewed non-secret state-publication step. Its top-level fields are exactly `schemaVersion`, `operationsCommit`, `decisions`, and `variables`. Decisions are exactly one Redis provider (`UPSTASH` or `KV`), BCN community automation (`ENABLED` or `DISABLED`), and LiveKit/realtime (`RETAINED` or `DISABLED`). Every variable entry contains only its name, exact scopes, source selector, required/optional status, feature-omission consequence, equality rule, separation rule, operator-entry status, and a narrowly defined generated decision. Values, encodings, fingerprints, hashes and lengths of values are forbidden.

#### Immutable selection-plan correction across operations commits

A validated plan is immutable evidence for the operations commit named in its path and `operationsCommit` field. It is never edited or replaced. When a narrowly reviewed source-authority correction requires a new operations pack, the new authoritative pack may use `correct-plan` to read the exact protected prior plan, verify its supplied SHA-256 and metadata, construct the approved correction in memory, and publish a new plan at `/var/lib/thebusinesscircle/deployment-state/phase-f1-environment-selection-${NEW_OPS_COMMIT}.json`. The old commit-bound plan remains byte-identical historical evidence at its original path; no duplicate history copy is made.

The committed correction identifiers are deliberately finite. `CLOUDINARY_REQUIRED_SHARED_SOURCE_TO_HISTORICAL_DOTENV_PRODUCTION` requires the prior decisions to be exactly `UPSTASH`, `DISABLED`, and `RETAINED`, and requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to select `LIVE_BCN_PROCESS`. It changes only the plan's `operationsCommit` and those three symbolic selectors to `HISTORICAL_DOTENV_PRODUCTION`.

`UPSTASH_REQUIRED_SHARED_SOURCE_TO_HISTORICAL_DOTENV_PRODUCTION` is a separate, atomic pair correction. It is authorised only after the value-free source-decision gate establishes that the live Upstash pair is unusable, the general historical pair is absent, and the production historical pair is complete. The correction requires the locked `UPSTASH`, `DISABLED`, and `RETAINED` decisions, requires both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to select `LIVE_BCN_PROCESS`, and requires the KV pair to remain unselected. It changes both Upstash selectors together to `HISTORICAL_DOTENV_PRODUCTION`; a partial pair, different target, KV change, combined correction, or unrelated change is unsupported and fails closed. Source inspection remains a separate committed value-free gate, so `correct-plan` neither reads nor duplicates protected-source values.

Neither correction accepts a plan body, source path, selector, environment name, or value from the command line. No Cloudinary or Upstash value is inspected, copied, hashed, measured, or recorded by plan correction.

Install and independently verify the new pack, then atomically make that pack authoritative before using its correction mode. With the old plan still verified and the new plan/report paths absent, run only the installed authoritative utility:

```bash
PRIOR_OPS_COMMIT=<exact-prior-operations-commit>
PRIOR_PLAN_SHA256=<exact-prior-plan-sha256>
OPS_COMMIT=<exact-new-authoritative-operations-commit>
PACK="/opt/thebusinesscircle/deployment-packs/${OPS_COMMIT}"

env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PACK}/environment-acquisition.mjs" correct-plan \
  --prior-operations-commit "${PRIOR_OPS_COMMIT}" \
  --prior-plan-sha256 "${PRIOR_PLAN_SHA256}" \
  --operations-commit "${OPS_COMMIT}" \
  --correction CLOUDINARY_REQUIRED_SHARED_SOURCE_TO_HISTORICAL_DOTENV_PRODUCTION
```

For the separately reviewed Upstash pair correction, the invocation is identical except for the fixed correction identifier:

```bash
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PACK}/environment-acquisition.mjs" correct-plan \
  --prior-operations-commit "${PRIOR_OPS_COMMIT}" \
  --prior-plan-sha256 "${PRIOR_PLAN_SHA256}" \
  --operations-commit "${OPS_COMMIT}" \
  --correction UPSTASH_REQUIRED_SHARED_SOURCE_TO_HISTORICAL_DOTENV_PRODUCTION
```

Production correction requires Linux root, the exact installed utility path, the matching authoritative identity, a canonical root-owned mode-`0700` deployment-state directory, and a canonical root-owned mode-`0600` regular single-link prior plan. The new plan and its `phase-f1-environment-selection-correction-${OPS_COMMIT}.json` value-free evidence object are published together through the committed fsync-backed no-replace primitive. Any existing target, identity drift, metadata drift, unsupported correction, changed locked decision, changed prior selector, partial write, failed readback, or failed parse stops without replacing either target. The evidence records identities, symbolic selectors, affected variable names, `originalPreserved=true`, and `valuesRecorded=false` only.

After publication, independently verify the original plan identity, the new plan identity and metadata, then run `validate-plan` and `inspect` against the new commit-bound plan before a separately authorised acquisition retry. The local implementation/republication gate creates only source, tests, one operations commit, and a deterministic six-file publication; it does not install a server pack, switch authority, create a production plan, or retry acquisition.

#### Identity-only selection-plan carry-forward

An operations-only authority change does not make commit-bound acquisition evidence reusable. When a prior plan is already semantically correct, a separately authorised gate may use the explicit `carry-forward-plan` mode after installing and atomically making the new pack authoritative. This mode accepts only the exact prior commit, exact prior plan SHA-256, exact new authoritative commit, and the fixed `IDENTITY_ONLY_SELECTION_PLAN_CARRY_FORWARD` identifier. It does not accept a plan body, variable name, selector, patch, source path, or environment value.

The utility reads the prior plan only from its exact commit-derived protected path, validates its schema and protected metadata, constructs a new plan in memory, and changes only `operationsCommit`. It classifies the result as `IDENTITY_ONLY` only when decisions, variable inventory and order, scopes, selectors, required flags, omission behavior, equality and separation rules, operator-entry flags, and generated decisions are exactly preserved. Any parse failure or other delta is `UNEXPECTED_SEMANTIC_DELTA` and fails closed. Cloudinary or Upstash correction identifiers cannot be combined with carry-forward.

With the prior plan verified and both new targets absent, invoke only the installed authoritative utility:

```bash
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PACK}/environment-acquisition.mjs" carry-forward-plan \
  --prior-operations-commit "${PRIOR_OPS_COMMIT}" \
  --prior-plan-sha256 "${PRIOR_PLAN_SHA256}" \
  --operations-commit "${OPS_COMMIT}" \
  --carry-forward IDENTITY_ONLY_SELECTION_PLAN_CARRY_FORWARD
```

The new plan and `phase-f1-environment-selection-carry-forward-${OPS_COMMIT}.json` value-free evidence are published together by the fsync-backed no-replace set primitive. The evidence records only plan identities, operations identities, `semanticDelta=IDENTITY_ONLY`, `originalPreserved=true`, and `valuesRecorded=false`. The original plan remains byte-identical. Existing acquisition input and reports remain bound to their original operations commit and are never copied, renamed, relabelled, or reused; a fresh acquisition under the new authority is required after `validate-plan` and `inspect` pass.

The only selectors are `LIVE_BCN_PROCESS`, `HISTORICAL_DOTENV`, `HISTORICAL_DOTENV_PRODUCTION`, `SECURE_OPERATOR_ENTRY`, `GENERATED_NON_SECRET_DECISION`, and `OMIT`. The two approved historical paths remain fixed internal configuration and neither is automatically authoritative. The protected-backup policy remains a fail-closed internal comparison whose rejected input is never reflected. Historical sources must be canonical, non-linked, root-owned, mode `0600`, regular and single-link. Parsing uses the same Node `util.parseEnv` contract as preparation, retains only allowlisted names, and never prints source content.

`LIVE_BCN_PROCESS` is restricted to the committed safe-live allowlist. The utility invokes only `pm2 pid businesscircle`, never `pm2 jlist` or `pm2 env`, to obtain one online application PID without materialising PM2 environment metadata. It verifies the parent PM2 daemon, resolves the unique descendant Next process, proves that process owns the sole port-3000 listener, and requires Node executable identities for the daemon, application and Next process. It resolves PIDs at execution time and has no PID override. It reads `/proc/<verified-application-pid>/environ` internally, retains only individually selected allowlisted names, clears its mutable scan buffer, and never prints the environment. Reports contain only presence and equality classifications against the two historical sources; they never contain values, hashes, prefixes or lengths.

Run the value-free gates first:

```bash
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PACK}/environment-acquisition.mjs" validate-plan \
  --plan "${PLAN}" \
  --operations-commit "${OPS_COMMIT}"

env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PACK}/environment-acquisition.mjs" inspect \
  --plan "${PLAN}" \
  --operations-commit "${OPS_COMMIT}"
```

`inspect` prints names, verified process metadata and the committed classifications only. Review the plan again whenever a selected live name is absent, either historical source differs, the PM2/Next/listener tree is ambiguous, or a feature decision differs from the currently effective behavior.

Acquisition is interactive and must run from a real controlling terminal:

```bash
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PACK}/environment-acquisition.mjs" acquire \
  --plan "${PLAN}" \
  --operations-commit "${OPS_COMMIT}"
```

The utility refuses redirected/non-TTY entry. It opens `/dev/tty`, disables echo, prompts with variable names only, requires confirmation for provider-issued secrets, and restores terminal echo after success or failure. It accepts no value from arguments or environment variables. Circle Card's sending address must use `circlecard.co.uk`, and its Resend API key must remain distinct from BCN's.

Acquisition hard-stops unless canonical `/run` is tmpfs. It creates or verifies root-owned mode-`0700` `/run/thebusinesscircle`, then exclusively creates the absent commit-bound acquisition directory with the same metadata. `operator-input.env` is root-owned, mode `0600`, regular, single-link, and published without replacement using complete-write verification, file and directory `fsync`, and post-publication byte checks. The dotenv has ordinal UTF-8 variable ordering, one occurrence per name, exact Node parse round-trip, and no source comments. NUL, controls, multiline values, unrepresentable quoting, fixed names, tooling names, legacy names and unsupported names fail before final input publication.

The utility also creates the value-free, root-owned, mode-`0600`, no-replace report `/var/lib/thebusinesscircle/deployment-state/phase-f1-environment-acquisition-${OPS_COMMIT}.json`. It records the operations commit, non-secret plan SHA-256, selected names and selectors, comparison classifications, Redis and feature decisions, operator-entered names, input path/ownership/mode/link type, and validation status. It contains no input size because that could disclose aggregate value lengths.

Validate the completed input without printing values:

```bash
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PACK}/environment-acquisition.mjs" verify-input \
  --plan "${PLAN}" \
  --operations-commit "${OPS_COMMIT}"
```

Only after `verify-input` passes may the existing publisher run separately:

```bash
/usr/bin/bash "${PACK}/prepare-environment.sh" \
  b43a1e4e708bc9f02ef83bd63dab1db1f366b32e \
  "${INPUT}"
```

Then run the explicit environment-only validator:

```bash
/usr/bin/bash "${PACK}/validate-environments.sh" \
  b43a1e4e708bc9f02ef83bd63dab1db1f366b32e
```

This command validates the BCN, Circle Card and build protected-file schemas, required names, policies, shared-value contract, Redis exclusivity, Circle Card Resend separation and cross-user read isolation. It publishes root-owned mode-`0600` `environment-readiness.json` without replacement. The closed `phase-f1-environment-readiness-v1` record is bound to the current operations commit and all three approved application identities. Its authority is `protected-environment-only`, `valuesRecorded` is false, and `releaseIntegrity` is exactly `NOT_EVALUATED`. It neither reads nor requires the forward release, rollback release, release manifests, artifact root or current release selectors, and it creates no application artifact.

The corrected order is mandatory:

1. acquire and verify the commit-bound protected input;
2. publish the three protected environments;
3. run `validate-environments.sh` and publish environment-only readiness;
4. prepare the approved rollback checkout, populate and seal the approved offline npm cache in a separately authorised network-enabled gate, prepare the rollback artifact, and build the approved immutable forward release using the validated build environment;
5. require complete forward and rollback release integrity;
6. run `preflight-read-only.sh`, which now requires both current environment readiness and complete release integrity and performs the release-bound BCN and Circle Card application validators;
7. proceed to candidate probes, service starts, selector transitions or traffic evidence only while both gates continue to pass.

`require_environment_ready` independently revalidates the readiness file metadata, operations/application identities, current protected schemas and cross-user isolation. A readiness file from another operations commit is rejected. Build preparation requires this readiness but does not require its own not-yet-created release. Complete release integrity remains mandatory after both releases exist and at every full preflight, candidate/start, selector and traffic gate. There is no caller-controlled skip/bypass mode.

#### Identity-only environment-readiness carry-forward

Environment-readiness remains stale after every operations-authority transition unless a separately authorised gate invokes the explicit `carry-forward` operation with `IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD`. The operation accepts only the fixed protected state root, the exact value-free source-readiness SHA-256, the exact approved source authority, the exact recorded intermediate predecessor, the current authoritative operations commit and the fixed identifier. It accepts no source path, destination path, JSON patch, semantic field, environment value or bypass.

The source `phase-f1-environment-readiness-v1` record is first validated under its original trusted pack. The current authority and every exact lineage pack are independently checked against protected authority-history identities. Protected BCN, Circle Card and build schemas plus cross-user isolation are revalidated before and after publication. The candidate keeps the v1 schema and differs only in `operationsCommit`; application identities, authority, readiness, all closed validation states, `releaseIntegrity=NOT_EVALUATED` and `valuesRecorded=false` remain identical.

The prior readiness, candidate exchange slot and closed `phase-f1-environment-readiness-carry-forward-report-v1` lineage report are published together through the fsync-backed no-replace set. A dedicated `renameat2(RENAME_EXCHANGE)` operation then exchanges only the canonical readiness authority and the exact commit-derived slot on the protected state filesystem. The prior evidence remains independently preserved, the report records only value-free evidence identities and exact lineage, and post-exchange verification revalidates both records and the live protected-environment policy. Missing or unsafe evidence, ambiguous lineage, semantic drift, partial state, path injection, a failed exchange primitive or any post-exchange uncertainty fails closed; no weaker rename fallback exists.

Implementation and execution are separate gates. After a new pack containing this mechanism becomes authoritative, the exact next authorised sequence is `SEPARATELY_AUTHORIZED_ENVIRONMENT_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_OFFLINE_NPM_CACHE_PREPARATION`, followed by the immutable application artifact build retry only after cache readiness passes.

An authority-only correction made after the first readiness carry-forward uses the separate, explicit `carry-forward-chained` operation with `CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD`. It is not a historical lookup or a generic evidence rebinder. The caller supplies only the fixed state root, the exact current readiness SHA-256, the current installed authority and the fixed identifier; it cannot supply a source authority, lineage, history path, exchange path, readiness body, output path or mutation. The source authority is taken only from the protected canonical readiness record after its closed schema has validated.

The chained operation resolves the complete authority sequence backwards from the exact canonical current authority to the fixed original readiness trust anchor. It follows only the predecessor identity stored in each successor-derived protected authority-exchange slot. Every derived predecessor must exist at its exact root-owned mode-`0600` history path, be byte-identical to that slot, and pass its own installed pack's integrity verifier; the final target identity must be the canonical authority. A bounded, unique, cycle-free chain is required. This final slot-state rule excludes a failed or reversed exchange: only the later successful final transition leaves the verified predecessor in the successor slot. Missing, reordered, invented, forked or ambiguous generations fail closed.

The canonical source readiness must validate as `PASSED` under the authority embedded in that evidence. That authority must occur exactly in the resolved protected chain. Its protected direct or chained carry-forward report must bind the exact source readiness identity and match the corresponding prefix of the resolved authority chain back to the original readiness trust anchor. Protected environment schemas and cross-user isolation are revalidated before and after publication. The readiness v1 record still changes only `operationsCommit`; the closed chained report adds only evidence identities and the verified operations lineage, remains value-free, and is published through the existing fsync-backed no-replace set plus exact readiness exchange.

Implementation and execution remain separate gates. After a new pack containing the chained mechanism becomes authoritative, the exact next gate is `SEPARATELY_AUTHORIZED_CHAINED_ENVIRONMENT_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_FRESH_TRUSTED_ROLLBACK_CHECKOUT_AND_OFFLINE_NPM_CACHE_POPULATION_UNDER_<CURRENT_OPERATIONS_COMMIT>_AUTHORITY`. It carries readiness forward first, creates a new checkout path using the pinned Git transport trust, and only then populates and verifies the dedicated offline cache. It does not reuse a failed checkout.

#### Reviewed rollback-application identity transition

The reviewed rollback application correction changes the approved rollback identity from
`5d1f81bb05a01b08e1134785c2f86b77c8969fe3` to
`8db8236c16ebb5a02ec5b90f7e5308008cff7086`. Both candidates have the exact historical parent
`5fa2bbf6ac7d39aa14636882bbae2d2713faf11a`. Before the operations pack is published,
`application-identities.mjs review-rollback-transition <repository>` proves that the transition
modifies only `src/config/rollback-immutable-runtime-cache.test.ts`, replaces exactly the two
reviewed relative mocked-font WOFF2 URLs with their fixed absolute `fonts.gstatic.com` mock URLs,
and preserves the exact `package.json` and `package-lock.json` blobs. Any other parent, file,
blob, line, dependency or caller-selected application identity fails closed.

This is not an operations-authority-only transition. Ordinary direct and chained environment
readiness carry-forward continue to reject the changed rollback application identity. After the
new operations pack becomes authoritative and Git-authentication readiness has been carried
forward, a separately authorised execution invokes only:

```bash
/usr/bin/node "${PACK}/environment-application-readiness-transition.mjs" \
  transition-rollback-application \
  "${SOURCE_ENVIRONMENT_READINESS_SHA256}" \
  "${OPS_COMMIT}" \
  REVIEWED_ROLLBACK_APPLICATION_IDENTITY_ENVIRONMENT_READINESS_TRANSITION
```

The source must be the exact protected canonical readiness object from operations authority
`c10abd77ceca632d206b83bcdae3cf8b7db3c9df`, and that authority must occur on the unique verified
protected lineage to the current authority. The source validates only with the previous rollback
identity; the candidate validates only with the new reviewed identity. Forward and historical
application identities, readiness state, all closed environment-validation results and
`releaseIntegrity=NOT_EVALUATED` remain identical. Protected BCN, Circle Card and build schemas
plus cross-user isolation are revalidated before publication, immediately before exchange and
after exchange. The prior readiness bytes are preserved, and the closed value-free transition
report and exact exchange slot are published with fsync-backed no-replace semantics before the
dedicated atomic readiness exchange. Protected selection and acquisition evidence is not edited,
copied or relabelled by this transition.

The transition invokes the atomic helper's existing exact `readiness-exchange` mode. The
unsupported `environment-readiness-exchange` spelling is not a parser mode and must never be
used; focused contract coverage binds the Node transition launcher to the Python helper parser.

Compare the live PM2/BCN/Next/listener/Nginx/PostgreSQL/systemd baseline after each separately authorised gate. Do not destroy the input if preparation fails, publication is partial or uncertain, environment-only validation fails, release integrity fails, full preflight fails, or live state changes. Preserve the root-only tmpfs evidence for separately approved recovery; a reboot also clears `/run`.

After protected publication and environment-only readiness are conclusively `VERIFIED`, both releases pass integrity, full preflight is conclusively `PASSED`, and the protected-readiness reader independently returns ready, unlink the input:

```bash
env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin \
  /usr/bin/node "${PACK}/environment-acquisition.mjs" destroy-input \
  --plan "${PLAN}" \
  --operations-commit "${OPS_COMMIT}" \
  --publication-status VERIFIED \
  --preflight-status PASSED
```

Destruction revalidates the exact invocation-owned input path, root ownership, mode `0600`, regular type, link count one, `/run` tmpfs, plan-bound names and protected JSON readiness. It refuses unexpected acquisition-directory entries, unlinks only the exact file, `fsync`s the directory, removes only the now-empty invocation directory, `fsync`s its parent, and verifies absence. This is unlinking from tmpfs, not a claim of cryptographic secure erasure.

Acquisition plans, inputs and reports remain operations-commit-bound. Installing an ordering-only operations generation does not relabel, copy or implicitly carry forward an acquisition created under an earlier authority. Unless a separately committed carry-forward mechanism explicitly verifies that transition, switch authority first and perform a fresh protected acquisition under the new commit before publishing environments.

BCN automation `DISABLED` generates only the committed `false` value and requires automation conditionals to be absent or explicitly omitted. `ENABLED` requires an explicit selected source for every committed conditional. Circle Card remains launcher-fixed to `false`. LiveKit `DISABLED` omits its optional credential/server trio while retaining any independently required base URL; `RETAINED` requires all three explicit selections. Exactly one complete Redis pair is accepted, both runtimes receive the same pair, the unused pair is absent, and there is no provider alias conversion.

## Rollback provenance and proof

Rollback checkout preparation publishes exactly one handoff object:
`/var/lib/thebusinesscircle/deployment-state/rollback-build-attempt.json`. The closed
`phase-f1-build-attempt-v2` record binds the rollback application SHA, current operations
commit, random attempt identity, canonical `/var/www/builds/rollback-<sha>-*` checkout and
single-use state. `prepare-rollback-fixture.sh` first inspects and then consumes that exact
protected JSON through `build-state.mjs`; no `.path` compatibility object, caller-selected
checkout path or second authority exists. Missing, stale, linked, malformed, wrong-commit or
wrong-operations evidence fails closed.

An operations-authority-only transition never overwrites or silently deletes the prior
canonical rollback application identity and prepared build-attempt evidence. The dedicated
`retire-stale-rollback-evidence.sh` operation accepts only their two exact SHA-256 identities;
source and destination paths, source authority, application SHA, attempt identity and evidence
types are not caller-selectable. `rollback-evidence-retirement.mjs` reads only the two fixed
canonical paths, validates the closed rollback application-identity structure and
`phase-f1-build-attempt-v2` schema, re-verifies the exact clean rollback checkout as the build
user, and proves the source operations commit is a genuine predecessor on the protected
authority lineage. Current-authority, malformed, unsafe, linked, mismatched, active,
selector-referenced, mounted or built workspaces fail closed.

Retirement is a crash-safe logical pair operation. A root-owned mode-`0600` no-replace intent
is published first. Byte-identical application-identity and build-attempt histories are then
published at deterministic `preserved-<source-operations-commit>-<attempt-id>` names and
fsync-verified. Only after both histories match the exact approved input identities are the
two canonical sources unlinked with inode rechecks and state-root fsyncs. A final value-free
no-replace report is published only when both canonical slots are absent and both histories
remain verified. The protected intent makes an interruption after either unlink safely
resumable; conflicting history, a report with a reappearing canonical source, or any byte
drift fails closed. The old checkout itself remains immutable audit state and is never reused.

Implementation and execution are separate gates. After a new pack containing this mechanism
becomes authoritative, the exact next gate is
`SEPARATELY_AUTHORIZED_GIT_AUTHENTICATION_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_CHAINED_ENVIRONMENT_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_STALE_TRUSTED_ROLLBACK_EVIDENCE_RETIREMENT_AND_FRESH_TRUSTED_ROLLBACK_CHECKOUT_AND_OFFLINE_NPM_CACHE_POPULATION_UNDER_<CURRENT_OPERATIONS_COMMIT>_AUTHORITY`.

The rollback dependency build uses only the fixed cache
`/var/cache/thebusinesscircle/phase-f1/npm-offline-v1`. It never accepts an inherited or
caller-selected cache root and never relies on `/root/.npm`. Cache population is a distinct,
separately authorised network-enabled operation:

```bash
/usr/bin/bash "${PACK}/prepare-offline-npm-cache.sh" \
  8db8236c16ebb5a02ec5b90f7e5308008cff7086
```

That operation requires the current prepared rollback attempt without consuming it, exact
Node `22.22.2` and npm `10.9.7`, the committed rollback lockfile, the public npm registry and
the validated protected-environment readiness gate. It populates a new promotion directory,
removes the disposable `node_modules`, seals every cache directory root-owned
`root:phase-f1-build` mode `0550` and every file mode `0440`, atomically publishes the cache,
and publishes root-owned mode-`0600`
`offline-npm-cache-readiness.json` without replacement. Runtime users receive no cache group
authority. The value-free readiness record binds the operations commit, rollback application,
exact lockfile, exact Node/npm versions and complete immutable cache inventory.

Every Phase F1 npm invocation runs under `env -i` and binds npm's user and global
configuration to the two distinct committed empty files in `npm-config/`. The installed-pack
manifest fixes those files as root-owned, single-link, mode-`0444` immutable objects beneath
the root-owned mode-`0555` pack. `npm-configuration.mjs` rejects a collision, link, extra
object, non-empty content, unsafe metadata or caller-selected path before npm starts. This
keeps npm 10.9.7 from reading an ambient home/global `.npmrc` without assigning both config
layers to the same `/dev/null` path.

`offline-npm-cache.mjs` independently proves that every public-registry `sha512` integrity in
the exact committed rollback lockfile that is required for the approved Linux/x64/glibc target
has matching content in npm's content-addressable cache. The classifier implements npm 10.9.7's
positive and negative `os`, `cpu` and `libc` list semantics. A missing integrity is excluded only
when every lockfile entry sharing it is explicitly `optional`, has valid structured platform
constraints, and those constraints prove it inapplicable to the approved target. An optional
entry without constraints, an optional entry applicable to Linux/x64/glibc, every non-optional
entry, malformed metadata, an unavailable target platform, or a missing required integrity fails
closed. Readiness schema `phase-f1-offline-npm-cache-readiness-v2` records only value-free target,
total, required, present-required, missing-required and optional-inapplicable counts.

Static cache completeness is never sufficient by itself. Both fresh population and sealed-cache
recovery run a second `npm ci --offline --ignore-scripts` in the exact non-release rollback
checkout with the two immutable npm configuration sources and the fixed cache. Disposable
`node_modules` is guardedly removed and the checkout must return to its exact clean Git identity
before `publish-after-offline-verification` may create readiness evidence.

A cache sealed by the trusted population mechanism but left without readiness evidence may be
re-evaluated only by `reverify-sealed-offline-npm-cache.sh`. The wrapper accepts only the exact
rollback SHA and derives every path. It requires current Git-auth/environment authority through
the checkout contract, a current prepared rollback attempt, exact Node/npm and target platform,
an absent readiness file, no promotion residue, no disposable dependency or build output, no
build-user npm process, exact root/build-group `0550`/`0440` cache metadata, runtime-user mutation
isolation and complete required-target integrities. It records the sealed cache inventory before
and after the offline install and refuses publication if any byte identity changes. Arbitrary
cache paths, current READY evidence, unsafe metadata, an active writer, stale handoff or any
missing target-required artifact cannot enter the recovery path. Eligibility is additionally
bound to exactly one protected failed-preparation log whose operations commit and pack hashes
validate within the protected authority lineage; safe cache metadata alone is not provenance.
The production cache remains sealed and unchanged during implementation-only republication.

After a pack containing this correction becomes authoritative, the exact next gate is
`SEPARATELY_AUTHORIZED_GIT_AUTHENTICATION_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_CHAINED_ENVIRONMENT_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_STALE_TRUSTED_ROLLBACK_EVIDENCE_RETIREMENT_AND_FRESH_TRUSTED_ROLLBACK_CHECKOUT_AND_SEALED_OFFLINE_NPM_CACHE_REVERIFICATION_UNDER_<CURRENT_OPERATIONS_COMMIT>_AUTHORITY`.

An existing `READY` cache is not eligible for the `SEALED_NOT_READY` recovery path and remains
stale after an operations-authority transition by default. It may be rebound only through
`offline-npm-cache.mjs carry-forward-ready`, using the exact protected canonical READY evidence
SHA-256, the approved rollback workspace, the current operations commit and the fixed
`IDENTITY_ONLY_OFFLINE_NPM_CACHE_READY_EVIDENCE_CARRY_FORWARD` identifier. The cache root,
evidence paths, destination, source authority and lineage cannot be caller-selected.

The mechanism resolves and verifies every protected operations-authority hop, requires the source
authority on that unique lineage, validates the source evidence under its trusted installed pack,
and re-creates both source- and current-authority READY records from the live sealed cache. This
re-hashes the complete cache inventory and required package integrities; revalidates the exact
rollback commit and lockfile, Linux/x64/glibc classifier, Node/npm contract, completeness counts,
clean disposable workspace, absent writer and promotion residue, build-user read/non-write policy,
and BCN/Circle Card mutation isolation; and requires current Git-authentication and environment
readiness. The prior successful offline-resolution proof is reusable only when every other READY
semantic field remains byte-for-byte equivalent. Any delta other than `operationsCommit` is
`UNEXPECTED_SEMANTIC_DELTA` and fails closed. No package is fetched or removed and no cache byte,
mode, ownership or seal metadata is changed.

The canonical stale evidence, current-authority candidate and closed value-free carry-forward
report are published as one fsync-backed no-replace set. The original is preserved at the exact
source-commit-derived history path before the dedicated
`offline-npm-cache-readiness-exchange` mode performs `renameat2(RENAME_EXCHANGE)` with the exact
current-commit-derived slot. Source, preserved copy, candidate, report, cache inventory and access
policy are verified around the exchange. Partial state, unsafe metadata, a linked path, wrong
identity or size, failed exchange or uncertain post-exchange state fails closed. Implementation
and production execution remain separate gates.

When READY evidence is bound to the previous reviewed rollback application identity, ordinary
READY carry-forward also rejects the application change. After the protected environment
application transition passes, the separately authorised cache transition is invoked only as:

```bash
/usr/bin/node "${PACK}/offline-npm-cache-application-transition.mjs" \
  transition-ready-rollback-application \
  "${SOURCE_OFFLINE_CACHE_READINESS_SHA256}" \
  "${OPS_COMMIT}" \
  REVIEWED_ROLLBACK_APPLICATION_IDENTITY_OFFLINE_CACHE_READY_TRANSITION
```

No workspace, cache path, lockfile, source authority, lineage or application identity is caller
selectable. The exact source READY object must be the protected canonical evidence from
`c10abd77ceca632d206b83bcdae3cf8b7db3c9df`; the candidate changes only operations authority and
the reviewed rollback identity. Because the reviewed application transition proves that the
package and lockfile Git blobs are unchanged, the original offline-resolution proof remains valid
only if the sealed cache inventory and file count are still exact. The operation re-hashes the
complete sealed cache inventory, verifies exact Node/npm versions, safe cache metadata, no active
writer or promotion residue, build-user read/non-write policy and runtime-user mutation isolation.
It does not install, remove or fetch packages. Lockfile identity, platform classifier, all
integrity counts including missing-required zero, offline-resolution state and every other READY
semantic field remain byte-identical. The source bytes, candidate and closed value-free report use
the same protected no-replace plus atomic exchange lifecycle as READY carry-forward.

The preserved failed rollback attempt and its nonempty partial fixture residue are audit state and
are not recovered by either application transition. Recovery remains a later explicit operation
under the current pack.

After a pack containing this mechanism becomes authoritative, the exact next gate is
`SEPARATELY_AUTHORIZED_GIT_AUTHENTICATION_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_ROLLBACK_APPLICATION_IDENTITY_BOUND_ENVIRONMENT_READINESS_PROTECTED_TRANSITION_AND_OFFLINE_NPM_CACHE_READY_EVIDENCE_PROTECTED_TRANSITION_AND_FAILED_ROLLBACK_BUILD_ATTEMPT_PROTECTED_RECOVERY_AND_FRESH_TRUSTED_ROLLBACK_CHECKOUT_AT_8db8236c16ebb5a02ec5b90f7e5308008cff7086_AND_IMMUTABLE_BUILD_ONLY_ROLLBACK_REFERENCE_BCN_AND_INDEPENDENT_CIRCLE_CARD_ARTIFACT_PREPARATION_PUBLICATION_AND_RELEASE_INTEGRITY_VERIFICATION_WITHOUT_SELECTOR_PUBLICATION_OR_CANDIDATE_START_UNDER_<CURRENT_OPERATIONS_COMMIT>_AUTHORITY`.

The rollback fixture refuses to consume the build attempt unless that current-authority
readiness evidence verifies. Its outer dependency install explicitly runs
`npm ci --include=dev --offline --no-audit --no-fund`, so every build-required locked
devDependency is present without relying on ambient `NODE_ENV` or npm omit defaults. Cache
population is not implicit in checkout or build and must never be run without its separate
network-authorisation gate.

The Phase E3 fixture deliberately constructs its inner build environment with
`NODE_ENV=production`, but dependency installation and application build are separate closed
commands. Inside the ephemeral mount/network namespace, the privileged launcher mounts a
private tmpfs over `/usr/local/bin`, installs only a root-owned fixed npm shim plus its immutable
command helper, and remounts that command directory read-only. The build-user fixture can invoke
only the exact application-owned `npm ci --offline --no-audit --no-fund` and `npm run build`
requests. The shim maps the former to npm 10.9.7 with fixed `--include=dev`, fixed READY cache and
offline policy; the latter retains `NODE_ENV=production` and receives no install-phase include
option. Caller `production`, `omit` or `include` npm policy, arbitrary commands, alternate cache
and registry fallback fail closed. The tmpfs and shim disappear with the namespace and do not
alter host command paths or application source identity.

Immutable artifact construction and selector publication are separate operations. Forward
dependency installation is performed only by `offline-npm-install.mjs`. It derives the fixed
sealed READY cache `/var/cache/thebusinesscircle/phase-f1/npm-offline-v1` from committed code,
revalidates its current-authority READY evidence against the exact forward lockfile, runs exactly
one scrubbed `npm ci --include=dev --offline --no-audit --no-fund`, and redundantly sets
`NPM_CONFIG_OFFLINE=true` plus the fixed `NPM_CONFIG_INCLUDE=dev`. The install process is separate
from both role-specific production builds, so its include policy cannot become runtime authority.
The trusted distinct empty user/global npm configuration sources are
fixed by the installed pack. Callers cannot select a cache, registry, config source or offline
mode; a missing cache object fails the one invocation without a registry retry.

The forward release uses a closed `bcn`/`circle-card` build-role model. Both roles are bound to
the exact same forward source commit, but `build-command.mjs` creates their fixed brand, public
origin and auth-origin environment internally. It invokes the Next build separately for BCN and
Circle Card, removes each disposable build cache, and publishes that role's output directly to
`.runtime/bcn` or `.runtime/circle-card`. A BCN `.next` tree is never copied into the Circle Card
runtime. Role provenance inside each runtime binds the application SHA, operations authority,
brand, origin and that invocation's `BUILD_ID`; equal role output identity fails closed.

The rollback command verifies and publishes the exact rollback release and protected
`rollback-build-only-artifact.json` without creating `current-bcn-rollback-probe`. The forward
build publishes separate `bcn-build-only-artifact.json` and
`circle-card-build-only-artifact.json` records. `build-release-integrity.mjs` directly verifies
the role runtime inventory, complete shared immutable release, embedded role provenance, fixed
brand/origin identity, protected-value exclusion, distinct cross-role artifact identity and the
absence of selectors. A BCN artifact cannot validate as Circle Card or vice versa. These checks
are build-time standalone evidence only; runtime independence remains for the later candidate
preflight. All records are current-authority-bound, value-free, no-replace evidence with
`releaseIntegrity=PASS` and `selectorsPublished=false`.

Selector publication is available only through `publish-candidate-selector.sh`, accepts only
`rollback-probe` with the exact rollback SHA or `circle-card` with the exact forward SHA, requires
current environment readiness and complete release integrity, and directly validates the matching
protected build-only evidence. Its fixed selector and artifact paths cannot be caller-selected.
It uses a same-directory staged symlink plus atomic no-replace hard-link publication and parent
directory fsync. Build commands contain no selector publication path; candidate activation is a
later separately authorised gate.

Implementation and execution are separate gates. After a pack containing this mechanism becomes
authoritative, the exact next gate is
`SEPARATELY_AUTHORIZED_GIT_AUTHENTICATION_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_CHAINED_ENVIRONMENT_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_OFFLINE_NPM_CACHE_READY_EVIDENCE_IDENTITY_ONLY_CARRY_FORWARD_AND_IMMUTABLE_BUILD_ONLY_ROLLBACK_REFERENCE_BCN_AND_INDEPENDENT_CIRCLE_CARD_ARTIFACT_PREPARATION_PUBLICATION_AND_RELEASE_INTEGRITY_VERIFICATION_WITHOUT_SELECTOR_PUBLICATION_OR_CANDIDATE_START_UNDER_<CURRENT_OPERATIONS_COMMIT>_AUTHORITY`.

Rollback fixture test discovery is rooted explicitly at the protected rollback workspace returned
by the current build-attempt handoff. Both committed Vitest invocations pass that canonical path as
the fixed `--root` and retain the single fixed relative
`src/config/rollback-immutable-runtime-cache.test.ts` filter. The build-user command receives no
caller-selected working directory, root, config or filter. Fixture residue is named from the same
verified workspace basename, so a caller working directory cannot affect test discovery or cleanup
identity.

Both Vitest children also run `/usr/bin/env --chdir=<trusted-workspace>` directly as the fixed build
user, so the cwd transition is performed by that child without requiring sudo chdir policy, and
their actual `process.cwd()` is the verified rollback workspace rather than the operator's caller
directory. The fixed build user and scrubbed environment remain unchanged; no shell string, `cd`,
caller path, environment-selected cwd or relative workspace participates in process launch.

Each rollback Vitest invocation is wrapped by a fresh, unnamed `unshare --mount --net` process. The
trusted helper makes the inherited mount tree private and mounts a read-only, namespace-scoped
`sysfs` at `/sys`, so `/sys/class/net` reflects the new network namespace rather than the host.
commit-bound `rollback-fixture-network-isolation.mjs` helper raises `lo`, proves that its network
namespace differs from the host, requires `/sys/class/net` to contain only an UP loopback, rejects
every non-loopback or default IPv4/IPv6 route, and proves both non-loopback and host-loopback
connectivity are unavailable before dropping to `phase-f1-build`. It derives the consumed rollback
workspace and fixture path only from protected evidence and launches only the fixed approved test
filter with the trusted cwd. No `nsenter`, named namespace, arbitrary command, caller cwd, network
fallback or host-network mutation exists. The namespace has process lifetime and disappears on
success, failure or interruption.

A rollback fixture failure after the offline install but before immutable artifact publication is
not reusable. `recover-failed-rollback-attempt.sh` accepts only the exact protected failed-attempt
SHA-256; every path, application identity, authority, fixture residue and cleanup target is derived
internally. `failed-rollback-attempt-recovery.mjs` requires the closed v2 attempt to be exactly
`failed`, verifies its embedded authority on the protected authority lineage, re-verifies the exact
rollback commit as the build user, and accepts only a canonical build-user-owned workspace with
installed `node_modules` and absent `.next`. The one exact fixture residue may be empty or may have
the closed `NONEMPTY_PARTIAL_BUILD` shape: one top-level `fixture` directory, no completed fixture
provenance, and a recursively verified tree containing only same-filesystem build-user-owned
directories, regular files, and relative non-escaping symlinks. Regular files remain single-link
except for the exact internal npm-installed esbuild pair
`fixture/node_modules/@esbuild/linux-x64/bin/esbuild` and
`fixture/node_modules/esbuild/bin/esbuild`: those two fixed paths may share one inode only when
both report link count two, proving every link is inside the protected residue. The verifier never
follows symlinks and rejects nested mounts, special files, every other hard link, an additional or
external link to the esbuild inode, unsafe names and ownership or device changes. The sorted
full-tree metadata and content inventory binds both esbuild paths, their shared inode and link count
into the protected recovery intent. It also rejects active process references, selector references,
candidate listeners, published artifacts, post-build evidence and any release-integrity or
build-only success evidence.

Recovery first publishes a no-replace intent and byte-identical histories for the application
identity, failed attempt and application recheck. Only then may it remove the two exact
inode-revalidated disposable directories. A nonempty fixture residue is fully re-inventoried and
must remain byte-for-byte and metadata-identical to the protected intent immediately before its
single recursive removal; the removal primitive does not follow symlinks. Only then may recovery
unlink the three exact canonical evidence slots.
Every parent is fsynced and a closed value-free report publishes only after the canonical retry
state is `READY`. If interrupted, the protected intent and inode identities permit only resumption
of the same cleanup; substitution or contradictory state fails closed. The offline cache, protected
environments, readiness evidence, authentication material, acquisition state, authority history and
selectors are outside the mechanism and cannot be caller-selected.

Implementation and production recovery remain separate gates. After a corrected pack becomes
authoritative, the exact next gate is
`SEPARATELY_AUTHORIZED_GIT_AUTHENTICATION_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_CHAINED_ENVIRONMENT_READINESS_IDENTITY_ONLY_CARRY_FORWARD_AND_OFFLINE_NPM_CACHE_READY_EVIDENCE_IDENTITY_ONLY_CARRY_FORWARD_AND_FAILED_ROLLBACK_BUILD_ATTEMPT_PROTECTED_RECOVERY_AND_FRESH_TRUSTED_ROLLBACK_CHECKOUT_AND_IMMUTABLE_BUILD_ONLY_ROLLBACK_REFERENCE_BCN_AND_INDEPENDENT_CIRCLE_CARD_ARTIFACT_PREPARATION_PUBLICATION_AND_RELEASE_INTEGRITY_VERIFICATION_WITHOUT_SELECTOR_PUBLICATION_OR_CANDIDATE_START_UNDER_<CURRENT_OPERATIONS_COMMIT>_AUTHORITY`.

The rollback build must run the committed-candidate flow in `src/config/rollback-immutable-runtime-cache.test.ts` from exact SHA `8db8236c16ebb5a02ec5b90f7e5308008cff7086`. Final fixture generation cannot run from an uncommitted review diff. Provenance must bind the actual candidate SHA, historical parent, exact three-file set, raw Git diff digest, reviewed-file hashes, package identities, Next.js `15.5.15`, `BUILD_ID`, and recomputed full artifact manifest. It must record a synthetic build, absent production authority, enforced Linux loopback-only/no-route network isolation, and historical BCN identity. Forward Circle Card identity is rejected.

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

The forward build uses only `b43a1e4e708bc9f02ef83bd63dab1db1f366b32e`. Evidence must prove the reviewed machine-readiness correction and test-integration follow-up on top of the exact Phase E2 commit structure, resolved disk flushing disabled, the 50 MiB memory cap, immutable before/after manifests, absent fetch/image disk caches, authenticated `revalidatePath`/`revalidateTag`/`unstable_cache`, insight behavior, repeated images, both dual-runtime start orders, brand isolation, session isolation, owner-route isolation, and separate BCN/Circle Card process caches. Skipped evidence never counts.

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
4. Create a fresh rollback checkout at `8db8236c16ebb5a02ec5b90f7e5308008cff7086`.
5. In a separately authorised network-enabled gate, populate and seal the fixed offline npm cache from the exact rollback lockfile; then run committed-candidate provenance and the isolated Linux rollback build offline.
6. Construct and rehearse the immutable rollback artifact privately.
7. Create a separate fresh forward checkout at `b43a1e4e708bc9f02ef83bd63dab1db1f366b32e`.
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
