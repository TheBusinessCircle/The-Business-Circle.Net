# Phase E3 historical BCN rollback immutable runtime

This correction is based on historical production application commit
`5fa2bbf6ac7d39aa14636882bbae2d2713faf11a`. It creates a separately reviewed
rollback application identity; it is not the forward Circle Card release and it
does not import any Circle Card domain-breakaway behavior.

The historical application pins Next.js `15.5.15`. Its resolved production
configuration now sets:

- `experimental.isrFlushToDisk: false`
- `cacheMaxMemorySize: 52,428,800` bytes (50 MiB)

All other historical Next configuration and product behavior remain unchanged.

## Cache, restart, and writable-path behavior

In the reviewed Next.js 15.5.15 implementation, disabling ISR disk flushing
prevents persistent writes for regenerated App Router entries, regenerated Pages
Router entries, fetch-cache and `unstable_cache` entries, and Next Image optimiser
entries. `.next/cache/fetch-cache` and `.next/cache/images` are not persistent
runtime caches under this configuration. The disposable build workspace can
contain build-time cache inputs; Phase F1 must omit its `cache/fetch-cache` and
`cache/images` directories when constructing the immutable runtime artifact.

The complete copied production runtime artifact must remain root-owned and
read-only. Phase F1 must not make `.next/server/app`, `.next/server/pages`,
`.next/static`, executable JavaScript, immutable public build assets, or a generic
Next cache directory writable. Persistent application uploads are separate shared
storage and are outside this cache decision.

Regenerated entries live only in the current rollback Node process. A process
restart clears them and the historical insight route families cold-render again.
Database-backed cached reads reload from authoritative database storage. No
historical route is guaranteed to recover a runtime-regenerated entry from disk.
Cache eviction reduces hit rate and causes safe regeneration; it does not change
authentication or entitlement enforcement.

The rollback process can use up to 50 MiB for Next's incremental cache. This does
not include the Node heap, Sharp buffers, request or response buffers, operating
system page cache, or other application memory.

## Deliberately disabled image disk cache

Next.js 15.5.15 uses the same disk-flush decision for `ImageOptimizerCache`.
Repeated image optimisation remains functional, but the transformed image is not
persisted under `.next/cache/images`. Repeated requests can therefore increase
CPU use, memory churn, and upstream-image requests. Windows tests prove content
behavior only; they do not prove Linux ownership enforcement or acceptable VPS
capacity.

## Deterministic production-fixture provenance

A production fixture is accepted only when its root contains the regular,
single-link file `.phase-e3-production-fixture.json`. The file is data only; it
cannot select an executable, command, working directory, or dependency path. Its
strict schema records:

- schema and fixture-format versions;
- historical base SHA
  `5fa2bbf6ac7d39aa14636882bbae2d2713faf11a`;
- the actual rollback candidate commit SHA and its single historical parent;
- source mode `committed-candidate`, the exact candidate commit file set, and a
  SHA-256 digest of Git's raw candidate diff;
- the historical-BCN rollback purpose and build identity;
- the exact sorted reviewed file set and a SHA-256 for each file;
- an aggregate SHA-256 over each canonical path, NUL, file digest, and NUL;
- separate SHA-256 values for `next.config.ts`, `package.json`, and
  `package-lock.json`;
- exact Next.js version `15.5.15` and the exact `.next/BUILD_ID` content;
- a complete sorted `.next` and `public` artifact manifest containing canonical
  relative paths, file sizes, and SHA-256 values, plus its aggregate SHA-256;
- affirmative synthetic-build and negative production-authority markers; and
- the enforced outbound-network policy identifier.

The provenance file is excluded from its own artifact manifest, avoiding a
circular digest. It is created with exclusive-create semantics only after a
complete successful build and artifact-manifest calculation. Timestamps are not
fixture identity. `BUILD_ID` must match both provenance and the manifested file,
but remains only one input and is never sufficient by itself.

## Reviewed source modes

