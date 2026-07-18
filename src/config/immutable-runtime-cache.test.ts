import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync
} from "node:fs";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { PHASE_PRODUCTION_SERVER } from "next/constants";
import "next/dist/server/node-environment";
import loadConfig from "next/dist/server/config";
import { ImageOptimizerCache } from "next/dist/server/image-optimizer";
import { IncrementalCache } from "next/dist/server/lib/incremental-cache";
import FileSystemCache from "next/dist/server/lib/incremental-cache/file-system-cache";
import { nodeFs } from "next/dist/server/lib/node-fs-methods";
import nextPackage from "next/package.json";
import { afterEach, describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import type {
  CachedFetchValue,
  CachedImageValue,
  GetIncrementalFetchCacheContext,
  IncrementalCachedAppPageValue,
  IncrementalCachedPageValue
} from "next/dist/server/response-cache";

const REVIEWED_NEXT_VERSION = "15.5.15";
const RUNTIME_INCREMENTAL_CACHE_MAX_BYTES = 50 * 1024 * 1024;
const temporaryDirectories: string[] = [];
const FETCH_CACHE_KIND = "FETCH" as CachedFetchValue["kind"];
const IMAGE_CACHE_KIND = "IMAGE" as CachedImageValue["kind"];
const INCREMENTAL_FETCH_KIND = "FETCH" as GetIncrementalFetchCacheContext["kind"];
const APP_PAGE_CACHE_KIND = "APP_PAGE" as IncrementalCachedAppPageValue["kind"];
const PAGES_CACHE_KIND = "PAGES" as IncrementalCachedPageValue["kind"];
const productionFixtureRoot = process.env.PHASE_E2_PRODUCTION_FIXTURE_ROOT?.trim();
const productionIt = productionFixtureRoot ? it : it.skip;
const nextGlobal = globalThis as typeof globalThis & {
  __incrementalCache?: IncrementalCache;
};

function createTemporaryDistDir() {
  const root = mkdtempSync(join(tmpdir(), "circle-card-immutable-cache-"));
  temporaryDirectories.push(root);
  return {
    root,
    serverDistDir: join(root, "server")
  };
}

function createPrerenderManifest() {
  return {
    version: 4 as const,
    routes: {},
    dynamicRoutes: {},
    notFoundRoutes: [],
    preview: {
      previewModeId: "immutable-runtime-test",
      previewModeSigningKey: "immutable-runtime-test",
      previewModeEncryptionKey: "immutable-runtime-test"
    }
  };
}

function createMemoryOnlyIncrementalCache(serverDistDir: string) {
  return new IncrementalCache({
    fs: nodeFs,
    dev: false,
    requestHeaders: {},
    minimalMode: false,
    serverDistDir,
    fetchCacheKeyPrefix: "",
    maxMemoryCacheSize: nextConfig.cacheMaxMemorySize,
    flushToDisk: nextConfig.experimental?.isrFlushToDisk,
    getPrerenderManifest: createPrerenderManifest,
    CurCacheHandler: FileSystemCache
  });
}

function createFetchValue(body: unknown): CachedFetchValue {
  return {
    kind: FETCH_CACHE_KIND,
    data: {
      headers: {},
      body: JSON.stringify(body),
      status: 200,
      url: ""
    },
    revalidate: 60
  };
}

function expectNoRuntimeIncrementalFiles(root: string) {
  expect(existsSync(join(root, "server", "app"))).toBe(false);
  expect(existsSync(join(root, "server", "pages"))).toBe(false);
  expect(existsSync(join(root, "cache", "fetch-cache"))).toBe(false);
  expect(existsSync(join(root, "cache", "images"))).toBe(false);
  expect(readdirSync(root)).toEqual([]);
}

function readInstalledNextImplementation(...segments: string[]) {
  return readFileSync(join(process.cwd(), "node_modules", "next", "dist", ...segments), "utf8");
}

function hashFile(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function contentManifest(roots: Array<{ label: string; path: string }>) {
  const rows: string[] = [];
  const visit = (root: { label: string; path: string }, current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      const metadata = lstatSync(absolute);
      const relativePath = relative(root.path, absolute).replaceAll("\\", "/");
      if (metadata.isSymbolicLink()) {
        throw new Error(`Immutable fixture contains an unexpected symlink: ${root.label}/${relativePath}`);
      }
      if (metadata.isDirectory()) {
        visit(root, absolute);
      } else if (metadata.isFile()) {
        rows.push(`${root.label}/${relativePath}\0${hashFile(absolute)}`);
      } else {
        throw new Error(`Immutable fixture contains a special file: ${root.label}/${relativePath}`);
      }
    }
  };

  for (const root of roots) visit(root, root.path);
  rows.sort();
  return {
    digest: createHash("sha256").update(rows.join("\n")).digest("hex"),
    fileCount: rows.length
  };
}

function safeOsEnvironment() {
  const names = [
    "PATH",
    "SystemRoot",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "TEMP",
    "TMP",
    "HOME",
    "USERPROFILE",
    "NUMBER_OF_PROCESSORS"
  ];
  return Object.fromEntries(
    names.flatMap((name) => (process.env[name] ? [[name, process.env[name]]] : []))
  );
}

function safeProductionEnvironment(port: number): NodeJS.ProcessEnv {
  const authSecret = "synthetic-phase-e2-auth-secret-1234567890";
  return {
    ...safeOsEnvironment(),
    NODE_ENV: "production" as const,
    NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: "postgresql://phase_e2:phase_e2@127.0.0.1:1/unreachable",
    AUTH_SECRET: authSecret,
    NEXTAUTH_SECRET: authSecret,
    STRIPE_SECRET_KEY: "sk_test_synthetic_phase_e2",
    STRIPE_WEBHOOK_SECRET: "whsec_synthetic_phase_e2",
    CIRCLE_CARD_BILLING_ENABLED: "false",
    CIRCLE_CARD_BILLING_ACCESS_MODE: "operator",
    RESEND_API_KEY: "re_test_synthetic_phase_e2_bcn",
    RESEND_FROM_EMAIL: "The Business Circle Network <noreply@thebusinesscircle.net>",
    RESEND_REPLY_TO_EMAIL: "contact@thebusinesscircle.net",
    PUBLIC_CONTACT_EMAIL: "contact@thebusinesscircle.net",
    CIRCLE_CARD_RESEND_API_KEY: "re_test_synthetic_phase_e2_circle_card",
    CIRCLE_CARD_RESEND_FROM_EMAIL: "Circle Card <noreply@circlecard.co.uk>",
    CIRCLE_CARD_RESEND_REPLY_TO_EMAIL: "support@circlecard.co.uk",
    CIRCLE_CARD_PUBLIC_CONTACT_EMAIL: "support@circlecard.co.uk",
    APP_BRAND: "bcn",
    APP_URL: "https://thebusinesscircle.net",
    AUTH_URL: "https://thebusinesscircle.net",
    NEXTAUTH_URL: "https://thebusinesscircle.net",
    NEXT_RUNTIME_DIST_DIR: ".runtime/bcn",
    PORT: String(port)
  };
}

async function availableLocalPort() {
  return new Promise<number>((resolvePort, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a local production-test port."));
        return;
      }
      server.close((error) => (error ? reject(error) : resolvePort(address.port)));
    });
  });
}

