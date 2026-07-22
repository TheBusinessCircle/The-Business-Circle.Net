import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { PHASE_PRODUCTION_SERVER } from "next/constants";
import "next/dist/server/node-environment";
import loadConfig from "next/dist/server/config";
import { ImageOptimizerCache } from "next/dist/server/image-optimizer";
import { IncrementalCache } from "next/dist/server/lib/incremental-cache";
import FileSystemCache from "next/dist/server/lib/incremental-cache/file-system-cache";
import { nodeFs } from "next/dist/server/lib/node-fs-methods";
import nextPackage from "next/package.json";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import type {
  CachedFetchValue,
  CachedImageValue,
  GetIncrementalFetchCacheContext,
  IncrementalCachedAppPageValue,
  IncrementalCachedPageValue
} from "next/dist/server/response-cache";

const HISTORICAL_APPLICATION_SHA = "5fa2bbf6ac7d39aa14636882bbae2d2713faf11a";
const FORWARD_APPLICATION_SHA = "2c83694de301b0244c5586c1598aceb10fa2214b";
const REVIEWED_NEXT_VERSION = "15.5.15";
const RUNTIME_INCREMENTAL_CACHE_MAX_BYTES = 50 * 1024 * 1024;
const PROVENANCE_FILE = ".phase-e3-production-fixture.json";
const PROVENANCE_SCHEMA_VERSION = 1;
const FIXTURE_FORMAT_VERSION = "phase-e3-historical-bcn-next-15.5.15-v1";
const ROLLBACK_PURPOSE = "historical-bcn-immutable-runtime-rollback";
const HISTORICAL_BUILD_IDENTITY = "historical-bcn";
const ISOLATED_NETWORK_POLICY =
  "linux-network-namespace-no-routes-with-local-next-font-mock-v1";
const REVIEWED_CHANGED_FILES = [
  "docs/bcn-phase-e3-rollback-immutable-runtime-cache.md",
  "next.config.ts",
  "src/config/rollback-immutable-runtime-cache.test.ts"
] as const;
const temporaryDirectories: string[] = [];
const suiteDirectories: string[] = [];
const FETCH_CACHE_KIND = "FETCH" as CachedFetchValue["kind"];
const IMAGE_CACHE_KIND = "IMAGE" as CachedImageValue["kind"];
const INCREMENTAL_FETCH_KIND = "FETCH" as GetIncrementalFetchCacheContext["kind"];
const APP_PAGE_CACHE_KIND = "APP_PAGE" as IncrementalCachedAppPageValue["kind"];
const PAGES_CACHE_KIND = "PAGES" as IncrementalCachedPageValue["kind"];
const productionFixtureRoot = process.env.PHASE_E3_PRODUCTION_FIXTURE_ROOT?.trim();
const productionIt = productionFixtureRoot ? it : it.skip;
const fixtureGenerationRoot = process.env.PHASE_E3_GENERATE_PRODUCTION_FIXTURE_ROOT?.trim();
const fixtureGenerationIt = fixtureGenerationRoot ? it : it.skip;
const nextGlobal = globalThis as typeof globalThis & {
  __incrementalCache?: IncrementalCache;
};

type ReviewedFileIdentity = {
  path: string;
  sha256: string;
};

type ArtifactManifestEntry = ReviewedFileIdentity & {
  size: number;
};

type FixtureProvenance = {
  schemaVersion: number;
  fixtureFormatVersion: string;
  historicalBaseSha: string;
  rollbackCandidateCommitSha: string;
  rollbackCandidateParentSha: string;
  sourceMode: "committed-candidate";
  candidateCommitFileSet: string[];
  candidateCommitDiffDigest: string;
  rollbackPurpose: string;
  buildIdentity: string;
  reviewedFiles: ReviewedFileIdentity[];
  reviewedFilesAggregateSha256: string;
  nextConfigSha256: string;
  packageJsonSha256: string;
  packageLockJsonSha256: string;
  nextVersion: string;
  buildId: string;
  artifactManifest: {
    algorithm: string;
    digest: string;
    fileCount: number;
    entries: ArtifactManifestEntry[];
  };
  syntheticBuild: boolean;
  productionAuthorityPresent: boolean;
  outboundNetworkPolicy: string;
};

type PreCommitReviewedSourceIdentity = {
  sourceMode: "pre-commit-review";
  historicalBaseSha: string;
  reviewedFiles: ReviewedFileIdentity[];
  reviewedFilesAggregateSha256: string;
};

type CommittedReviewedSourceIdentity = {
  sourceMode: "committed-candidate";
  historicalBaseSha: string;
  rollbackCandidateCommitSha: string;
  rollbackCandidateParentSha: string;
  candidateCommitFileSet: string[];
  candidateCommitDiffDigest: string;
  reviewedFiles: ReviewedFileIdentity[];
  reviewedFilesAggregateSha256: string;
};

type ReviewedSourceIdentity =
  | PreCommitReviewedSourceIdentity
  | CommittedReviewedSourceIdentity;

type ReviewedSourceOptions = {
  historicalBaseSha?: string;
  reviewedContentRoot?: string;
};

type TemporaryCandidateRepository = {
  root: string;
  historicalBaseSha: string;
  candidateCommitSha: string;
};

function createTemporaryDistDir() {
  const root = mkdtempSync(join(tmpdir(), "bcn-rollback-immutable-cache-"));
  temporaryDirectories.push(root);
  return { root, serverDistDir: join(root, "server") };
}

