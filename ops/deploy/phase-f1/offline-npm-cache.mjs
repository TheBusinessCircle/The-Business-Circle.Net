import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const OFFLINE_CACHE_ROOT = "/var/cache/thebusinesscircle/phase-f1/npm-offline-v1";
export const READINESS_PATH = "/var/lib/thebusinesscircle/deployment-state/offline-npm-cache-readiness.json";
export const ROLLBACK_APPLICATION_SHA = "5d1f81bb05a01b08e1134785c2f86b77c8969fe3";
export const NODE_VERSION = "v22.22.2";
export const NPM_VERSION = "10.9.7";
export const READINESS_SCHEMA = "phase-f1-offline-npm-cache-readiness-v1";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalRelative = (root, path) => relative(root, path).split(sep).join("/");

function exactKeys(record, keys, label) {
  if (!record || typeof record !== "object" || Array.isArray(record) || JSON.stringify(Object.keys(record).sort()) !== JSON.stringify([...keys].sort())) {
    throw new Error(`${label} schema is invalid.`);
  }
}

function packageIntegrities(lockfile) {
  if (!lockfile || typeof lockfile !== "object" || lockfile.lockfileVersion !== 3 || !lockfile.packages || typeof lockfile.packages !== "object") {
    throw new Error("Approved npm lockfile schema is invalid.");
  }
  const integrities = new Set();
  for (const entry of Object.values(lockfile.packages)) {
    if (!entry || typeof entry !== "object" || entry.link === true || !entry.resolved) continue;
    if (typeof entry.resolved !== "string" || !entry.resolved.startsWith("https://registry.npmjs.org/")) {
      throw new Error("Approved lockfile contains a non-registry package source.");
    }
    if (typeof entry.integrity !== "string" || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(entry.integrity)) {
      throw new Error("Approved lockfile package integrity is missing or unsupported.");
    }
    integrities.add(entry.integrity);
  }
  if (!integrities.size) throw new Error("Approved lockfile contains no cacheable packages.");
  return [...integrities].sort();
}

function contentPath(cacheRoot, integrity) {
  const digest = Buffer.from(integrity.slice("sha512-".length), "base64").toString("hex");
  if (digest.length !== 128) throw new Error("Approved package integrity length is invalid.");
  return join(cacheRoot, "_cacache", "content-v2", "sha512", digest.slice(0, 2), digest.slice(2, 4), digest.slice(4));
}

function inventory(root, { operational = false, expectedGid = null, enforceMetadata = true } = {}) {
  const canonical = realpathSync(resolve(root));
  if (canonical !== resolve(root)) throw new Error("Offline npm cache path is noncanonical.");
  if (JSON.stringify(readdirSync(canonical).sort()) !== JSON.stringify(["_cacache"])) throw new Error("Offline npm cache root contains an unexpected object.");
  const rows = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stats = lstatSync(path);
      const relativePath = canonicalRelative(canonical, path);
      if (stats.isSymbolicLink() || (!stats.isDirectory() && !stats.isFile())) throw new Error("Offline npm cache contains a linked or special object.");
      if (operational && (stats.uid !== 0 || stats.gid !== expectedGid)) throw new Error("Offline npm cache ownership is unsafe.");
      if (stats.isDirectory()) {
        if (enforceMetadata && (stats.mode & 0o777) !== 0o550) throw new Error("Offline npm cache directory mode is unsafe.");
        rows.push(`D\t${relativePath}\n`);
        visit(path);
      } else {
        if (stats.nlink !== 1 || (enforceMetadata && (stats.mode & 0o777) !== 0o440)) throw new Error("Offline npm cache file metadata is unsafe.");
        rows.push(`F\t${relativePath}\t${stats.size}\t${sha256(readFileSync(path))}\n`);
      }
    }
  };
  const rootStats = lstatSync(canonical);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink() || (enforceMetadata && (rootStats.mode & 0o777) !== 0o550) || (operational && (rootStats.uid !== 0 || rootStats.gid !== expectedGid))) {
    throw new Error("Offline npm cache root metadata is unsafe.");
  }
  visit(canonical);
  return { cacheInventorySha256: sha256(Buffer.from(rows.join(""), "utf8")), fileCount: rows.filter((row) => row.startsWith("F\t")).length };
}

export function evaluateOfflineCache(cacheRoot, lockfilePath, options = {}) {
  const root = resolve(cacheRoot);
  const lockPath = resolve(lockfilePath);
  const lockStats = lstatSync(lockPath);
  if (!lockStats.isFile() || lockStats.isSymbolicLink() || lockStats.nlink !== 1) throw new Error("Approved npm lockfile metadata is unsafe.");
  const body = readFileSync(lockPath);
  const integrities = packageIntegrities(JSON.parse(body.toString("utf8")));
  const cache = inventory(root, options);
  for (const integrity of integrities) {
    const path = contentPath(root, integrity);
    if (!existsSync(path)) throw new Error("Offline npm cache is incomplete for the approved lockfile.");
    const stats = lstatSync(path);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || createHash("sha512").update(readFileSync(path)).digest("base64") !== integrity.slice("sha512-".length)) {
      throw new Error("Offline npm cache content integrity failed.");
    }
  }
  return { lockfileSha256: sha256(body), packageCount: integrities.length, ...cache };
}