function localRequest(port: number, path: string) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }>(
    (resolveResponse, reject) => {
      const request = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          headers: {
            Host: "thebusinesscircle.net",
            "X-Forwarded-Host": "thebusinesscircle.net",
            "X-Forwarded-Proto": "https"
          }
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          response.on("end", () =>
            resolveResponse({
              status: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks)
            })
          );
        }
      );
      request.setTimeout(10_000, () => request.destroy(new Error("request timed out")));
      request.on("error", reject);
      request.end();
    }
  );
}

async function waitForProductionServer(port: number, child: ChildProcess) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Production fixture exited before becoming ready (${child.exitCode}).`);
    }
    try {
      const response = await localRequest(port, "/login");
      if (response.status === 200) return;
    } catch {
      // The local process may still be starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error("Production fixture did not become ready.");
}

async function stopProductionServer(child: ChildProcess) {
  if (child.exitCode !== null) return;
  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  child.kill();
  const cleanExit = await Promise.race([
    exited.then(() => true),
    new Promise<false>((resolveTimeout) => setTimeout(() => resolveTimeout(false), 2_000))
  ]);
  if (!cleanExit && child.exitCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}

function prepareProductionFixture(sourceRoot: string) {
  const source = resolve(sourceRoot);
  const sourceRuntime = join(source, ".runtime", "bcn");
  const sourcePublic = join(source, "public");
  if (!existsSync(join(sourceRuntime, "BUILD_ID")) || !existsSync(sourcePublic)) {
    throw new Error("PHASE_E2_PRODUCTION_FIXTURE_ROOT is not a completed dual-runtime build.");
  }

  const root = mkdtempSync(join(tmpdir(), "circle-card-production-runtime-"));
  temporaryDirectories.push(root);
  cpSync(sourceRuntime, join(root, ".runtime", "bcn"), { recursive: true });
  cpSync(sourcePublic, join(root, "public"), { recursive: true });
  for (const file of ["next.config.ts", "package.json", "package-lock.json", "tsconfig.json"]) {
    cpSync(join(source, file), join(root, file));
  }
  const runtimeDistConfig = join("src", "config", "runtime-dist-dir.ts");
  mkdirSync(dirname(join(root, runtimeDistConfig)), { recursive: true });
  cpSync(join(source, runtimeDistConfig), join(root, runtimeDistConfig));
  symlinkSync(
    join(process.cwd(), "node_modules"),
    join(root, "node_modules"),
    process.platform === "win32" ? "junction" : "dir"
  );
  return root;
}

afterEach(() => {
  delete nextGlobal.__incrementalCache;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("immutable runtime configuration and installed implementation guard", () => {
  it("resolves the reviewed production configuration through Next itself", async () => {
    const resolvedConfig = await loadConfig(PHASE_PRODUCTION_SERVER, process.cwd(), {
      silent: true
    });

    expect(nextPackage.version).toBe(REVIEWED_NEXT_VERSION);
    expect(resolvedConfig.experimental.isrFlushToDisk).toBe(false);
    expect(resolvedConfig.cacheMaxMemorySize).toBe(RUNTIME_INCREMENTAL_CACHE_MAX_BYTES);
  });

  it("guards the reviewed production, route, file and image cache propagation paths", () => {
    const nextServer = readInstalledNextImplementation("server", "next-server.js");
    const routeModule = readInstalledNextImplementation(
      "server",
      "route-modules",
      "route-module.js"
    );
    const fileSystemCache = readInstalledNextImplementation(
      "server",
      "lib",
      "incremental-cache",
      "file-system-cache.js"
    );
    const imageOptimizer = readInstalledNextImplementation("server", "image-optimizer.js");

    expect(nextPackage.version).toBe(REVIEWED_NEXT_VERSION);
    expect(nextServer).toMatch(
      /flushToDisk:\s*!this\.minimalMode\s*&&\s*this\.nextConfig\.experimental\.isrFlushToDisk/
    );
    expect(routeModule).toMatch(
      /flushToDisk:\s*nextConfig\.experimental\.isrFlushToDisk/
    );
    expect(fileSystemCache).toMatch(/if\s*\(!this\.flushToDisk\s*\|\|\s*!data\)\s*return/);
    expect(imageOptimizer).toMatch(
      /maximumDiskCacheSize\s*!==\s*0\s*&&\s*nextConfig\.experimental\.isrFlushToDisk/
    );
    expect(imageOptimizer).toMatch(
      /if\s*\(!this\.nextConfig\.experimental\.isrFlushToDisk\)\s*\{\s*return/
    );
  });
});

describe("immutable runtime internal cache behavior", () => {
  it("keeps unstable_cache entries in memory and honours tag invalidation without disk writes", async () => {
    const { workAsyncStorage } = await import(
      "next/dist/server/app-render/work-async-storage.external"
    );
    const { executeRevalidates } = await import("next/dist/server/revalidation-utils");
    const { revalidateTag, unstable_cache } = await import("next/cache");
    const { root, serverDistDir } = createTemporaryDistDir();
    const cache = createMemoryOnlyIncrementalCache(serverDistDir);
    nextGlobal.__incrementalCache = cache;
    const unique = `${process.pid}-${Date.now()}-${Math.random()}`;
    const tag = `immutable-runtime:${unique}`;
    let loads = 0;
    const read = unstable_cache(
      async () => ({ loads: ++loads }),
      [`immutable-runtime:${unique}`],
      { tags: [tag], revalidate: 60 }
    );

    expect(await read()).toEqual({ loads: 1 });
    expect(await read()).toEqual({ loads: 1 });
    expect(loads).toBe(1);

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
    const workStore = {
      route: "/immutable-runtime-test",
      incrementalCache: cache,
      pendingRevalidatedTags: [] as string[],
      pendingRevalidates: {},
      pendingRevalidateWrites: [] as Promise<unknown>[]
    } as unknown as Parameters<typeof executeRevalidates>[0];
    workAsyncStorage.run(workStore, () => revalidateTag(tag));
    expect(workStore.pendingRevalidatedTags).toContain(tag);
    await executeRevalidates(workStore);

    expect(await read()).toEqual({ loads: 2 });
    expect(loads).toBe(2);
    expectNoRuntimeIncrementalFiles(root);
  });

  it("does not write regenerated App Router or Pages Router output", async () => {
    const { root, serverDistDir } = createTemporaryDistDir();
    const handler = new FileSystemCache({
      fs: nodeFs,
      flushToDisk: nextConfig.experimental?.isrFlushToDisk,
      serverDistDir,
      revalidatedTags: [],
      maxMemoryCacheSize: nextConfig.cacheMaxMemorySize,
      _requestHeaders: {}
    });
    const suffix = `${process.pid}-${Date.now()}-${Math.random()}`;

    await handler.set(
      `app-${suffix}`,
      {
        kind: APP_PAGE_CACHE_KIND,
        html: "<main>app runtime render</main>",
        rscData: Buffer.from("app-rsc"),
        headers: {},
        postponed: undefined,
        status: 200,
        segmentData: undefined
      },
      { fetchCache: false, isRoutePPREnabled: false }
    );
    await handler.set(
      `pages-${suffix}`,
      {
        kind: PAGES_CACHE_KIND,
        html: "<main>pages runtime render</main>",
        pageData: { rendered: true },
        headers: {},
        status: 200
      },
      { fetchCache: false }
    );

    expectNoRuntimeIncrementalFiles(root);
  });

  it("turns revalidatePath into an in-memory tag invalidation without disk writes", async () => {
    const { workAsyncStorage } = await import(
      "next/dist/server/app-render/work-async-storage.external"
    );
    const { executeRevalidates } = await import("next/dist/server/revalidation-utils");
    const { revalidatePath } = await import("next/cache");
    const { root, serverDistDir } = createTemporaryDistDir();
    const cache = createMemoryOnlyIncrementalCache(serverDistDir);
    const key = `path-${process.pid}-${Date.now()}-${Math.random()}`;
    const pathTag = "_N_T_/app";

    await cache.set(key, createFetchValue({ plan: "free" }), {
      fetchCache: true,
      tags: [pathTag]
    });
    expect(
      await cache.get(key, {
        kind: INCREMENTAL_FETCH_KIND,
        tags: [pathTag],
        softTags: []
      })
    ).not.toBeNull();

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
    const workStore = {
      route: "/immutable-runtime-test",
      incrementalCache: cache,
      pendingRevalidatedTags: [] as string[],
      pendingRevalidates: {},
      pendingRevalidateWrites: [] as Promise<unknown>[]
    } as unknown as Parameters<typeof executeRevalidates>[0];

    workAsyncStorage.run(workStore, () => revalidatePath("/app"));
    expect(workStore.pendingRevalidatedTags).toContain(pathTag);
    await executeRevalidates(workStore);

    expect(
      await cache.get(key, {
        kind: INCREMENTAL_FETCH_KIND,
        tags: [pathTag],
        softTags: []
      })
    ).toBeNull();
    expectNoRuntimeIncrementalFiles(root);
  });

  it("deliberately keeps ImageOptimizerCache memory-only without cache/images", async () => {
    const resolvedConfig = await loadConfig(PHASE_PRODUCTION_SERVER, process.cwd(), {
      silent: true
    });
    const { root } = createTemporaryDistDir();
    const imageCache = new ImageOptimizerCache({ distDir: root, nextConfig: resolvedConfig });

    await imageCache.set(
      "same-image-transform",
      {
        kind: IMAGE_CACHE_KIND,
        etag: "synthetic-etag",
        buffer: Buffer.from("synthetic-image-result"),
        extension: "png",
        upstreamEtag: "synthetic-upstream-etag"
      },
      { cacheControl: { revalidate: 60, expire: undefined } }
    );

    expect(await imageCache.get("same-image-transform")).toBeNull();
    expectNoRuntimeIncrementalFiles(root);
  });
});

describe("immutable runtime subprocess restart and brand isolation", () => {
  function childCachePrelude(serverDistDir: string) {
    const modulePath = JSON.stringify(
      join(process.cwd(), "node_modules", "next", "dist", "server")
    );
    return `
      const FileSystemCache = require(${modulePath} + '/lib/incremental-cache/file-system-cache').default;
      const { nodeFs } = require(${modulePath} + '/lib/node-fs-methods');
      const { CachedRouteKind, IncrementalCacheKind } = require(${modulePath} + '/response-cache');
      const cache = new FileSystemCache({
        fs: nodeFs,
        flushToDisk: false,
        serverDistDir: ${JSON.stringify(serverDistDir)},
        revalidatedTags: [],
        maxMemoryCacheSize: 1024 * 1024
      });
    `;
  }

  it("does not persist a regenerated entry across a Node process restart", () => {
    const { root, serverDistDir } = createTemporaryDistDir();
    const childPrelude = childCachePrelude(serverDistDir);
    const writeScript = `${childPrelude}
      cache.set('restart-key', {
        kind: CachedRouteKind.FETCH,
        data: { headers: {}, body: '{"value":"runtime"}', status: 200, url: '' },
        revalidate: 60
      }, { fetchCache: true, tags: ['restart-tag'] })
        .then(() => cache.get('restart-key', {
          kind: IncrementalCacheKind.FETCH,
          tags: ['restart-tag'],
          softTags: []
        }))
        .then((entry) => process.stdout.write(entry ? 'memory-hit' : 'miss'));
    `;
    const readAfterRestartScript = `${childPrelude}
      cache.get('restart-key', {
        kind: IncrementalCacheKind.FETCH,
        tags: ['restart-tag'],
        softTags: []
      }).then((entry) => process.stdout.write(entry ? 'unexpected-hit' : 'cold-start'));
    `;

    expect(execFileSync(process.execPath, ["--eval", writeScript], { encoding: "utf8" })).toBe(
      "memory-hit"
    );
    expect(
      execFileSync(process.execPath, ["--eval", readAfterRestartScript], { encoding: "utf8" })
    ).toBe("cold-start");
    expectNoRuntimeIncrementalFiles(root);
  });

  it("keeps brand cache identity isolated in either process start order", () => {
    const { root, serverDistDir } = createTemporaryDistDir();
    const runBrandProcess = (brand: "bcn" | "circle-card") => {
      const script = `${childCachePrelude(serverDistDir)}
        const brand = ${JSON.stringify(brand)};
        cache.set('shared-key', {
          kind: CachedRouteKind.FETCH,
          data: { headers: {}, body: JSON.stringify({ brand }), status: 200, url: '' },
          revalidate: 60
        }, { fetchCache: true, tags: ['shared-tag'] })
          .then(() => cache.get('shared-key', {
            kind: IncrementalCacheKind.FETCH,
            tags: ['shared-tag'],
            softTags: []
          }))
          .then((entry) => process.stdout.write(JSON.parse(entry.value.data.body).brand));
      `;
      return execFileSync(process.execPath, ["--eval", script], { encoding: "utf8" });
    };

    for (const order of [
      ["bcn", "circle-card"],
      ["circle-card", "bcn"]
    ] as const) {
      expect(order.map((brand) => runBrandProcess(brand))).toEqual([...order]);
    }
    expectNoRuntimeIncrementalFiles(root);
  });
});

describe("real hermetic production Next server", () => {
  productionIt(
    "keeps the copied runtime immutable and deliberately leaves repeated images uncached on disk",
    async () => {
      const fixtureRoot = prepareProductionFixture(productionFixtureRoot as string);
      const runtimeRoot = join(fixtureRoot, ".runtime", "bcn");
      const publicRoot = join(fixtureRoot, "public");
      const immutableRoots = [
        { label: "runtime", path: runtimeRoot },
        { label: "public", path: publicRoot }
      ];
      const before = contentManifest(immutableRoots);
      const fetchCachePath = join(runtimeRoot, "cache", "fetch-cache");
      const imageCachePath = join(runtimeRoot, "cache", "images");
      expect(existsSync(fetchCachePath)).toBe(false);
      expect(existsSync(imageCachePath)).toBe(false);

      const port = await availableLocalPort();
      const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
      const child = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
        cwd: fixtureRoot,
        env: safeProductionEnvironment(port),
        stdio: ["ignore", "pipe", "pipe"]
      });
      let output = "";
      const rememberOutput = (chunk: Buffer) => {
        output = `${output}${chunk.toString("utf8")}`.slice(-8_000);
      };
      child.stdout?.on("data", rememberOutput);
      child.stderr?.on("data", rememberOutput);

      try {
        await waitForProductionServer(port, child);
        const homepage = await localRequest(port, "/");
        const insight = await localRequest(port, "/insights");
        const cachedInsight = await localRequest(port, "/insights");
        const imagePath =
          "/_next/image?url=%2Fbranding%2Fcircle-card-logo.png&w=256&q=75";
        const firstImage = await localRequest(port, imagePath);
        const repeatedImage = await localRequest(port, imagePath);

        expect(homepage.status).toBe(307);
        expect(homepage.headers.location).toBe("/join-desktop");
        expect(insight.status).toBe(200);
        expect(cachedInsight.status).toBe(200);
        expect(insight.headers["content-type"]).toContain("text/html");
        expect(firstImage.status).toBe(200);
        expect(repeatedImage.status).toBe(200);
        expect(firstImage.headers["content-type"]).toMatch(/^image\//);
        expect(repeatedImage.headers["content-type"]).toBe(firstImage.headers["content-type"]);
        expect(createHash("sha256").update(repeatedImage.body).digest("hex")).toBe(
          createHash("sha256").update(firstImage.body).digest("hex")
        );
        expect(existsSync(fetchCachePath)).toBe(false);
        expect(existsSync(imageCachePath)).toBe(false);
      } catch (error) {
        throw new Error(`Production fixture assertion failed. Recent output:\n${output}`, {
          cause: error
        });
      } finally {
        await stopProductionServer(child);
      }

      expect(contentManifest(immutableRoots)).toEqual(before);
      expect(existsSync(fetchCachePath)).toBe(false);
      expect(existsSync(imageCachePath)).toBe(false);
    },
    120_000
  );
});