function createPrerenderManifest() {
  return {
    version: 4 as const,
    routes: {},
    dynamicRoutes: {},
    notFoundRoutes: [],
    preview: {
      previewModeId: "rollback-immutable-runtime-test",
      previewModeSigningKey: "rollback-immutable-runtime-test",
      previewModeEncryptionKey: "rollback-immutable-runtime-test"
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
    data: { headers: {}, body: JSON.stringify(body), status: 200, url: "" },
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

function hashIdentityRows(rows: ReviewedFileIdentity[]) {
  const hash = createHash("sha256");
  for (const row of rows) {
    hash.update(row.path);
    hash.update("\0");
    hash.update(row.sha256);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function assertCanonicalRelativePath(path: string, label: string) {
  if (
    !path ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`${label} is not a canonical relative path.`);
  }
}

function assertSafeDirectory(path: string, label: string) {
  const metadata = lstatSync(path);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(`${label} must be a real directory.`);
  }
  if (realpathSync.native(path) !== resolve(path)) {
    throw new Error(`${label} must not resolve through a symlink or alias.`);
  }
}

function artifactManifest(roots: Array<{ label: string; path: string }>) {
  const entries: ArtifactManifestEntry[] = [];
  const visit = (root: { label: string; path: string }, current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      const metadata = lstatSync(absolute);
      const relativePath = relative(root.path, absolute).replaceAll("\\", "/");
      const manifestPath = `${root.label}/${relativePath}`;
      assertCanonicalRelativePath(manifestPath, "Artifact manifest path");
      if (metadata.isSymbolicLink()) {
        throw new Error(`Immutable fixture contains an unexpected symlink: ${manifestPath}`);
      }
      if (metadata.isDirectory()) {
        visit(root, absolute);
      } else if (metadata.isFile()) {
        if (metadata.nlink !== 1) {
          throw new Error(`Immutable fixture contains a hard-linked file: ${manifestPath}`);
        }
        entries.push({ path: manifestPath, sha256: hashFile(absolute), size: metadata.size });
      } else {
        throw new Error(`Immutable fixture contains a special file: ${manifestPath}`);
      }
    }
  };

  for (const root of roots) {
    assertSafeDirectory(root.path, `${root.label} artifact root`);
    visit(root, root.path);
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  return {
    algorithm: "sha256",
    digest: createHash("sha256").update(JSON.stringify(entries)).digest("hex"),
    fileCount: entries.length,
    entries
  };
}

function contentManifest(roots: Array<{ label: string; path: string }>) {
  const manifest = artifactManifest(roots);
  return { digest: manifest.digest, fileCount: manifest.fileCount };
}

function reviewedFileIdentities(root: string) {
  return [...REVIEWED_CHANGED_FILES]
    .sort()
    .map((path) => ({ path, sha256: hashFile(join(root, path)) }));
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
  const authSecret = "synthetic-phase-e3-auth-secret-1234567890";
  return {
    ...safeOsEnvironment(),
    NODE_ENV: "production" as const,
    NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: "postgresql://phase_e3:phase_e3@127.0.0.1:1/unreachable",
    AUTH_SECRET: authSecret,
    NEXTAUTH_SECRET: authSecret,
    APP_URL: "https://thebusinesscircle.net",
    AUTH_URL: "https://thebusinesscircle.net",
    NEXTAUTH_URL: "https://thebusinesscircle.net",
    STRIPE_SECRET_KEY: "sk_test_synthetic_phase_e3",
    STRIPE_WEBHOOK_SECRET: "whsec_synthetic_phase_e3",
    RESEND_API_KEY: "re_test_synthetic_phase_e3",
    RESEND_FROM_EMAIL: "The Business Circle Network <noreply@thebusinesscircle.net>",
    RESEND_REPLY_TO_EMAIL: "contact@thebusinesscircle.net",
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

function localRequest(
  port: number,
  path: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {}
) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }>(
    (resolveResponse, reject) => {
      const request = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method: options.method ?? "GET",
          headers: {
            Host: "thebusinesscircle.net",
            "X-Forwarded-Host": "thebusinesscircle.net",
            "X-Forwarded-Proto": "https",
            ...(options.body ? { "Content-Length": String(Buffer.byteLength(options.body)) } : {}),
            ...options.headers
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
      if (options.body) request.write(options.body);
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
  const exited = new Promise<void>((resolveExit) => {
    const onExit = () => resolveExit();
    child.once("exit", onExit);
    if (child.exitCode !== null) {
      child.off("exit", onExit);
      resolveExit();
    }
  });
  child.kill();
  const cleanExit = await Promise.race([
    exited.then(() => true),
    new Promise<false>((resolveTimeout) => setTimeout(() => resolveTimeout(false), 2_000))
  ]);
  if (!cleanExit && child.exitCode === null) {
    child.kill("SIGKILL");
    const forcedExit = await Promise.race([
      exited.then(() => true),
      new Promise<false>((resolveTimeout) => setTimeout(() => resolveTimeout(false), 5_000))
    ]);
    if (!forcedExit || child.exitCode === null) {
      throw new Error("Production fixture process could not be terminated.");
    }
  }
}

function commandLines(repositoryRoot: string, args: string[]) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

function gitText(repositoryRoot: string, args: string[]) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

function gitBuffer(repositoryRoot: string, args: string[]) {
  return execFileSync("git", args, { cwd: repositoryRoot });
}

function nulSeparated(buffer: Buffer) {
  return buffer
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function assertNoGeneratedSourceInputs(repositoryRoot: string) {
  for (const forbidden of [
    ".env",
    ".env.local",
    ".env.production",
    ".next",
    "tsconfig.tsbuildinfo"
  ]) {
    if (existsSync(join(repositoryRoot, forbidden))) {
      throw new Error(`Fixture source contains forbidden generated input: ${forbidden}`);
    }
  }
}

function expectedReviewedFiles(reviewedContentRoot: string) {
  return reviewedFileIdentities(reviewedContentRoot);
}

function assertReviewedFilesMatch(
  repositoryRoot: string,
  reviewedContentRoot: string,
  label: string
) {
  const actual = reviewedFileIdentities(repositoryRoot);
  const expected = expectedReviewedFiles(reviewedContentRoot);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} reviewed file content does not match the approved Phase E3 content.`);
  }
  return actual;
}

function treeMode(repositoryRoot: string, commit: string, path: string) {
  const row = gitText(repositoryRoot, ["ls-tree", commit, "--", path]);
  return row ? row.split(/\s/u, 1)[0] : null;
}

function resolveReviewedSourceIdentity(
  repositoryRoot = process.cwd(),
  options: ReviewedSourceOptions = {}
): ReviewedSourceIdentity {
  const canonicalRoot = resolve(repositoryRoot);
  const historicalBaseSha = options.historicalBaseSha ?? HISTORICAL_APPLICATION_SHA;
  const reviewedContentRoot = resolve(options.reviewedContentRoot ?? process.cwd());
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: canonicalRoot,
    encoding: "utf8"
  }).trim();
  assertNoGeneratedSourceInputs(canonicalRoot);

  const staged = commandLines(canonicalRoot, ["diff", "--cached", "--name-only"]);
  const worktreeStatus = gitBuffer(canonicalRoot, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all"
  ]);

  if (head === historicalBaseSha) {
    if (staged.length !== 0) {
      throw new Error("Pre-commit review source contains staged changes.");
    }
    const changed = [
      ...commandLines(canonicalRoot, ["diff", "--no-renames", "--name-only"]),
      ...commandLines(canonicalRoot, ["ls-files", "--others", "--exclude-standard"])
    ].sort();
    if (JSON.stringify(changed) !== JSON.stringify([...REVIEWED_CHANGED_FILES].sort())) {
      throw new Error("Pre-commit review changes are not exactly the reviewed Phase E3 file set.");
    }
    const reviewedFiles = assertReviewedFilesMatch(
      canonicalRoot,
      reviewedContentRoot,
      "Pre-commit review"
    );
    return {
      sourceMode: "pre-commit-review",
      historicalBaseSha,
      reviewedFiles,
      reviewedFilesAggregateSha256: hashIdentityRows(reviewedFiles)
    };
  }

  if (worktreeStatus.length !== 0 || staged.length !== 0) {
    throw new Error("Committed candidate requires a completely clean worktree and index.");
  }
  if (gitText(canonicalRoot, ["cat-file", "-t", head]) !== "commit") {
    throw new Error("Committed candidate HEAD is not a commit object.");
  }
  const parents = gitText(canonicalRoot, ["rev-list", "--parents", "-n", "1", head]).split(
    /\s+/u
  );
  if (parents.length !== 2) {
    throw new Error("Committed candidate must be a normal non-merge commit with exactly one parent.");
  }
  const parent = parents[1];
  if (parent !== historicalBaseSha) {
    throw new Error("Committed candidate parent is not the reviewed historical application SHA.");
  }

  const candidateCommitFileSet = nulSeparated(
    gitBuffer(canonicalRoot, [
      "diff-tree",
      "--no-commit-id",
      "-r",
      "--no-renames",
      "--name-only",
      "-z",
      parent,
      head
    ])
  ).sort();
  if (
    JSON.stringify(candidateCommitFileSet) !== JSON.stringify([...REVIEWED_CHANGED_FILES].sort())
  ) {
    throw new Error("Committed candidate diff is not exactly the reviewed Phase E3 file set.");
  }

  const statusRows = nulSeparated(
    gitBuffer(canonicalRoot, [
      "diff-tree",
      "--no-commit-id",
      "-r",
      "--no-renames",
      "--name-status",
      "-z",
      parent,
      head
    ])
  );
  const statusByPath = new Map<string, string>();
  for (let index = 0; index < statusRows.length; index += 2) {
    statusByPath.set(statusRows[index + 1], statusRows[index]);
  }
  if (statusByPath.size !== REVIEWED_CHANGED_FILES.length) {
    throw new Error("Committed candidate contains an unexpected rename, deletion, or status change.");
  }
  for (const path of REVIEWED_CHANGED_FILES) {
    const parentMode = treeMode(canonicalRoot, parent, path);
    const candidateMode = treeMode(canonicalRoot, head, path);
    const expectedStatus = parentMode ? "M" : "A";
    if (
      statusByPath.get(path) !== expectedStatus ||
      candidateMode !== "100644" ||
      (parentMode !== null && parentMode !== "100644")
    ) {
      throw new Error(`Committed candidate has an unsafe status or mode for ${path}.`);
    }
  }

  const reviewedFiles = assertReviewedFilesMatch(
    canonicalRoot,
    reviewedContentRoot,
    "Committed candidate"
  );
  const rawDiff = gitBuffer(canonicalRoot, [
    "diff-tree",
    "--no-commit-id",
    "-r",
    "--no-renames",
    "--raw",
    "-z",
    parent,
    head
  ]);
  return {
    sourceMode: "committed-candidate",
    historicalBaseSha,
    rollbackCandidateCommitSha: head,
    rollbackCandidateParentSha: parent,
    candidateCommitFileSet,
    candidateCommitDiffDigest: createHash("sha256").update(rawDiff).digest("hex"),
    reviewedFiles,
    reviewedFilesAggregateSha256: hashIdentityRows(reviewedFiles)
  };
}

function requireCommittedCandidate(
  repositoryRoot = process.cwd(),
  options: ReviewedSourceOptions = {}
) {
  const identity = resolveReviewedSourceIdentity(repositoryRoot, options);
  if (identity.sourceMode !== "committed-candidate") {
    throw new Error(
      "Final Phase E3 fixture evidence requires an exact clean committed candidate, not a pre-commit review diff."
    );
  }
  return identity;
}

function committedTreeEntries(repositoryRoot: string, commit: string) {
  return nulSeparated(
    gitBuffer(repositoryRoot, ["ls-tree", "-r", "--full-tree", "-z", commit])
  )
    .map((row) => {
      const match = /^(100644|100755) blob ([a-f0-9]+)\t(.+)$/u.exec(row);
      if (!match) {
        throw new Error("Candidate tree contains a symlink, submodule, or unsupported file mode.");
      }
      assertCanonicalRelativePath(match[3], "Candidate tree path");
      return { mode: match[1], objectId: match[2], path: match[3] };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function gitBlobObjectId(path: string, algorithm: "sha1" | "sha256") {
  const content = readFileSync(path);
  return createHash(algorithm)
    .update(`blob ${content.length}\0`)
    .update(content)
    .digest("hex");
}

function assertExtractedCandidateTreeMatches(
  repositoryRoot: string,
  commit: string,
  extractedRoot: string
) {
  assertSafeDirectory(extractedRoot, "Extracted candidate source");
  const objectFormat = gitText(repositoryRoot, ["rev-parse", "--show-object-format"]);
  if (objectFormat !== "sha1" && objectFormat !== "sha256") {
    throw new Error("Candidate repository uses an unsupported Git object format.");
  }
  const expected = committedTreeEntries(repositoryRoot, commit);
  const actual: Array<{ mode: string; objectId: string; path: string }> = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      const metadata = lstatSync(absolute);
      const path = relative(extractedRoot, absolute).replaceAll("\\", "/");
      assertCanonicalRelativePath(path, "Extracted candidate path");
      if (metadata.isSymbolicLink()) {
        throw new Error(`Extracted candidate contains a symlink: ${path}`);
      }
      if (metadata.isDirectory()) {
        visit(absolute);
      } else if (metadata.isFile() && metadata.nlink === 1) {
        const executable = process.platform !== "win32" && (metadata.mode & 0o111) !== 0;
        actual.push({
          mode: executable ? "100755" : "100644",
          objectId: gitBlobObjectId(absolute, objectFormat),
          path
        });
      } else {
        throw new Error(`Extracted candidate contains a hard link or special file: ${path}`);
      }
    }
  };
  visit(extractedRoot);
  actual.sort((left, right) => left.path.localeCompare(right.path));

  const comparableExpected = expected.map((entry) =>
    process.platform === "win32" ? { ...entry, mode: "100644" } : entry
  );
  if (JSON.stringify(actual) !== JSON.stringify(comparableExpected)) {
    throw new Error("Extracted source tree does not exactly match the committed candidate tree.");
  }
}

function assertRegularSingleLinkFile(path: string, label: string) {
  const metadata = lstatSync(path);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) {
    throw new Error(`${label} must be a regular, single-link file.`);
  }
  if (realpathSync.native(path) !== resolve(path)) {
    throw new Error(`${label} must not resolve through a symlink or alias.`);
  }
}

function assertExactKeys(record: Record<string, unknown>, keys: string[], label: string) {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} has an unknown or missing field.`);
  }
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function parseFixtureProvenance(path: string): FixtureProvenance {
  assertRegularSingleLinkFile(path, "Fixture provenance");
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error("Fixture provenance is malformed JSON.");
  }
  const record = asRecord(parsed, "Fixture provenance");
  assertExactKeys(
    record,
    [
      "schemaVersion",
      "fixtureFormatVersion",
      "historicalBaseSha",
      "rollbackCandidateCommitSha",
      "rollbackCandidateParentSha",
      "sourceMode",
      "candidateCommitFileSet",
      "candidateCommitDiffDigest",
      "rollbackPurpose",
      "buildIdentity",
      "reviewedFiles",
      "reviewedFilesAggregateSha256",
      "nextConfigSha256",
      "packageJsonSha256",
      "packageLockJsonSha256",
      "nextVersion",
      "buildId",
      "artifactManifest",
      "syntheticBuild",
      "productionAuthorityPresent",
      "outboundNetworkPolicy"
    ],
    "Fixture provenance"
  );
  if (!Array.isArray(record.reviewedFiles)) {
    throw new Error("Fixture provenance reviewedFiles must be an array.");
  }
  if (!Array.isArray(record.candidateCommitFileSet)) {
    throw new Error("Fixture provenance candidateCommitFileSet must be an array.");
  }
  const candidateCommitFileSet = record.candidateCommitFileSet.map((path, index) => {
    if (typeof path !== "string") {
      throw new Error(`Fixture provenance candidateCommitFileSet[${index}] is invalid.`);
    }
    assertCanonicalRelativePath(path, `Fixture provenance candidateCommitFileSet[${index}]`);
    return path;
  });
  const reviewedFiles = record.reviewedFiles.map((value, index) => {
    const entry = asRecord(value, `Fixture provenance reviewedFiles[${index}]`);
    assertExactKeys(entry, ["path", "sha256"], `Fixture provenance reviewedFiles[${index}]`);
    if (typeof entry.path !== "string" || typeof entry.sha256 !== "string") {
      throw new Error(`Fixture provenance reviewedFiles[${index}] has an invalid value.`);
    }
    assertCanonicalRelativePath(entry.path, `Fixture provenance reviewedFiles[${index}].path`);
    return { path: entry.path, sha256: entry.sha256 };
  });
  const manifestRecord = asRecord(record.artifactManifest, "Fixture artifact manifest");
  assertExactKeys(
    manifestRecord,
    ["algorithm", "digest", "fileCount", "entries"],
    "Fixture artifact manifest"
  );
  if (!Array.isArray(manifestRecord.entries)) {
    throw new Error("Fixture artifact manifest entries must be an array.");
  }
  const entries = manifestRecord.entries.map((value, index) => {
    const entry = asRecord(value, `Fixture artifact entry ${index}`);
    assertExactKeys(entry, ["path", "sha256", "size"], `Fixture artifact entry ${index}`);
    if (
      typeof entry.path !== "string" ||
      typeof entry.sha256 !== "string" ||
      typeof entry.size !== "number" ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0
    ) {
      throw new Error(`Fixture artifact entry ${index} has an invalid value.`);
    }
    assertCanonicalRelativePath(entry.path, `Fixture artifact entry ${index}.path`);
    if (!entry.path.startsWith(".next/") && !entry.path.startsWith("public/")) {
      throw new Error(`Fixture artifact entry ${index} is outside .next or public.`);
    }
    return { path: entry.path, sha256: entry.sha256, size: entry.size };
  });
  return {
    ...record,
    candidateCommitFileSet,
    reviewedFiles,
    artifactManifest: { ...manifestRecord, entries }
  } as FixtureProvenance;
}

function strictFixtureProvenance(
  source: string,
  repositoryRoot = process.cwd(),
  options: ReviewedSourceOptions = {}
) {
  const canonicalSource = resolve(source);
  assertSafeDirectory(canonicalSource, "Production fixture root");
  const provenance = parseFixtureProvenance(join(canonicalSource, PROVENANCE_FILE));
  const sourceIdentity = requireCommittedCandidate(repositoryRoot, options);

  if (provenance.schemaVersion !== PROVENANCE_SCHEMA_VERSION) {
    throw new Error("Fixture provenance schemaVersion is not supported.");
  }
  if (provenance.fixtureFormatVersion !== FIXTURE_FORMAT_VERSION) {
    throw new Error("Fixture format version is not the reviewed format.");
  }
  if (provenance.historicalBaseSha !== sourceIdentity.historicalBaseSha) {
    throw new Error("Fixture historical base SHA is not the reviewed production SHA.");
  }
  if (
    provenance.sourceMode !== "committed-candidate" ||
    provenance.rollbackCandidateCommitSha !== sourceIdentity.rollbackCandidateCommitSha ||
    provenance.rollbackCandidateParentSha !== sourceIdentity.rollbackCandidateParentSha ||
    JSON.stringify(provenance.candidateCommitFileSet) !==
      JSON.stringify(sourceIdentity.candidateCommitFileSet) ||
    provenance.candidateCommitDiffDigest !== sourceIdentity.candidateCommitDiffDigest
  ) {
    throw new Error("Fixture committed-candidate Git identity does not match the actual clean HEAD.");
  }
  if (provenance.rollbackPurpose !== ROLLBACK_PURPOSE) {
    throw new Error("Fixture rollback purpose is not the reviewed purpose.");
  }
  if (provenance.buildIdentity !== HISTORICAL_BUILD_IDENTITY) {
    throw new Error("Fixture build identity is not historical BCN.");
  }

  const expectedReviewed = sourceIdentity.reviewedFiles;
  const fixtureReviewed = reviewedFileIdentities(canonicalSource);
  if (
    JSON.stringify(provenance.reviewedFiles) !== JSON.stringify(expectedReviewed) ||
    JSON.stringify(fixtureReviewed) !== JSON.stringify(expectedReviewed)
  ) {
    throw new Error("Fixture reviewed file identities do not match the reviewed Phase E3 diff.");
  }
  const reviewedAggregate = sourceIdentity.reviewedFilesAggregateSha256;
  if (provenance.reviewedFilesAggregateSha256 !== reviewedAggregate) {
    throw new Error("Fixture reviewed-file aggregate digest does not match.");
  }
  const canonicalRepositoryRoot = resolve(repositoryRoot);
  const expectedNextConfigSha256 = hashFile(join(canonicalRepositoryRoot, "next.config.ts"));
  const expectedPackageJsonSha256 = hashFile(join(canonicalRepositoryRoot, "package.json"));
  const expectedPackageLockJsonSha256 = hashFile(
    join(canonicalRepositoryRoot, "package-lock.json")
  );
  if (
    provenance.nextConfigSha256 !== expectedNextConfigSha256 ||
    hashFile(join(canonicalSource, "next.config.ts")) !== expectedNextConfigSha256
  ) {
    throw new Error("Fixture next.config.ts digest does not match.");
  }
  if (
    provenance.packageJsonSha256 !== expectedPackageJsonSha256 ||
    hashFile(join(canonicalSource, "package.json")) !== expectedPackageJsonSha256
  ) {
    throw new Error("Fixture package.json digest does not match.");
  }
  if (
    provenance.packageLockJsonSha256 !== expectedPackageLockJsonSha256 ||
    hashFile(join(canonicalSource, "package-lock.json")) !== expectedPackageLockJsonSha256
  ) {
    throw new Error("Fixture package-lock.json digest does not match.");
  }

  const packageJson = JSON.parse(readFileSync(join(canonicalSource, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };
  const packageLock = JSON.parse(readFileSync(join(canonicalSource, "package-lock.json"), "utf8")) as {
    packages?: Record<string, { version?: string }>;
  };
  if (
    provenance.nextVersion !== REVIEWED_NEXT_VERSION ||
    packageJson.dependencies?.next !== REVIEWED_NEXT_VERSION ||
    packageLock.packages?.["node_modules/next"]?.version !== REVIEWED_NEXT_VERSION
  ) {
    throw new Error("Fixture Next.js identity is not exactly 15.5.15.");
  }

  const buildIdPath = join(canonicalSource, ".next", "BUILD_ID");
  assertRegularSingleLinkFile(buildIdPath, "Fixture BUILD_ID");
  const buildId = readFileSync(buildIdPath, "utf8");
  if (!buildId || buildId !== provenance.buildId) {
    throw new Error("Fixture BUILD_ID does not match provenance.");
  }

  const recomputedManifest = artifactManifest([
    { label: ".next", path: join(canonicalSource, ".next") },
    { label: "public", path: join(canonicalSource, "public") }
  ]);
  if (JSON.stringify(recomputedManifest) !== JSON.stringify(provenance.artifactManifest)) {
    throw new Error("Fixture artifact manifest does not match fixture contents.");
  }
  for (const forbiddenCache of ["fetch-cache", "images"]) {
    if (existsSync(join(canonicalSource, ".next", "cache", forbiddenCache))) {
      throw new Error(`Fixture contains forbidden persistent ${forbiddenCache} cache material.`);
    }
  }
  if (provenance.syntheticBuild !== true) {
    throw new Error("Fixture synthetic-build marker is absent or false.");
  }
  if (provenance.productionAuthorityPresent !== false) {
    throw new Error("Fixture provenance indicates production authority was present.");
  }
  if (provenance.outboundNetworkPolicy !== ISOLATED_NETWORK_POLICY) {
    throw new Error("Fixture outbound-network policy is missing or not isolated.");
  }
  return provenance;
}

function prepareProductionFixture(sourceRoot: string) {
  const source = resolve(sourceRoot);
  const sourceNext = join(source, ".next");
  const sourcePublic = join(source, "public");
  strictFixtureProvenance(source);

  const root = mkdtempSync(join(tmpdir(), "bcn-rollback-production-runtime-"));
  temporaryDirectories.push(root);
  cpSync(sourceNext, join(root, ".next"), { recursive: true });
  cpSync(sourcePublic, join(root, "public"), { recursive: true });
  // Next may leave build-time fetch-cache inputs in the disposable build tree.
  // They are build artifacts, not an approved writable or persistent runtime cache.
  rmSync(join(root, ".next", "cache", "fetch-cache"), { recursive: true, force: true });
  rmSync(join(root, ".next", "cache", "images"), { recursive: true, force: true });
  for (const file of ["next.config.ts", "package.json", "package-lock.json", "tsconfig.json"]) {
    cpSync(join(source, file), join(root, file));
  }
  symlinkSync(
    join(process.cwd(), "node_modules"),
    join(root, "node_modules"),
    process.platform === "win32" ? "junction" : "dir"
  );
  return root;
}

function buildFixtureProvenance(
  source: string,
  sourceIdentity: CommittedReviewedSourceIdentity
): FixtureProvenance {
  const reviewedFiles = reviewedFileIdentities(source);
  if (JSON.stringify(reviewedFiles) !== JSON.stringify(sourceIdentity.reviewedFiles)) {
    throw new Error("Fixture source reviewed files do not match the committed candidate.");
  }
  const buildId = readFileSync(join(source, ".next", "BUILD_ID"), "utf8");
  return {
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    fixtureFormatVersion: FIXTURE_FORMAT_VERSION,
    historicalBaseSha: sourceIdentity.historicalBaseSha,
    rollbackCandidateCommitSha: sourceIdentity.rollbackCandidateCommitSha,
    rollbackCandidateParentSha: sourceIdentity.rollbackCandidateParentSha,
    sourceMode: "committed-candidate",
    candidateCommitFileSet: sourceIdentity.candidateCommitFileSet,
    candidateCommitDiffDigest: sourceIdentity.candidateCommitDiffDigest,
    rollbackPurpose: ROLLBACK_PURPOSE,
    buildIdentity: HISTORICAL_BUILD_IDENTITY,
    reviewedFiles,
    reviewedFilesAggregateSha256: sourceIdentity.reviewedFilesAggregateSha256,
    nextConfigSha256: hashFile(join(source, "next.config.ts")),
    packageJsonSha256: hashFile(join(source, "package.json")),
    packageLockJsonSha256: hashFile(join(source, "package-lock.json")),
    nextVersion: REVIEWED_NEXT_VERSION,
    buildId,
    artifactManifest: artifactManifest([
      { label: ".next", path: join(source, ".next") },
      { label: "public", path: join(source, "public") }
    ]),
    syntheticBuild: true,
    productionAuthorityPresent: false,
    outboundNetworkPolicy: ISOLATED_NETWORK_POLICY
  };
}

function writeFixtureProvenance(source: string, provenance: FixtureProvenance) {
  writeFileSync(join(source, PROVENANCE_FILE), `${JSON.stringify(provenance, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
}

function temporaryGit(repositoryRoot: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...safeOsEnvironment(),
      NODE_ENV: "test",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: join(repositoryRoot, ".missing-global-gitconfig")
    }
  }).trim();
}

function createTemporaryCandidateRepository(options: {
  preserveForSuite?: boolean;
  intermediateCommit?: boolean;
  candidateFiles?: readonly string[];
  extraCandidateFile?: string;
  changePackageJson?: boolean;
  changePackageLock?: boolean;
  alterReviewedFile?: string;
  renameReviewedFile?: string;
  dirtyFile?: string;
  stagedFile?: string;
  untrackedFile?: string;
} = {}): TemporaryCandidateRepository {
  const root = mkdtempSync(join(tmpdir(), "phase-e3-candidate-git-"));
  (options.preserveForSuite ? suiteDirectories : temporaryDirectories).push(root);
  temporaryGit(root, ["init", "--quiet"]);
  temporaryGit(root, ["config", "user.name", "Phase E3 Synthetic Review"]);
  temporaryGit(root, ["config", "user.email", "phase-e3@example.invalid"]);
  temporaryGit(root, ["config", "core.autocrlf", "false"]);

  for (const file of ["package.json", "package-lock.json", "tsconfig.json"]) {
    copyFileSync(join(process.cwd(), file), join(root, file));
  }
  writeFileSync(
    join(root, "next.config.ts"),
    gitBuffer(process.cwd(), ["show", `${HISTORICAL_APPLICATION_SHA}:next.config.ts`])
  );
  if (options.renameReviewedFile) {
    writeFileSync(
      join(root, "legacy-reviewed-file.ts"),
      readFileSync(join(process.cwd(), options.renameReviewedFile))
    );
  }
  temporaryGit(root, ["add", "--", "next.config.ts", "package.json", "package-lock.json", "tsconfig.json"]);
  if (options.renameReviewedFile) {
    temporaryGit(root, ["add", "--", "legacy-reviewed-file.ts"]);
  }
  temporaryGit(root, ["commit", "--quiet", "-m", "Historical synthetic base"]);
  const historicalBaseSha = temporaryGit(root, ["rev-parse", "HEAD"]);

  if (options.intermediateCommit) {
    writeFileSync(join(root, "intermediate.txt"), "unrelated intermediate commit\n");
    temporaryGit(root, ["add", "--", "intermediate.txt"]);
    temporaryGit(root, ["commit", "--quiet", "-m", "Unrelated intermediate commit"]);
  }

  const candidateFiles = options.candidateFiles ?? REVIEWED_CHANGED_FILES;
  for (const file of candidateFiles) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(process.cwd(), file), join(root, file));
  }
  if (options.renameReviewedFile) {
    mkdirSync(dirname(join(root, options.renameReviewedFile)), { recursive: true });
    temporaryGit(root, ["mv", "--", "legacy-reviewed-file.ts", options.renameReviewedFile]);
  }
  if (options.alterReviewedFile) {
    writeFileSync(join(root, options.alterReviewedFile), "reviewed content was amended\n");
  }
  if (options.extraCandidateFile) {
    mkdirSync(dirname(join(root, options.extraCandidateFile)), { recursive: true });
    writeFileSync(join(root, options.extraCandidateFile), "unexpected candidate content\n");
  }
  if (options.changePackageJson) {
    writeFileSync(join(root, "package.json"), `${readFileSync(join(root, "package.json"), "utf8")}\n`);
  }
  if (options.changePackageLock) {
    writeFileSync(
      join(root, "package-lock.json"),
      `${readFileSync(join(root, "package-lock.json"), "utf8")}\n`
    );
  }
  temporaryGit(root, ["add", "--all"]);
  temporaryGit(root, ["commit", "--quiet", "-m", "Synthetic rollback candidate"]);
  const candidateCommitSha = temporaryGit(root, ["rev-parse", "HEAD"]);

  if (options.dirtyFile) {
    writeFileSync(join(root, options.dirtyFile), "dirty candidate content\n");
  }
  if (options.stagedFile) {
    writeFileSync(join(root, options.stagedFile), "staged candidate content\n");
    temporaryGit(root, ["add", "--", options.stagedFile]);
  }
  if (options.untrackedFile) {
    writeFileSync(join(root, options.untrackedFile), "untracked candidate content\n");
  }
  return { root, historicalBaseSha, candidateCommitSha };
}

let fixtureCandidateRepository: TemporaryCandidateRepository;

function fixtureCandidateIdentity() {
  return requireCommittedCandidate(fixtureCandidateRepository.root, {
    historicalBaseSha: fixtureCandidateRepository.historicalBaseSha,
    reviewedContentRoot: process.cwd()
  });
}

function validateSyntheticFixture(source: string) {
  return strictFixtureProvenance(source, fixtureCandidateRepository.root, {
    historicalBaseSha: fixtureCandidateRepository.historicalBaseSha,
    reviewedContentRoot: process.cwd()
  });
}

function createSyntheticFixture() {
  const source = mkdtempSync(join(tmpdir(), "bcn-rollback-provenance-fixture-"));
  temporaryDirectories.push(source);
  mkdirSync(join(source, ".next", "server"), { recursive: true });
  mkdirSync(join(source, "public"), { recursive: true });
  writeFileSync(join(source, ".next", "BUILD_ID"), "phase-e3-synthetic-build-id");
  writeFileSync(join(source, ".next", "server", "app.js"), "module.exports = 'historical-bcn';\n");
  writeFileSync(join(source, "public", "fixture.txt"), "synthetic historical BCN fixture\n");
  for (const file of [
    ...REVIEWED_CHANGED_FILES,
    "package.json",
    "package-lock.json",
    "tsconfig.json"
  ]) {
    mkdirSync(dirname(join(source, file)), { recursive: true });
    copyFileSync(join(fixtureCandidateRepository.root, file), join(source, file));
  }
  writeFixtureProvenance(source, buildFixtureProvenance(source, fixtureCandidateIdentity()));
  return source;
}

function replaceFixtureProvenance(
  source: string,
  mutate: (provenance: FixtureProvenance) => FixtureProvenance
) {
  const provenancePath = join(source, PROVENANCE_FILE);
  const provenance = JSON.parse(readFileSync(provenancePath, "utf8")) as FixtureProvenance;
  rmSync(provenancePath);
  writeFixtureProvenance(source, mutate(provenance));
}

function assertIsolatedLinuxBuildNetwork() {
  if (process.platform !== "linux") {
    throw new Error(
      "Phase E3 fixture generation requires Linux loopback-only network isolation; Windows generation is refused."
    );
  }
  const interfaces = readdirSync("/sys/class/net").sort();
  if (JSON.stringify(interfaces) !== JSON.stringify(["lo"])) {
    throw new Error("Phase E3 fixture generation requires a network namespace containing only lo.");
  }
  const ipv4Routes = readFileSync("/proc/net/route", "utf8")
    .split(/\r?\n/u)
    .slice(1)
    .filter((line) => line.trim());
  const ipv6Routes = readFileSync("/proc/net/ipv6_route", "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim());
  if (
    ipv4Routes.some((line) => !/^lo\s/u.test(line.trim())) ||
    ipv6Routes.some((line) => !/\slo\s*$/u.test(line.trim()))
  ) {
    throw new Error("Phase E3 fixture generation detected a non-loopback network route.");
  }
}

function createGoogleFontMock(source: string) {
  const mockPath = join(source, ".phase-e3-next-font-mock.cjs");
  const responses = {
    "https://fonts.googleapis.com/css2?family=Sora:wght@100..800&display=swap":
      "@font-face{font-family:'Sora';font-style:normal;font-weight:100 800;src:url(phase-e3-sora.woff2) format('woff2');}",
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap":
      "@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:200 800;src:url(phase-e3-jakarta.woff2) format('woff2');}"
  };
  writeFileSync(mockPath, `module.exports = ${JSON.stringify(responses)};\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  return mockPath;
}

function generateFreshProductionFixture(destination: string) {
  const sourceIdentity = requireCommittedCandidate();
  assertIsolatedLinuxBuildNetwork();
  const target = resolve(destination);
  if (existsSync(target)) {
    throw new Error("Fixture destination already exists; failed fixture directories are never reused.");
  }
  assertSafeDirectory(dirname(target), "Fixture destination parent");

  const staging = mkdtempSync(join(tmpdir(), "bcn-rollback-fixture-generator-"));
  temporaryDirectories.push(staging);
  const archivePath = join(staging, "historical-source.tar");
  execFileSync(
    "git",
    [
      "archive",
      "--format=tar",
      `--output=${archivePath}`,
      sourceIdentity.rollbackCandidateCommitSha
    ],
    { cwd: process.cwd(), stdio: "ignore" }
  );
  mkdirSync(target, { mode: 0o700 });
  execFileSync("tar", ["-xf", archivePath, "-C", target], { stdio: "ignore" });
  assertExtractedCandidateTreeMatches(
    process.cwd(),
    sourceIdentity.rollbackCandidateCommitSha,
    target
  );
  for (const forbidden of [".env", ".env.local", ".env.production", ".next", "node_modules"]) {
    if (existsSync(join(target, forbidden))) {
      throw new Error(`Fresh fixture source unexpectedly contains ${forbidden}.`);
    }
  }
  if (
    JSON.stringify(reviewedFileIdentities(target)) !==
    JSON.stringify(sourceIdentity.reviewedFiles)
  ) {
    throw new Error("Fresh candidate archive does not match the committed Phase E3 files.");
  }
  for (const file of ["package.json", "package-lock.json", "next.config.ts"]) {
    if (hashFile(join(target, file)) !== hashFile(join(process.cwd(), file))) {
      throw new Error(`Fresh candidate archive does not match committed ${file}.`);
    }
  }

  const buildHome = join(staging, "home");
  const npmCache = process.env.PHASE_E3_OFFLINE_NPM_CACHE_ROOT?.trim();
  if (!npmCache) {
    throw new Error("PHASE_E3_OFFLINE_NPM_CACHE_ROOT is required for isolated offline npm ci.");
  }
  assertSafeDirectory(resolve(npmCache), "Offline npm cache");
  mkdirSync(buildHome, { mode: 0o700 });
  const npmUserConfig = join(buildHome, ".npmrc");
  writeFileSync(npmUserConfig, "offline=true\naudit=false\nfund=false\nupdate-notifier=false\n", {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  const fontMock = createGoogleFontMock(target);
  const buildEnvironment: NodeJS.ProcessEnv = {
    ...safeProductionEnvironment(1),
    HOME: buildHome,
    USERPROFILE: buildHome,
    NPM_CONFIG_USERCONFIG: npmUserConfig,
    NPM_CONFIG_CACHE: resolve(npmCache),
    NPM_CONFIG_OFFLINE: "true",
    NPM_CONFIG_AUDIT: "false",
    NPM_CONFIG_FUND: "false",
    NPM_CONFIG_UPDATE_NOTIFIER: "false",
    NEXT_FONT_GOOGLE_MOCKED_RESPONSES: fontMock
  };
  execFileSync("npm", ["ci", "--offline", "--no-audit", "--no-fund"], {
    cwd: target,
    env: buildEnvironment,
    stdio: "inherit"
  });
  execFileSync("npm", ["run", "build"], {
    cwd: target,
    env: buildEnvironment,
    stdio: "inherit"
  });
  rmSync(fontMock);
  rmSync(join(target, ".next", "cache", "fetch-cache"), { recursive: true, force: true });
  rmSync(join(target, ".next", "cache", "images"), { recursive: true, force: true });
  if (!existsSync(join(target, ".next", "BUILD_ID"))) {
    throw new Error("Fixture build did not produce .next/BUILD_ID.");
  }
  writeFixtureProvenance(target, buildFixtureProvenance(target, sourceIdentity));
  strictFixtureProvenance(target);
}

function imageFormat(contentType: string | string[] | undefined, body: Buffer) {
  const type = Array.isArray(contentType) ? contentType[0] : contentType?.split(";", 1)[0];
  if (body.length < 32) throw new Error("Optimised image payload is unreasonably small.");
  const png = body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  const webp = body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP";
  const avif = body.subarray(4, 8).toString("ascii") === "ftyp" && ["avif", "avis"].includes(body.subarray(8, 12).toString("ascii"));
  const detected = png ? "image/png" : jpeg ? "image/jpeg" : webp ? "image/webp" : avif ? "image/avif" : undefined;
  if (!detected || detected !== type) {
    throw new Error("Optimised image content-type does not match its file signature.");
  }
  return detected;
}

async function assertPortReleased(port: number) {
  const server = net.createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => server.close((error) => (error ? reject(error) : resolveListen())));
  });
}

beforeAll(() => {
  fixtureCandidateRepository = createTemporaryCandidateRepository({ preserveForSuite: true });
});

afterEach(() => {
  delete nextGlobal.__incrementalCache;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

afterAll(() => {
  for (const directory of suiteDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("rollback immutable runtime configuration and installed implementation guard", () => {
  it("resolves the reviewed historical production configuration through Next itself", async () => {
    const resolvedConfig = await loadConfig(PHASE_PRODUCTION_SERVER, process.cwd(), { silent: true });

    expect(HISTORICAL_APPLICATION_SHA).toHaveLength(40);
    expect(nextPackage.version).toBe(REVIEWED_NEXT_VERSION);
    expect(resolvedConfig.experimental.isrFlushToDisk).toBe(false);
    expect(resolvedConfig.cacheMaxMemorySize).toBe(RUNTIME_INCREMENTAL_CACHE_MAX_BYTES);
  });

  it("guards the production, route, file and image cache propagation paths", () => {
    const nextServer = readInstalledNextImplementation("server", "next-server.js");
    const routeModule = readInstalledNextImplementation("server", "route-modules", "route-module.js");
    const fileSystemCache = readInstalledNextImplementation(
      "server",
      "lib",
      "incremental-cache",
      "file-system-cache.js"
    );
    const imageOptimizer = readInstalledNextImplementation("server", "image-optimizer.js");

    expect(nextPackage.version).toBe(REVIEWED_NEXT_VERSION);
    expect(nextServer).toMatch(/maxMemoryCacheSize:\s*this\.nextConfig\.cacheMaxMemorySize/);
    expect(nextServer).toMatch(
      /flushToDisk:\s*!this\.minimalMode\s*&&\s*this\.nextConfig\.experimental\.isrFlushToDisk/
    );
    expect(routeModule).toMatch(/flushToDisk:\s*nextConfig\.experimental\.isrFlushToDisk/);
    expect(fileSystemCache).toMatch(/if\s*\(!this\.flushToDisk\s*\|\|\s*!data\)\s*return/);
    expect(imageOptimizer).toMatch(
      /maximumDiskCacheSize\s*!==\s*0\s*&&\s*nextConfig\.experimental\.isrFlushToDisk/
    );
    expect(imageOptimizer).toMatch(
      /if\s*\(!this\.nextConfig\.experimental\.isrFlushToDisk\)\s*\{\s*return/
    );
  });

  it("does not treat BUILD_ID as sufficient runtime integrity evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "bcn-rollback-integrity-"));
    temporaryDirectories.push(root);
    mkdirSync(join(root, ".next", "server"), { recursive: true });
    const buildId = join(root, ".next", "BUILD_ID");
    const executable = join(root, ".next", "server", "app.js");
    writeFileSync(buildId, "unchanged-build-id");
    writeFileSync(executable, "module.exports = 'first';");
    const before = contentManifest([{ label: "runtime", path: join(root, ".next") }]);
    writeFileSync(executable, "module.exports = 'other';");
    const after = contentManifest([{ label: "runtime", path: join(root, ".next") }]);

    expect(readFileSync(buildId, "utf8")).toBe("unchanged-build-id");
    expect(after.digest).not.toBe(before.digest);
  });
});

describe("Phase E3 reviewed source identity resolver", () => {
  const resolveTemporaryCandidate = (repository: TemporaryCandidateRepository) =>
    resolveReviewedSourceIdentity(repository.root, {
      historicalBaseSha: repository.historicalBaseSha,
      reviewedContentRoot: process.cwd()
    });

  it("accepts the exact pre-commit review state", () => {
    const repository = createTemporaryCandidateRepository();
    temporaryGit(repository.root, ["reset", "--quiet", "--mixed", repository.historicalBaseSha]);
    const identity = resolveTemporaryCandidate(repository);

    expect(identity.sourceMode).toBe("pre-commit-review");
    expect(identity.historicalBaseSha).toBe(repository.historicalBaseSha);
    expect(identity.reviewedFiles.map((file) => file.path)).toEqual(
      [...REVIEWED_CHANGED_FILES].sort()
    );
  });

  it("accepts a clean one-commit candidate with the exact parent and file set", () => {
    const repository = createTemporaryCandidateRepository();
    const identity = resolveTemporaryCandidate(repository);

    expect(identity).toMatchObject({
      sourceMode: "committed-candidate",
      historicalBaseSha: repository.historicalBaseSha,
      rollbackCandidateCommitSha: repository.candidateCommitSha,
      rollbackCandidateParentSha: repository.historicalBaseSha,
      candidateCommitFileSet: [...REVIEWED_CHANGED_FILES].sort()
    });
    expect(
      identity.sourceMode === "committed-candidate" && identity.candidateCommitDiffDigest
    ).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("verifies the complete extracted source tree against the candidate commit", () => {
    const repository = createTemporaryCandidateRepository();
    const staging = mkdtempSync(join(tmpdir(), "phase-e3-tree-verification-"));
    temporaryDirectories.push(staging);
    const archive = join(staging, "candidate.tar");
    const extracted = join(staging, "extracted");
    mkdirSync(extracted);
    execFileSync(
      "git",
      ["archive", "--format=tar", `--output=${archive}`, repository.candidateCommitSha],
      { cwd: repository.root, stdio: "ignore" }
    );
    execFileSync("tar", ["-xf", archive, "-C", extracted], { stdio: "ignore" });

    expect(() =>
      assertExtractedCandidateTreeMatches(
        repository.root,
        repository.candidateCommitSha,
        extracted
      )
    ).not.toThrow();
    writeFileSync(join(extracted, "next.config.ts"), "tampered extracted source\n");
    expect(() =>
      assertExtractedCandidateTreeMatches(
        repository.root,
        repository.candidateCommitSha,
        extracted
      )
    ).toThrow(/does not exactly match/u);
    copyFileSync(join(repository.root, "next.config.ts"), join(extracted, "next.config.ts"));
    writeFileSync(join(extracted, "unexpected.ts"), "unexpected extracted source\n");
    expect(() =>
      assertExtractedCandidateTreeMatches(
        repository.root,
        repository.candidateCommitSha,
        extracted
      )
    ).toThrow(/does not exactly match/u);
  });

  it("rejects a candidate whose parent is not the approved base", () => {
    const repository = createTemporaryCandidateRepository();
    expect(() =>
      resolveReviewedSourceIdentity(repository.root, {
        historicalBaseSha: "0".repeat(40),
        reviewedContentRoot: process.cwd()
      })
    ).toThrow(/parent is not/u);
  });

  it("rejects a merge commit", () => {
    const repository = createTemporaryCandidateRepository();
    temporaryGit(repository.root, ["checkout", "--quiet", "-b", "synthetic-side", repository.historicalBaseSha]);
    writeFileSync(join(repository.root, "side.txt"), "synthetic side commit\n");
    temporaryGit(repository.root, ["add", "--", "side.txt"]);
    temporaryGit(repository.root, ["commit", "--quiet", "-m", "Synthetic side commit"]);
    const sideCommit = temporaryGit(repository.root, ["rev-parse", "HEAD"]);
    temporaryGit(repository.root, ["checkout", "--quiet", "-b", "synthetic-merge", repository.candidateCommitSha]);
    temporaryGit(repository.root, ["merge", "--quiet", "--no-ff", "-m", "Synthetic merge", sideCommit]);

    expect(() => resolveTemporaryCandidate(repository)).toThrow(/non-merge commit/u);
  });

  it("rejects two commits after the historical base", () => {
    const repository = createTemporaryCandidateRepository({ intermediateCommit: true });
    expect(() => resolveTemporaryCandidate(repository)).toThrow(/parent is not/u);
  });

  it("rejects a clean unrelated candidate commit", () => {
    const repository = createTemporaryCandidateRepository({
      candidateFiles: [],
      extraCandidateFile: "unrelated.ts"
    });
    expect(() => resolveTemporaryCandidate(repository)).toThrow(/not exactly/u);
  });

  it("rejects a fourth committed file", () => {
    const repository = createTemporaryCandidateRepository({ extraCandidateFile: "fourth.ts" });
    expect(() => resolveTemporaryCandidate(repository)).toThrow(/not exactly/u);
  });

  it("rejects a candidate missing a reviewed file", () => {
    const repository = createTemporaryCandidateRepository({
      candidateFiles: REVIEWED_CHANGED_FILES.slice(0, 2)
    });
    expect(() => resolveTemporaryCandidate(repository)).toThrow(/not exactly/u);
  });

  it("rejects a renamed reviewed file", () => {
    const renamed = REVIEWED_CHANGED_FILES[0];
    const repository = createTemporaryCandidateRepository({
      candidateFiles: REVIEWED_CHANGED_FILES.filter((file) => file !== renamed),
      renameReviewedFile: renamed
    });
    expect(() => resolveTemporaryCandidate(repository)).toThrow(/not exactly/u);
  });

  it.each([
    ["package.json", { changePackageJson: true }],
    ["package-lock.json", { changePackageLock: true }]
  ])("rejects a candidate that also changes %s", (_name, options) => {
    const repository = createTemporaryCandidateRepository(options);
    expect(() => resolveTemporaryCandidate(repository)).toThrow(/not exactly/u);
  });

  it.each([
    ["dirty worktree", { dirtyFile: "next.config.ts" }],
    ["staged change", { stagedFile: "staged-change.ts" }],
    ["untracked application file", { untrackedFile: "untracked-change.ts" }]
  ])("rejects a committed candidate with a %s", (_name, options) => {
    const repository = createTemporaryCandidateRepository(options);
    expect(() => resolveTemporaryCandidate(repository)).toThrow(/completely clean/u);
  });

  it("rejects an amended candidate with different reviewed content", () => {
    const repository = createTemporaryCandidateRepository({ alterReviewedFile: "next.config.ts" });
    expect(() => resolveTemporaryCandidate(repository)).toThrow(/does not match/u);
  });

  it("rejects the forward application SHA as the historical parent", () => {
    const repository = createTemporaryCandidateRepository();
    expect(() =>
      resolveReviewedSourceIdentity(repository.root, {
        historicalBaseSha: FORWARD_APPLICATION_SHA,
        reviewedContentRoot: process.cwd()
      })
    ).toThrow(/parent is not/u);
  });

  it("does not permit pre-commit review mode to generate final fixture evidence", () => {
    const repository = createTemporaryCandidateRepository();
    temporaryGit(repository.root, ["reset", "--quiet", "--mixed", repository.historicalBaseSha]);
    expect(resolveTemporaryCandidate(repository).sourceMode).toBe("pre-commit-review");
    expect(() =>
      requireCommittedCandidate(repository.root, {
        historicalBaseSha: repository.historicalBaseSha,
        reviewedContentRoot: process.cwd()
      })
    ).toThrow(/exact clean committed candidate/u);
  });
});

describe("Phase E3 production fixture provenance", () => {
  it("accepts a structurally complete fixture bound to the current reviewed files", () => {
    const source = createSyntheticFixture();
    expect(validateSyntheticFixture(source).historicalBaseSha).toBe(
      fixtureCandidateRepository.historicalBaseSha
    );
  });

  it.each([
    {
      name: "forward application identity",
      mutate: (value: FixtureProvenance) => ({
        ...value,
        historicalBaseSha: FORWARD_APPLICATION_SHA,
        buildIdentity: "circle-card-forward"
      }),
      error: /historical base SHA/u
    },
    {
      name: "wrong historical base",
      mutate: (value: FixtureProvenance) => ({ ...value, historicalBaseSha: "0".repeat(40) }),
      error: /historical base SHA/u
    },
    {
      name: "candidate SHA differing from actual HEAD",
      mutate: (value: FixtureProvenance) => ({
        ...value,
        rollbackCandidateCommitSha: FORWARD_APPLICATION_SHA
      }),
      error: /committed-candidate Git identity/u
    },
    {
      name: "candidate parent differing from actual parent",
      mutate: (value: FixtureProvenance) => ({
        ...value,
        rollbackCandidateParentSha: "0".repeat(40)
      }),
      error: /committed-candidate Git identity/u
    },
    {
      name: "candidate diff digest differing from actual commit",
      mutate: (value: FixtureProvenance) => ({
        ...value,
        candidateCommitDiffDigest: "0".repeat(64)
      }),
      error: /committed-candidate Git identity/u
    },
    {
      name: "candidate commit file set containing a fourth path",
      mutate: (value: FixtureProvenance) => ({
        ...value,
        candidateCommitFileSet: [...value.candidateCommitFileSet, "fourth.ts"]
      }),
      error: /committed-candidate Git identity/u
    },
    {
      name: "pre-commit provenance source mode",
      mutate: (value: FixtureProvenance) => ({
        ...value,
        sourceMode: "pre-commit-review" as FixtureProvenance["sourceMode"]
      }),
      error: /committed-candidate Git identity/u
    },
    {
      name: "standalone Circle Card build identity",
      mutate: (value: FixtureProvenance) => ({ ...value, buildIdentity: "circle-card" }),
      error: /build identity/u
    },
    {
      name: "wrong Next.js identity",
      mutate: (value: FixtureProvenance) => ({ ...value, nextVersion: "15.5.16" }),
      error: /Next.js identity/u
    },
    {
      name: "stale reviewed-file aggregate",
      mutate: (value: FixtureProvenance) => ({
        ...value,
        reviewedFilesAggregateSha256: "0".repeat(64)
      }),
      error: /reviewed-file aggregate/u
    },
    {
      name: "missing synthetic-build marker",
      mutate: (value: FixtureProvenance) => ({ ...value, syntheticBuild: false }),
      error: /synthetic-build marker/u
    },
    {
      name: "production authority present",
      mutate: (value: FixtureProvenance) => ({ ...value, productionAuthorityPresent: true }),
      error: /production authority/u
    },
    {
      name: "unrestricted outbound network policy",
      mutate: (value: FixtureProvenance) => ({
        ...value,
        outboundNetworkPolicy: "unrestricted"
      }),
      error: /outbound-network policy/u
    },
    {
      name: "unknown provenance schema",
      mutate: (value: FixtureProvenance) => ({ ...value, schemaVersion: 2 }),
      error: /schemaVersion/u
    }
  ])("rejects $name", ({ mutate, error }) => {
    const source = createSyntheticFixture();
    replaceFixtureProvenance(source, mutate);
    expect(() => validateSyntheticFixture(source)).toThrow(error);
  });

  it.each([
    {
      name: "next.config.ts",
      path: "next.config.ts",
      content: "export default {};\n",
      error: /reviewed file identities/u
    },
    {
      name: "package-lock.json",
      path: "package-lock.json",
      content: "{}\n",
      error: /package-lock.json digest/u
    },
    {
      name: "package.json",
      path: "package.json",
      content: "{}\n",
      error: /package.json digest/u
    },
    {
      name: "BUILD_ID",
      path: ".next/BUILD_ID",
      content: "changed-build-id",
      error: /BUILD_ID/u
    },
    {
      name: "compiled artifact",
      path: ".next/server/app.js",
      content: "module.exports = 'tampered';\n",
      error: /artifact manifest/u
    }
  ])("rejects changed $name after provenance generation", ({ path, content, error }) => {
    const source = createSyntheticFixture();
    writeFileSync(join(source, path), content);
    expect(() => validateSyntheticFixture(source)).toThrow(error);
  });

  it("rejects malformed provenance before inspecting or executing the fixture", () => {
    const source = createSyntheticFixture();
    writeFileSync(join(source, PROVENANCE_FILE), "{malformed");
    expect(() => validateSyntheticFixture(source)).toThrow(/malformed JSON/u);
  });

  it("rejects a missing provenance record", () => {
    const source = createSyntheticFixture();
    rmSync(join(source, PROVENANCE_FILE));
    expect(() => validateSyntheticFixture(source)).toThrow();
  });

  it("rejects additional reviewed-file identities", () => {
    const source = createSyntheticFixture();
    replaceFixtureProvenance(source, (value) => ({
      ...value,
      reviewedFiles: [
        ...value.reviewedFiles,
        { path: "src/unreviewed-change.ts", sha256: "0".repeat(64) }
      ]
    }));
    expect(() => validateSyntheticFixture(source)).toThrow(/reviewed file identities/u);
  });

  it("rejects artifact hard links where the local filesystem exposes link counts", () => {
    const source = createSyntheticFixture();
    const original = join(source, ".next", "server", "app.js");
    const linked = join(source, ".next", "server", "linked.js");
    linkSync(original, linked);
    expect(() => validateSyntheticFixture(source)).toThrow(/hard-linked file/u);
  });

  it("rejects symlinked artifact entries", () => {
    const source = createSyntheticFixture();
    symlinkSync(
      join(source, "public"),
      join(source, ".next", "server", "linked-public"),
      process.platform === "win32" ? "junction" : "dir"
    );
    expect(() => validateSyntheticFixture(source)).toThrow(/unexpected symlink/u);
  });

  it("rejects a hard-linked provenance file", () => {
    const source = createSyntheticFixture();
    const provenancePath = join(source, PROVENANCE_FILE);
    const secondLink = join(source, "provenance-second-link.json");
    linkSync(provenancePath, secondLink);
    expect(() => validateSyntheticFixture(source)).toThrow(/regular, single-link file/u);
  });

  it("rejects a symlinked provenance path", () => {
    const source = createSyntheticFixture();
    const provenancePath = join(source, PROVENANCE_FILE);
    const redirected = join(source, "redirected-provenance");
    rmSync(provenancePath);
    mkdirSync(redirected);
    symlinkSync(redirected, provenancePath, process.platform === "win32" ? "junction" : "dir");
    expect(() => validateSyntheticFixture(source)).toThrow(/regular, single-link file/u);
  });

  it("rejects sealed fetch or image cache material", () => {
    const source = createSyntheticFixture();
    rmSync(join(source, PROVENANCE_FILE));
    mkdirSync(join(source, ".next", "cache", "images"), { recursive: true });
    writeFileSync(join(source, ".next", "cache", "images", "entry"), "not runtime-approved");
    writeFixtureProvenance(source, buildFixtureProvenance(source, fixtureCandidateIdentity()));
    expect(() => validateSyntheticFixture(source)).toThrow(/forbidden persistent images/u);
  });

  it("rejects fixture generation on a platform without loopback-only Linux isolation", () => {
    if (process.platform === "linux") return;
    expect(() => assertIsolatedLinuxBuildNetwork()).toThrow(/Windows generation is refused/u);
  });
});

describe("Phase E3 production fixture generator", () => {
  fixtureGenerationIt(
    "builds and seals a fresh fixture only inside a loopback-only Linux network namespace",
    () => {
      generateFreshProductionFixture(fixtureGenerationRoot as string);
      expect(strictFixtureProvenance(resolve(fixtureGenerationRoot as string))).toMatchObject({
        historicalBaseSha: HISTORICAL_APPLICATION_SHA,
        buildIdentity: HISTORICAL_BUILD_IDENTITY,
        outboundNetworkPolicy: ISOLATED_NETWORK_POLICY
      });
    },
    1_800_000
  );
});

describe("optimised image signature validation", () => {
  it.each([
    ["image/png", Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])],
    ["image/jpeg", Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(36)])],
    ["image/webp", Buffer.concat([Buffer.from("RIFF0000WEBP", "ascii"), Buffer.alloc(32)])],
    ["image/avif", Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypavif", "ascii"), Buffer.alloc(28)])]
  ])("accepts a valid %s signature", (contentType, body) => {
    expect(imageFormat(contentType, body)).toBe(contentType);
  });

  it("rejects empty, corrupt and content-type-mismatched payloads", () => {
    expect(() => imageFormat("image/png", Buffer.alloc(0))).toThrow(/unreasonably small/u);
    expect(() => imageFormat("image/png", Buffer.alloc(64))).toThrow(/does not match/u);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(36)]);
    expect(() => imageFormat("image/webp", jpeg)).toThrow(/does not match/u);
  });
});

describe("rollback immutable runtime internal cache behavior", () => {
  it("keeps unstable_cache entries in memory and honours tag invalidation", async () => {
    const { workAsyncStorage } = await import(
      "next/dist/server/app-render/work-async-storage.external"
    );
    const { executeRevalidates } = await import("next/dist/server/revalidation-utils");
    const { revalidateTag, unstable_cache } = await import("next/cache");
    const { root, serverDistDir } = createTemporaryDistDir();
    const cache = createMemoryOnlyIncrementalCache(serverDistDir);
    nextGlobal.__incrementalCache = cache;
    const unique = `${process.pid}-${Date.now()}-${Math.random()}`;
    const tag = `rollback-immutable-runtime:${unique}`;
    let loads = 0;
    const read = unstable_cache(async () => ({ loads: ++loads }), [unique], {
      tags: [tag],
      revalidate: 60
    });

    expect(await read()).toEqual({ loads: 1 });
    expect(await read()).toEqual({ loads: 1 });
    const workStore = {
      route: "/rollback-immutable-runtime-test",
      incrementalCache: cache,
      pendingRevalidatedTags: [] as string[],
      pendingRevalidates: {},
      pendingRevalidateWrites: [] as Promise<unknown>[]
    } as unknown as Parameters<typeof executeRevalidates>[0];
    workAsyncStorage.run(workStore, () => revalidateTag(tag));
    await executeRevalidates(workStore);

    expect(await read()).toEqual({ loads: 2 });
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

  it("turns revalidatePath into an in-memory invalidation", async () => {
    const { workAsyncStorage } = await import(
      "next/dist/server/app-render/work-async-storage.external"
    );
    const { executeRevalidates } = await import("next/dist/server/revalidation-utils");
    const { revalidatePath } = await import("next/cache");
    const { root, serverDistDir } = createTemporaryDistDir();
    const cache = createMemoryOnlyIncrementalCache(serverDistDir);
    const key = `path-${process.pid}-${Date.now()}-${Math.random()}`;
    const pathTag = "_N_T_/dashboard";

    await cache.set(key, createFetchValue({ membership: "historical" }), {
      fetchCache: true,
      tags: [pathTag]
    });
    expect(
      await cache.get(key, { kind: INCREMENTAL_FETCH_KIND, tags: [pathTag], softTags: [] })
    ).not.toBeNull();

    const workStore = {
      route: "/rollback-immutable-runtime-test",
      incrementalCache: cache,
      pendingRevalidatedTags: [] as string[],
      pendingRevalidates: {},
      pendingRevalidateWrites: [] as Promise<unknown>[]
    } as unknown as Parameters<typeof executeRevalidates>[0];
    workAsyncStorage.run(workStore, () => revalidatePath("/dashboard"));
    await executeRevalidates(workStore);

    expect(
      await cache.get(key, { kind: INCREMENTAL_FETCH_KIND, tags: [pathTag], softTags: [] })
    ).toBeNull();
    expectNoRuntimeIncrementalFiles(root);
  });

  it("deliberately keeps ImageOptimizerCache memory-only", async () => {
    const resolvedConfig = await loadConfig(PHASE_PRODUCTION_SERVER, process.cwd(), { silent: true });
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

describe("rollback immutable runtime restart behavior", () => {
  function childCachePrelude(serverDistDir: string) {
    const modulePath = JSON.stringify(join(process.cwd(), "node_modules", "next", "dist", "server"));
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

  it("does not persist a regenerated entry across a process restart", () => {
    const { root, serverDistDir } = createTemporaryDistDir();
    const childPrelude = childCachePrelude(serverDistDir);
    const writeScript = `${childPrelude}
      cache.set('restart-key', {
        kind: CachedRouteKind.FETCH,
        data: { headers: {}, body: '{"value":"runtime"}', status: 200, url: '' },
        revalidate: 60
      }, { fetchCache: true, tags: ['restart-tag'] })
        .then(() => cache.get('restart-key', {
          kind: IncrementalCacheKind.FETCH, tags: ['restart-tag'], softTags: []
        }))
        .then((entry) => process.stdout.write(entry ? 'memory-hit' : 'miss'));
    `;
    const readAfterRestartScript = `${childPrelude}
      cache.get('restart-key', {
        kind: IncrementalCacheKind.FETCH, tags: ['restart-tag'], softTags: []
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
});

describe("real hermetic historical production Next server", () => {
  productionIt(
    "keeps the copied historical runtime immutable and repeated images uncached on disk",
    async () => {
      const fixtureRoot = prepareProductionFixture(productionFixtureRoot as string);
      const nextRoot = join(fixtureRoot, ".next");
      const publicRoot = join(fixtureRoot, "public");
      const immutableRoots = [
        { label: "next", path: nextRoot },
        { label: "public", path: publicRoot }
      ];
      const before = contentManifest(immutableRoots);
      const fetchCachePath = join(nextRoot, "cache", "fetch-cache");
      const imageCachePath = join(nextRoot, "cache", "images");
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
        const login = await localRequest(port, "/login");
        const insight = await localRequest(port, "/insights");
        const repeatedInsight = await localRequest(port, "/insights");
        const standalonePro = await localRequest(port, "/pro");
        const imagePath = "/_next/image?url=%2Fbranding%2Fcircle-card-logo.png&w=256&q=75";
        const firstImage = await localRequest(port, imagePath);
        const repeatedImage = await localRequest(port, imagePath);
        const invalidWebhook = await localRequest(port, "/api/stripe/webhook", {
          method: "POST",
          body: "{}",
          headers: { "Content-Type": "application/json", "stripe-signature": "invalid" }
        });

        expect(homepage.status).toBe(307);
        expect(homepage.headers.location).toBe("/join-desktop");
        expect(login.status).toBe(200);
        expect(insight.status).toBe(200);
        expect(repeatedInsight.status).toBe(200);
        expect(insight.headers["content-type"]).toContain("text/html");
        expect(standalonePro.status).toBe(404);
        expect(firstImage.status).toBe(200);
        expect(repeatedImage.status).toBe(200);
        expect(imageFormat(firstImage.headers["content-type"], firstImage.body)).toMatch(/^image\//u);
        expect(imageFormat(repeatedImage.headers["content-type"], repeatedImage.body)).toBe(
          imageFormat(firstImage.headers["content-type"], firstImage.body)
        );
        expect(createHash("sha256").update(repeatedImage.body).digest("hex")).toBe(
          createHash("sha256").update(firstImage.body).digest("hex")
        );
        expect(invalidWebhook.status).toBe(400);
        expect(existsSync(fetchCachePath)).toBe(false);
        expect(existsSync(imageCachePath)).toBe(false);
      } catch (error) {
        throw new Error(`Historical production fixture assertion failed. Recent output:\n${output}`, {
          cause: error
        });
      } finally {
        await stopProductionServer(child);
      }

      await assertPortReleased(port);
      expect(contentManifest(immutableRoots)).toEqual(before);
      expect(existsSync(fetchCachePath)).toBe(false);
      expect(existsSync(imageCachePath)).toBe(false);
    },
    120_000
  );
});
