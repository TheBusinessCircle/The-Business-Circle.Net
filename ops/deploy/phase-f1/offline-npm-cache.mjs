import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
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
import { gitAsBuildUser } from "./build-user-git.mjs";
import { resolveProtectedAuthorityLineage } from "./environment-readiness.mjs";

export const OFFLINE_CACHE_ROOT = "/var/cache/thebusinesscircle/phase-f1/npm-offline-v1";
export const READINESS_PATH = "/var/lib/thebusinesscircle/deployment-state/offline-npm-cache-readiness.json";
const AUTHORITY_PATH = "/var/lib/thebusinesscircle/approved-phase-f1-pack.json";
const DEPLOYMENT_LOG_ROOT = "/var/log/thebusinesscircle/deployments";
export const ROLLBACK_APPLICATION_SHA = "5d1f81bb05a01b08e1134785c2f86b77c8969fe3";
export const NODE_VERSION = "v22.22.2";
export const NPM_VERSION = "10.9.7";
export const READINESS_SCHEMA = "phase-f1-offline-npm-cache-readiness-v2";
export const APPROVED_TARGET_PLATFORM = Object.freeze({
  os: "linux",
  cpu: "x64",
  libc: "glibc"
});
export const SEALED_NOT_READY = "SEALED_NOT_READY_REVERIFY_APPROVED";
const RECOVERY_KEYS = [
  "activeWriterAbsent",
  "authorityCurrent",
  "cacheMetadataTrusted",
  "nodeNpmExact",
  "offlineResolutionPending",
  "promotionAbsent",
  "readinessAbsent",
  "requiredCompleteness",
  "runtimeMutationIsolated",
  "valuesRecorded",
  "workspaceClean"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalRelative = (root, path) => relative(root, path).split(sep).join("/");

function exactKeys(record, keys, label) {
  if (!record || typeof record !== "object" || Array.isArray(record) || JSON.stringify(Object.keys(record).sort()) !== JSON.stringify([...keys].sort())) {
    throw new Error(`${label} schema is invalid.`);
  }
}

function validateConstraintList(value, label) {
  if (!Array.isArray(value) || value.length === 0 ||
      value.some((entry) => typeof entry !== "string" ||
        !/^!?[a-z0-9][a-z0-9._-]*$/u.test(entry)) ||
      new Set(value).size !== value.length) {
    throw new Error(`Approved lockfile ${label} constraint is malformed.`);
  }
  return value;
}

function checkConstraint(value, list, label) {
  const entries = validateConstraintList(list, label);
  if (entries.length === 1 && entries[0] === "any") return true;
  let negated = 0;
  let match = false;
  for (const entry of entries) {
    const negate = entry.startsWith("!");
    const test = negate ? entry.slice(1) : entry;
    if (negate) {
      negated += 1;
      if (value === test) return false;
    } else {
      match ||= value === test;
    }
  }
  return match || negated === entries.length;
}

function validateTargetPlatform(target) {
  exactKeys(target, ["cpu", "libc", "os"], "Target platform");
  for (const field of ["os", "cpu", "libc"]) {
    if (typeof target[field] !== "string" || !/^[a-z0-9][a-z0-9._-]*$/u.test(target[field])) {
      throw new Error("Target platform is invalid.");
    }
  }
  return target;
}

export function approvedTargetPlatform() {
  const header = process.report?.getReport?.()?.header;
  const actual = {
    os: process.platform,
    cpu: process.arch,
    libc: header?.glibcVersionRuntime ? "glibc" : "unknown"
  };
  if (JSON.stringify(actual) !== JSON.stringify(APPROVED_TARGET_PLATFORM)) {
    throw new Error("Approved Phase F1 target platform is unavailable.");
  }
  return APPROVED_TARGET_PLATFORM;
}

export function packagePlatformApplicable(entry, targetPlatform) {
  const target = validateTargetPlatform(targetPlatform);
  const checks = [
    ["os", target.os],
    ["cpu", target.cpu],
    ["libc", target.libc]
  ];
  let constrained = false;
  let applicable = true;
  for (const [field, value] of checks) {
    if (entry[field] === undefined) continue;
    constrained = true;
    applicable &&= checkConstraint(value, entry[field], field);
  }
  return { applicable, constrained };
}

export function packageIntegrityContract(lockfile, targetPlatform) {
  if (!lockfile || typeof lockfile !== "object" || lockfile.lockfileVersion !== 3 || !lockfile.packages || typeof lockfile.packages !== "object") {
    throw new Error("Approved npm lockfile schema is invalid.");
  }
  const target = validateTargetPlatform(targetPlatform);
  const integrities = new Map();
  for (const entry of Object.values(lockfile.packages)) {
    if (!entry || typeof entry !== "object" || entry.link === true || !entry.resolved) continue;
    if (typeof entry.resolved !== "string" || !entry.resolved.startsWith("https://registry.npmjs.org/")) {
      throw new Error("Approved lockfile contains a non-registry package source.");
    }
    if (typeof entry.integrity !== "string" || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(entry.integrity)) {
      throw new Error("Approved lockfile package integrity is missing or unsupported.");
    }
    if (entry.optional !== undefined && entry.optional !== true && entry.optional !== false) {
      throw new Error("Approved lockfile optional classification is malformed.");
    }
    const platform = packagePlatformApplicable(entry, target);
    const required = entry.optional !== true || !platform.constrained || platform.applicable;
    const current = integrities.get(entry.integrity) ?? { required: false };
    current.required ||= required;
    integrities.set(entry.integrity, current);
  }
  if (!integrities.size) throw new Error("Approved lockfile contains no cacheable packages.");
  const required = [];
  const optionalInapplicable = [];
  for (const [integrity, classification] of [...integrities].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) {
    (classification.required ? required : optionalInapplicable).push(integrity);
  }
  return {
    totalLockfileIntegrityCount: integrities.size,
    requiredTargetIntegrities: required,
    optionalInapplicableIntegrities: optionalInapplicable
  };
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
  const targetPlatform = options.targetPlatform ?? approvedTargetPlatform();
  const contract = packageIntegrityContract(JSON.parse(body.toString("utf8")), targetPlatform);
  const cache = inventory(root, options);
  let presentRequiredTargetIntegrityCount = 0;
  for (const integrity of contract.requiredTargetIntegrities) {
    const path = contentPath(root, integrity);
    if (!existsSync(path)) throw new Error("Offline npm cache is missing a required target-platform integrity.");
    const stats = lstatSync(path);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || createHash("sha512").update(readFileSync(path)).digest("base64") !== integrity.slice("sha512-".length)) {
      throw new Error("Offline npm cache content integrity failed.");
    }
    presentRequiredTargetIntegrityCount += 1;
  }
  return {
    lockfileSha256: sha256(body),
    targetPlatform,
    totalLockfileIntegrityCount: contract.totalLockfileIntegrityCount,
    requiredTargetIntegrityCount: contract.requiredTargetIntegrities.length,
    presentRequiredTargetIntegrityCount,
    missingRequiredTargetIntegrityCount: 0,
    optionalInapplicableIntegrityCount: contract.optionalInapplicableIntegrities.length,
    ...cache
  };
}