The resolver accepts exactly two states.

`pre-commit-review` requires HEAD to be the historical base, an empty index, and
exactly these three worktree changes:

- `next.config.ts`;
- `src/config/rollback-immutable-runtime-cache.test.ts`; and
- `docs/bcn-phase-e3-rollback-immutable-runtime-cache.md`.

This mode supports configuration, schema, rejection, temporary-Git, cache, and
ordinary regression testing before commit. It cannot generate or validate final
fixture evidence.

`committed-candidate` requires a completely clean worktree and index. HEAD must
be a normal, non-merge commit with exactly one parent, and that parent must be
the historical SHA. The commit must add or modify exactly the same three paths,
with no fourth path, deletion, rename, unexpected mode, unrelated commit, or
package change. Committed contents must match the reviewed contents. The commit
message is not an identity input.

Final fixture provenance records the actual clean candidate HEAD, its parent,
its exact file set, and its raw-diff digest. Validation independently resolves
the current clean candidate again and compares every value. A forward Circle
Card commit, amended candidate, stale fixture, or free-form substituted SHA is
rejected.

Artifact traversal accepts regular single-link files and real directories only.
It rejects absolute or non-canonical paths, traversal, symlinks, hard links,
sockets, FIFOs, devices, and other special files. Acceptance recomputes the
entire artifact manifest before any fixture copy or `next start` execution.

## Isolated fixture generation

Valid fixture generation is deliberately unavailable on unrestricted Windows.
It is also unavailable in `pre-commit-review` mode: a clean committed candidate
must exist first. Candidate-commit approval is not deployment approval.
The generator requires a Linux network namespace containing only `lo` and no
non-loopback route, a pre-populated read-only/trusted npm cache supplied through
`PHASE_E3_OFFLINE_NPM_CACHE_ROOT`, and `npm ci --offline`. It supplies a local
`NEXT_FONT_GOOGLE_MOCKED_RESPONSES` module for the two historical Google-font
requests; font loading therefore needs no external request. It never falls back
to unrestricted networking.

On a reviewed Linux host with Node 22.22.2, invoke the generator from an isolated
namespace. The target directory must not exist:

```sh
unshare --user --map-root-user --net --mount-proc \
  env PHASE_E3_OFFLINE_NPM_CACHE_ROOT=/approved/offline/npm-cache \
      PHASE_E3_GENERATE_PRODUCTION_FIXTURE_ROOT=/isolated/phase-e3-fixture \
  node node_modules/vitest/vitest.mjs run \
    src/config/rollback-immutable-runtime-cache.test.ts
```

The namespace and offline cache must be prepared and reviewed before this
command. If user namespaces, the offline cache, or loopback-only/no-route proof
is unavailable, generation must fail; do not weaken the gate or add a firewall
exception. The disposable source is extracted from `git archive` at the exact
rollback candidate commit; no uncommitted overlay is permitted. The extracted
tree is compared path-by-path, mode-by-mode on Linux, and Git-blob-by-Git-blob
with the complete candidate tree before installation. The reviewed files,
configuration, package, and lock file must also match that candidate explicitly.
It then runs `npm ci` and the production build with an exact synthetic environment
and an unreachable loopback database target, removes build-only fetch/image cache
inputs, computes the manifest, writes provenance, then validates it again.

No valid fixture has been generated merely by running the default test suite.
The generator test and real-server test are both visibly skipped unless their
explicit environment variables are present.

## Hermetic integration evidence

`src/config/rollback-immutable-runtime-cache.test.ts` has four layers:

1. resolved production configuration and exact Next-version guards;
2. installed implementation-path guards for the production server, route cache,
   `FileSystemCache`, and `ImageOptimizerCache`;
3. behavioral cache, invalidation, restart, and no-disk-write tests; and
4. a fixture-gated real `next start` test over a fresh hermetic historical build.