function buildGroupId() {
  const row = execFileSync("/usr/bin/getent", ["group", "phase-f1-build"], { encoding: "utf8" }).trim().split(":");
  if (row.length !== 4 || !/^\d+$/u.test(row[2])) throw new Error("Phase F1 build group is unavailable.");
  return Number(row[2]);
}

function verifyWorkspace(workspace) {
  const canonical = realpathSync(resolve(workspace));
  if (!canonical.startsWith(`/var/www/builds/rollback-${ROLLBACK_APPLICATION_SHA}-`)) throw new Error("Offline cache readiness requires the approved rollback checkout.");
  const head = execFileSync("/usr/bin/git", ["-C", canonical, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (head !== ROLLBACK_APPLICATION_SHA) throw new Error("Offline cache readiness rollback identity mismatch.");
  const lockfile = join(canonical, "package-lock.json");
  const committed = execFileSync("/usr/bin/git", ["-C", canonical, "show", `${ROLLBACK_APPLICATION_SHA}:package-lock.json`]);
  if (!readFileSync(lockfile).equals(committed)) throw new Error("Approved rollback lockfile differs from its commit.");
  return { canonical, lockfile };
}

function runtimeVersions() {
  const npmVersion = execFileSync("/usr/bin/npm", ["--version"], { encoding: "utf8" }).trim();
  if (process.version !== NODE_VERSION || npmVersion !== NPM_VERSION) throw new Error("Exact Node/npm contract is not satisfied.");
  return npmVersion;
}

function readinessRecord(workspace, operationsCommit) {
  if (!/^[0-9a-f]{40}$/u.test(operationsCommit)) throw new Error("Operations identity is malformed.");
  runtimeVersions();
  const { lockfile } = verifyWorkspace(workspace);
  const result = evaluateOfflineCache(OFFLINE_CACHE_ROOT, lockfile, { operational: true, expectedGid: buildGroupId() });
  return {
    schemaVersion: READINESS_SCHEMA,
    operationsCommit,
    applicationSha: ROLLBACK_APPLICATION_SHA,
    cacheRoot: OFFLINE_CACHE_ROOT,
    nodeVersion: NODE_VERSION,
    npmVersion: NPM_VERSION,
    lockfileSha256: result.lockfileSha256,
    packageCount: result.packageCount,
    cacheInventorySha256: result.cacheInventorySha256,
    cacheFileCount: result.fileCount,
    ready: true,
    valueMaterialRecorded: false
  };
}

function writeExclusive(path, record) {
  if (existsSync(path)) throw new Error("Offline npm cache readiness evidence already exists.");
  const parent = realpathSync(dirname(path));
  if (parent !== dirname(path)) throw new Error("Offline npm cache readiness parent is noncanonical.");
  const fd = openSync(path, "wx", 0o600);
  try { writeFileSync(fd, `${JSON.stringify(record, null, 2)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
  const parentFd = openSync(parent, "r");
  try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
}

function readReadiness() {
  const stats = lstatSync(READINESS_PATH);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o600) throw new Error("Offline npm cache readiness evidence metadata is unsafe.");
  const record = JSON.parse(readFileSync(READINESS_PATH, "utf8"));
  exactKeys(record, ["applicationSha", "cacheFileCount", "cacheInventorySha256", "cacheRoot", "lockfileSha256", "nodeVersion", "npmVersion", "operationsCommit", "packageCount", "ready", "schemaVersion", "valueMaterialRecorded"], "Offline npm cache readiness");
  return record;
}

export function publishOfflineCacheReadiness(workspace, operationsCommit) {
  const record = readinessRecord(workspace, operationsCommit);
  writeExclusive(READINESS_PATH, record);
  return record;
}

export function verifyOfflineCacheReadiness(workspace, operationsCommit) {
  const expected = readinessRecord(workspace, operationsCommit);
  const actual = readReadiness();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Offline npm cache readiness evidence is stale or inconsistent.");
  return actual;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, workspace, operationsCommit] = process.argv.slice(2);
  if (command === "publish") publishOfflineCacheReadiness(workspace, operationsCommit);
  else if (command === "verify") verifyOfflineCacheReadiness(workspace, operationsCommit);
  else if (command === "status") {
    try { verifyOfflineCacheReadiness(workspace, operationsCommit); }
    catch { process.stdout.write("OFFLINE_NPM_CACHE_NOT_READY\n"); process.exit(1); }
  } else throw new Error("Usage: offline-npm-cache.mjs <publish|verify|status> <approved-rollback-workspace> <operations-commit>");
  process.stdout.write("OFFLINE_NPM_CACHE_READY\n");
}