function buildGroupId() {
  const row = execFileSync("/usr/bin/getent", ["group", "phase-f1-build"], { encoding: "utf8" }).trim().split(":");
  if (row.length !== 4 || !/^\d+$/u.test(row[2])) throw new Error("Phase F1 build group is unavailable.");
  return Number(row[2]);
}

function verifyWorkspace(workspace) {
  const canonical = realpathSync(resolve(workspace));
  if (!canonical.startsWith(`/var/www/builds/rollback-${ROLLBACK_APPLICATION_SHA}-`)) throw new Error("Offline cache readiness requires the approved rollback checkout.");
  const head = gitAsBuildUser(canonical, ["rev-parse", "HEAD"]).trim();
  if (head !== ROLLBACK_APPLICATION_SHA) throw new Error("Offline cache readiness rollback identity mismatch.");
  const lockfile = join(canonical, "package-lock.json");
  const committed = gitAsBuildUser(canonical, ["show", `${ROLLBACK_APPLICATION_SHA}:package-lock.json`], "buffer");
  if (!readFileSync(lockfile).equals(committed)) throw new Error("Approved rollback lockfile differs from its commit.");
  return { canonical, lockfile };
}

function runtimeVersions() {
  const npmVersion = execFileSync("/usr/bin/npm", ["--version"], { encoding: "utf8" }).trim();
  if (process.version !== NODE_VERSION || npmVersion !== NPM_VERSION) throw new Error("Exact Node/npm contract is not satisfied.");
  return npmVersion;
}

