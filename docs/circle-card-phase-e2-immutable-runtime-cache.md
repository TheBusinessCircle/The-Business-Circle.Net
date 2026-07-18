# Phase E2 immutable Next.js runtime cache

This application pins Next.js exactly to 15.5.15 and sets
`experimental.isrFlushToDisk` to `false`. In this exact Next.js implementation, that setting
prevents runtime disk persistence for:

- regenerated App Router entries beneath `server/app`;
- regenerated Pages Router entries beneath `server/pages`;
- fetch and `unstable_cache` entries beneath `cache/fetch-cache`; and
- optimised image entries beneath `cache/images`.

Neither `.next/cache/fetch-cache` nor `.next/cache/images` is a persistent production cache for
this release. The complete copied production runtime artifact must remain root-owned and
read-only to the application identity unless a later review proves a specific write path. Phase
F1 must not make a generic Next runtime cache directory writable merely because that directory
exists in the build output.

## Runtime and restart behavior

Regenerated entries live only in the current Node process. `revalidatePath`, `revalidateTag`, and
`unstable_cache` invalidate and repopulate the active process's memory cache, but those entries do
not survive a restart. Restart therefore causes cold regeneration. Database-backed cached data
reloads from authoritative storage.

The three BCN insight route families declare `revalidate = 3600`, but they are not guaranteed to
load a persisted regenerated seed after restart. They cold-render according to the current build
and route policy. A deployment rehearsal must verify that behavior against the built
`prerender-manifest.json`; it must not infer persistence from the route source or build summary.

BCN and Circle Card run in separate Node processes and have independent in-memory caches. An
invalidation in one process is not propagated to the other. The current Circle Card routes do not
depend on BCN's indefinitely cached site-content or visual-media reads; database-backed Circle
Card customer data is dynamically loaded. Any future shared cached data requiring cross-process
invalidation needs a separate design review.

`cacheMaxMemorySize` is explicitly 50 MiB per process. The two runtimes may therefore use up to
100 MiB for Next's incremental caches in total. That excludes Node heaps, Sharp buffers, response
buffers, operating-system cache, and all other application memory.

## Deliberately disabled image disk cache

Next.js 15.5.15 uses the same `isrFlushToDisk` decision for `ImageOptimizerCache`. Repeated
`/_next/image` requests can therefore repeat image decoding, resizing and any permitted upstream
fetch rather than using `cache/images`. Browser or edge caching may reduce origin traffic, but the
deployment must not rely on unverified Cloudflare cache behavior. Increased CPU, memory churn,
latency and upstream requests are an explicitly accepted risk only if the target-server rehearsal
below demonstrates adequate headroom.

This phase does not add Redis, a custom cache handler, an external cache service, writable runtime
output, or a public runtime-information endpoint.

## Committed production-server integration guard

The real `next start` test in `src/config/immutable-runtime-cache.test.ts` is gated by
`PHASE_E2_PRODUCTION_FIXTURE_ROOT` so the ordinary unit suite does not silently perform a full
production build. A release verification must first create the hermetic dual-runtime fixture with
the repository smoke-build command and explicitly point this variable at the completed fixture
root before running the focused test. The fixture must use a synthetic authentication secret and
an unreachable local PostgreSQL URL. A skipped production-server test is not release evidence.

The explicit run copies the BCN runtime and immutable public assets to an operating-system
temporary directory, starts the real production Next server, exercises insight and repeated image
requests, stops it cleanly, and compares the complete before/after content manifest. The normal
alternating dual-runtime smoke should then be run; on success it removes its temporary fixture.

## Mandatory Ubuntu 22.04.5 / Node 22.22.2 rehearsal

Run this only on Ubuntu 22.04.5 with Node 22.22.2, as the same unprivileged application identities
planned for production. Use an isolated copied runtime, synthetic secrets, unreachable external
service addresses, and safe staging data. Do not use production credentials, send email, deliver
a webhook, or create a Stripe payment.

Record the approved application SHA, build identity, runtime artifact manifest, operating-system
version, Node version, CPU count and available memory before starting.

### A. Filesystem immutability and revalidation

1. Build once without production authority. Copy the completed artifact to distinct BCN and
   Circle Card runtime directories and verify their full content manifests and `BUILD_ID` values
   match.
2. Make every copied runtime file and directory root-owned and read-only to the application UID.
   Keep logs, uploads and other proven persistent application storage outside the runtime artifact.
   Do not make a generic `.next/cache` or runtime cache directory writable.
3. Record a SHA-256 content manifest covering the complete runtime artifact, including
   `server/app`, `server/pages`, `static`, executable JavaScript, build metadata and immutable
   public assets.
4. Start each production server as its intended unprivileged UID with its exact validated brand,
   origin and distribution directory. Confirm the effective UID and that the two processes use
   separate memory spaces.
5. Exercise the insight routes and safe authenticated staging actions covering `revalidatePath`,
   `revalidateTag`, and `unstable_cache`. Confirm regenerated data becomes visible in the active
   process and database-backed values reload authoritatively.
6. Request representative local and allowed upstream optimised images repeatedly. Confirm
   successful image responses and confirm that neither `cache/images` nor `cache/fetch-cache` is
   created.
7. Restart each process independently. Confirm cold regeneration, authoritative database reload,
   continued health of the other brand, and absence of cross-brand cache entries.
8. Record the complete content manifest again. Fail the rehearsal if any immutable content
   changes, if any attempted write reaches the artifact, if an `EACCES`/`EROFS` breaks a request,
   or if authenticated revalidation fails.

Windows content-manifest tests are supporting evidence only. Windows ACL behavior does not prove
Linux ownership or read-only enforcement.

### B. Image optimisation load

Use a recorded, repeatable request set containing:

- one cold request for each representative image;
- repeated sequential requests for identical transformations;
- a modest concurrent burst; and
- a sustained period representative of expected launch traffic.

Record the request count, concurrency, success and error rate, p50 and p95 response time,
application CPU, total system CPU, process RSS, available system memory, supervisor restarts or
crashes, and observable upstream image-fetch behavior. Compare these results with both the cold
image result and a normal non-image application baseline. Record the chosen concurrency and
duration rather than inventing a universal threshold.

The operator must explicitly approve the measured headroom on the four-core, 7.7 GiB VPS.

### C. Hard prelaunch stop conditions

Do not approve deployment if the rehearsal shows any of the following:

- an image-optimisation 5xx;
- an application crash, OOM, or supervisor restart;
- sustained CPU saturation that threatens BCN responsiveness;
- p95 latency unacceptable against the recorded cold and normal-application baselines;
- uncontrolled RSS growth;
- upstream throttling or repeated origin failures;
- mutation of any immutable runtime file; or
- failed authenticated revalidation or authoritative data reload.

Keep billing operator-only throughout rehearsal and launch testing.

## Next.js upgrade guard

Any Next.js version change requires a new application cache review. Before accepting an upgrade,
review and retest:

- production `next-server` configuration propagation;
- `IncrementalCache` construction;
- `FileSystemCache` read, write and path mapping behavior;
- `ImageOptimizerCache` behavior;
- fetch, App Router, Pages Router and image cache paths;
- `revalidatePath`, `revalidateTag`, and tag-manifest handling;
- full immutable runtime manifests; and
- image-optimisation performance on the target server.

The automated guard intentionally fails unless Next is exactly 15.5.15 and the reviewed
production-server, route-module, file-system-cache and image-optimiser propagation paths remain
present. Passing that guard does not replace the Ubuntu rehearsal.