The real-server test is deployment evidence only when
`PHASE_E3_PRODUCTION_FIXTURE_ROOT=/isolated/phase-e3-fixture` points to a freshly
generated, provenance-valid historical fixture and the test reports as executed,
not skipped. Validation occurs in this order: canonicalise and type-check the
root; type-check and strictly parse provenance; resolve the actual clean candidate
HEAD, parent, file set, raw-diff digest, and committed file hashes; compare those
to provenance; verify package, lock, Next, and `BUILD_ID` identities; recompute the
full artifact manifest; verify synthetic/no-production-authority markers; verify
the isolated-network policy; then copy and start the fixture.

The test checks the historical homepage redirect, login, insights, lack of the
forward-only `/pro` alias, invalid Stripe signature rejection, repeated local
image optimisation, full before/after `.next` and public manifests, the absence
of persistent fetch and image cache entries, clean child shutdown, and release of
the listener port. Each repeated image response must be non-empty, have a
reasonable minimum length, match by SHA-256, and have content type consistent
with a PNG, JPEG, WebP, or AVIF file signature. Two identical empty or corrupt
responses cannot pass.

Before final application checks, remove only generated `tsconfig.tsbuildinfo` and
verify `.next`, generated fixture/provenance files, environment files, and any
temporary `node_modules` junction are absent. Application-commit approval is not
deployment approval. Linux-isolated fixture generation remains outstanding until
the clean candidate commit exists, and the Ubuntu rehearsal below remains a
later mandatory gate.

## Mandatory Ubuntu rollback rehearsal

Before the rollback artifact can be approved for Phase F1, rehearse it on Ubuntu
22.04.5 with Node 22.22.2 as the unprivileged `bcn-app` identity. The copied
rollback runtime must be root-owned and read-only and must use the exact shared
persistent-storage layout prepared by Phase F1. Use synthetic or staging data
only; do not make a real payment or send an email.

### Filesystem, storage, and behavior

1. Record a SHA-256 content manifest of the entire runtime and immutable public
   build assets before startup.
2. Start the historical rollback artifact through the reviewed systemd candidate
   service as `bcn-app`.
3. Verify the historical homepage redirect, login flow, invalid-signature Stripe
   webhook response, representative public uploads, and expected private-storage
   access and denial boundaries.
4. Exercise safe authenticated staging flows that invoke `revalidatePath` and
   `revalidateTag`, an `unstable_cache` read and invalidation, and all three
   historical insight route families.
5. Request representative local and approved remote optimised images repeatedly.
6. Record the content manifest again and require exact equality.
7. Review the service journal for `EACCES`, attempted writes, cache warnings,
   crashes, OOM events, and systemd restarts.

### Image optimisation load

Record request count, concurrency, success and error rates, p50 and p95 latency,
application and system CPU, process RSS, available memory, systemd restart count,
and upstream fetch behavior where observable. Run at least:

- one cold request;
- repeated sequential requests for the same transform;
- a modest concurrent burst; and
- a sustained representative request period.

Compare the results with the normal BCN application baseline on the four-CPU,
7.7-GiB VPS. The operator must record and explicitly approve the measured CPU,
memory, and latency headroom; this document does not invent a universal latency
threshold.

### Hard stop conditions

Do not approve the rollback artifact if the rehearsal shows any runtime artifact
mutation, `EACCES`, relevant image 5xx, crash, OOM, unexpected systemd restart,
sustained CPU pressure that threatens BCN responsiveness, uncontrolled RSS,
unacceptable measured p95 latency, upstream throttling or repeated fetch failure,
failed authenticated invalidation, failed historical auth or webhook behavior, or
failed shared-storage access.

## Upgrade guard

This decision is valid only for Next.js `15.5.15`. Any Next.js change requires a
new review of production-server configuration propagation, `IncrementalCache`,
`FileSystemCache`, `ImageOptimizerCache`, cache path mapping, revalidation and tag
handling, immutable artifact manifests, restart behavior, and image optimisation
performance. The guard tests intentionally fail when the exact version or the
reviewed implementation paths change.