function readinessRecord(workspace, operationsCommit, { offlineResolutionVerified = false } = {}) {
  if (!/^[0-9a-f]{40}$/u.test(operationsCommit)) throw new Error("Operations identity is malformed.");
  if (offlineResolutionVerified !== true) throw new Error("Offline npm resolution proof is required.");
  runtimeVersions();
  const { lockfile } = verifyWorkspace(workspace);
  const result = evaluateOfflineCache(OFFLINE_CACHE_ROOT, lockfile, {
    operational: true,
    expectedGid: buildGroupId(),
    targetPlatform: approvedTargetPlatform()
  });
  return {
    schemaVersion: READINESS_SCHEMA,
    operationsCommit,
    applicationSha: ROLLBACK_APPLICATION_SHA,
    cacheRoot: OFFLINE_CACHE_ROOT,
    nodeVersion: NODE_VERSION,
    npmVersion: NPM_VERSION,
    lockfileSha256: result.lockfileSha256,
    targetOs: result.targetPlatform.os,
    targetCpu: result.targetPlatform.cpu,
    targetLibc: result.targetPlatform.libc,
    totalLockfileIntegrityCount: result.totalLockfileIntegrityCount,
    requiredTargetIntegrityCount: result.requiredTargetIntegrityCount,
    presentRequiredTargetIntegrityCount: result.presentRequiredTargetIntegrityCount,
    missingRequiredTargetIntegrityCount: result.missingRequiredTargetIntegrityCount,
    optionalInapplicableIntegrityCount: result.optionalInapplicableIntegrityCount,
    cacheInventorySha256: result.cacheInventorySha256,
    cacheFileCount: result.fileCount,
    offlineResolutionVerified: true,
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
  exactKeys(record, ["applicationSha", "cacheFileCount", "cacheInventorySha256", "cacheRoot", "lockfileSha256", "missingRequiredTargetIntegrityCount", "nodeVersion", "npmVersion", "offlineResolutionVerified", "operationsCommit", "optionalInapplicableIntegrityCount", "presentRequiredTargetIntegrityCount", "ready", "requiredTargetIntegrityCount", "schemaVersion", "targetCpu", "targetLibc", "targetOs", "totalLockfileIntegrityCount", "valueMaterialRecorded"], "Offline npm cache readiness");
  return record;
}

export function publishOfflineCacheReadiness(workspace, operationsCommit, options = {}) {
  const record = readinessRecord(workspace, operationsCommit, options);
  writeExclusive(READINESS_PATH, record);
  return record;
}

export function verifyOfflineCacheReadiness(workspace, operationsCommit) {
  const expected = readinessRecord(workspace, operationsCommit, { offlineResolutionVerified: true });
  const actual = readReadiness();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Offline npm cache readiness evidence is stale or inconsistent.");
  return actual;
}

export function validateSealedNotReadyRecoveryContract(record) {
  exactKeys(record, RECOVERY_KEYS, "Sealed offline npm cache recovery");
  for (const key of RECOVERY_KEYS.filter((name) => !new Set(["valuesRecorded"]).has(name))) {
    if (record[key] !== true) throw new Error("Sealed offline npm cache recovery precondition failed.");
  }
  if (record.valuesRecorded !== false) throw new Error("Sealed offline npm cache recovery must remain value-free.");
  return SEALED_NOT_READY;
}

export function validateFailedCachePreparationLog(body, identity, trustedLineage) {
  if (typeof body !== "string" || body.length > 65536 || !identity ||
      typeof identity !== "object" || !Array.isArray(trustedLineage)) {
    throw new Error("Offline npm cache preparation provenance is invalid.");
  }
  const operationsCommit = /^Operations commit: ([0-9a-f]{40})$/mu.exec(body)?.[1];
  const archiveSha256 = /^Pack archive SHA-256: ([0-9a-f]{64})$/mu.exec(body)?.[1];
  const manifestSha256 = /^Pack manifest SHA-256: ([0-9a-f]{64})$/mu.exec(body)?.[1];
  const valid = /^Operation: prepare-offline-npm-cache$/mu.test(body) &&
    /^Forward application SHA: b43a1e4e708bc9f02ef83bd63dab1db1f366b32e$/mu.test(body) &&
    /^Rollback application SHA: 5d1f81bb05a01b08e1134785c2f86b77c8969fe3$/mu.test(body) &&
    body.includes("Offline npm cache is incomplete for the approved lockfile.") &&
    !body.includes("OFFLINE_NPM_CACHE_READY") &&
    operationsCommit === identity.operationsCommit &&
    archiveSha256 === identity.archiveSha256 &&
    manifestSha256 === identity.manifestSha256 &&
    trustedLineage.includes(operationsCommit);
  if (!valid) throw new Error("Offline npm cache preparation provenance is untrusted.");
  return operationsCommit;
}

function trustedFailedCachePreparationAuthority(operationsCommit) {
  const lineage = resolveProtectedAuthorityLineage(operationsCommit);
  const matches = [];
  for (const name of readdirSync(DEPLOYMENT_LOG_ROOT)) {
    if (!/^\d{8}T\d{6}\.\d{9}Z-prepare-offline-npm-cache\.[A-Za-z0-9]{8}\.log$/u.test(name)) continue;
    const path = join(DEPLOYMENT_LOG_ROOT, name);
    const stats = lstatSync(path);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
        stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o600 ||
        realpathSync(path) !== path) {
      throw new Error("Offline npm cache preparation log metadata is unsafe.");
    }
    const body = readFileSync(path, "utf8");
    const sourceCommit = /^Operations commit: ([0-9a-f]{40})$/mu.exec(body)?.[1];
    if (!sourceCommit || !lineage.includes(sourceCommit)) continue;
    const identityPath = sourceCommit === operationsCommit
      ? AUTHORITY_PATH
      : `/var/lib/thebusinesscircle/phase-f1-identity-history/${sourceCommit}/approved-phase-f1-pack.json`;
    const identityStats = lstatSync(identityPath);
    if (!identityStats.isFile() || identityStats.isSymbolicLink() || identityStats.nlink !== 1 ||
        identityStats.uid !== 0 || identityStats.gid !== 0 || (identityStats.mode & 0o777) !== 0o600 ||
        realpathSync(identityPath) !== identityPath) {
      throw new Error("Offline npm cache source authority metadata is unsafe.");
    }
    const identity = JSON.parse(readFileSync(identityPath, "utf8"));
    try {
      matches.push(validateFailedCachePreparationLog(body, identity, lineage));
    } catch {
      // Other protected preparation attempts are not evidence for this recovery.
    }
  }
  if (matches.length !== 1) {
    throw new Error("Offline npm cache preparation provenance is absent or ambiguous.");
  }
  return matches[0];
}

export function classifySealedNotReadyCache(workspace, operationsCommit) {
  if (!/^[0-9a-f]{40}$/u.test(operationsCommit)) throw new Error("Operations identity is malformed.");
  const authorityStats = lstatSync(AUTHORITY_PATH);
  if (!authorityStats.isFile() || authorityStats.isSymbolicLink() || authorityStats.nlink !== 1 ||
      authorityStats.uid !== 0 || authorityStats.gid !== 0 || (authorityStats.mode & 0o777) !== 0o600 ||
      realpathSync(AUTHORITY_PATH) !== AUTHORITY_PATH ||
      JSON.parse(readFileSync(AUTHORITY_PATH, "utf8")).operationsCommit !== operationsCommit) {
    throw new Error("Offline npm cache recovery requires the current protected authority.");
  }
  if (existsSync(READINESS_PATH)) throw new Error("Offline npm cache already has readiness evidence.");
  const canonicalWorkspace = verifyWorkspace(workspace).canonical;
  if (existsSync(join(canonicalWorkspace, "node_modules")) || existsSync(join(canonicalWorkspace, ".next"))) {
    throw new Error("Offline npm cache recovery workspace is not disposable and clean.");
  }
  const cacheParent = dirname(OFFLINE_CACHE_ROOT);
  const promotionPrefix = ".npm-offline-v1.promotion.";
  const promotionAbsent = !readdirSync(cacheParent).some((name) => name.startsWith(promotionPrefix));
  runtimeVersions();
  const sourceOperationsCommit = trustedFailedCachePreparationAuthority(operationsCommit);
  const result = evaluateOfflineCache(OFFLINE_CACHE_ROOT, join(canonicalWorkspace, "package-lock.json"), {
    operational: true,
    expectedGid: buildGroupId(),
    targetPlatform: approvedTargetPlatform()
  });
  const activeNpm = spawnSync("/usr/bin/pgrep", ["-u", "phase-f1-build", "-f", "(npm|npm-cli\\.js)"], {
    stdio: "ignore"
  });
  if (![0, 1].includes(activeNpm.status)) throw new Error("Offline npm cache writer check failed.");
  const writable = (user) => spawnSync("/usr/bin/sudo", ["-u", user, "/usr/bin/test", "-w", OFFLINE_CACHE_ROOT], {
    stdio: "ignore"
  }).status === 0;
  validateSealedNotReadyRecoveryContract({
    activeWriterAbsent: activeNpm.status === 1,
    authorityCurrent: true,
    cacheMetadataTrusted: true,
    nodeNpmExact: true,
    offlineResolutionPending: true,
    promotionAbsent,
    readinessAbsent: true,
    requiredCompleteness: result.missingRequiredTargetIntegrityCount === 0,
    runtimeMutationIsolated: !writable("bcn-app") && !writable("circle-card-app"),
    valuesRecorded: false,
    workspaceClean: true
  });
  return {
    classification: SEALED_NOT_READY,
    operationsCommit,
    sourceOperationsCommit,
    applicationSha: ROLLBACK_APPLICATION_SHA,
    lockfileSha256: result.lockfileSha256,
    cacheInventorySha256: result.cacheInventorySha256,
    totalLockfileIntegrityCount: result.totalLockfileIntegrityCount,
    requiredTargetIntegrityCount: result.requiredTargetIntegrityCount,
    optionalInapplicableIntegrityCount: result.optionalInapplicableIntegrityCount,
    missingRequiredTargetIntegrityCount: result.missingRequiredTargetIntegrityCount,
    valuesRecorded: false
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, workspace, operationsCommit] = process.argv.slice(2);
  if (command === "publish-after-offline-verification") publishOfflineCacheReadiness(workspace, operationsCommit, { offlineResolutionVerified: true });
  else if (command === "verify") verifyOfflineCacheReadiness(workspace, operationsCommit);
  else if (command === "classify-recovery") process.stdout.write(`${JSON.stringify(classifySealedNotReadyCache(workspace, operationsCommit))}\n`);
  else if (command === "status") {
    try { verifyOfflineCacheReadiness(workspace, operationsCommit); }
    catch { process.stdout.write("OFFLINE_NPM_CACHE_NOT_READY\n"); process.exit(1); }
  } else throw new Error("Usage: offline-npm-cache.mjs <publish-after-offline-verification|verify|classify-recovery|status> <approved-rollback-workspace> <operations-commit>");
  if (command !== "classify-recovery") process.stdout.write("OFFLINE_NPM_CACHE_READY\n");
}
