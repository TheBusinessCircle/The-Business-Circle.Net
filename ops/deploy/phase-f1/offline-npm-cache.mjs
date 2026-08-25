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
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import { gitAsBuildUser } from "./build-user-git.mjs";
import { resolveProtectedAuthorityLineage } from "./environment-readiness.mjs";

export const OFFLINE_CACHE_ROOT = "/var/cache/thebusinesscircle/phase-f1/npm-offline-v1";
export const READINESS_PATH = "/var/lib/thebusinesscircle/deployment-state/offline-npm-cache-readiness.json";
const AUTHORITY_PATH = "/var/lib/thebusinesscircle/approved-phase-f1-pack.json";
const DEPLOYMENT_LOG_ROOT = "/var/log/thebusinesscircle/deployments";
export const ROLLBACK_APPLICATION_SHA = "5d1f81bb05a01b08e1134785c2f86b77c8969fe3";
export const FORWARD_APPLICATION_SHA = "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e";
export const NODE_VERSION = "v22.22.2";
export const NPM_VERSION = "10.9.7";
export const READINESS_SCHEMA = "phase-f1-offline-npm-cache-readiness-v2";
export const READY_CARRY_FORWARD_SCHEMA =
  "phase-f1-offline-npm-cache-readiness-carry-forward-report-v1";
export const IDENTITY_ONLY_READY_CARRY_FORWARD =
  "IDENTITY_ONLY_OFFLINE_NPM_CACHE_READY_EVIDENCE_CARRY_FORWARD";
export const IDENTITY_ONLY_READY_DELTA = "IDENTITY_ONLY";
export const STATE_ROOT = "/var/lib/thebusinesscircle/deployment-state";
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

function validateOperationsCommit(value) {
  if (!/^[0-9a-f]{40}$/u.test(value || "")) {
    throw new Error("Offline npm cache operations identity is invalid.");
  }
}

export function preservedOfflineCacheReadinessPath(stateRoot, operationsCommit) {
  validateOperationsCommit(operationsCommit);
  return join(resolve(stateRoot), `offline-npm-cache-readiness-preserved-${operationsCommit}.json`);
}

export function offlineCacheReadinessExchangeSlotPath(stateRoot, operationsCommit) {
  validateOperationsCommit(operationsCommit);
  return join(resolve(stateRoot), `.offline-npm-cache-readiness.exchange-${operationsCommit}.json`);
}

export function offlineCacheReadinessCarryForwardReportPath(stateRoot, operationsCommit) {
  validateOperationsCommit(operationsCommit);
  return join(resolve(stateRoot), `offline-npm-cache-readiness-carry-forward-${operationsCommit}.json`);
}

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

function verifyApplicationWorkspace(workspace, role) {
  const applicationSha = role === "rollback" ? ROLLBACK_APPLICATION_SHA :
    role === "forward" ? FORWARD_APPLICATION_SHA : null;
  if (!applicationSha) throw new Error("Offline cache workspace role is invalid.");
  const canonical = realpathSync(resolve(workspace));
  if (!canonical.startsWith(`/var/www/builds/${role}-${applicationSha}-`)) {
    throw new Error(`Offline cache ${role} verification requires the approved checkout.`);
  }
  const head = gitAsBuildUser(canonical, ["rev-parse", "HEAD"]).trim();
  if (head !== applicationSha) throw new Error(`Offline cache ${role} application identity mismatch.`);
  const lockfile = join(canonical, "package-lock.json");
  const committed = gitAsBuildUser(canonical, ["show", `${applicationSha}:package-lock.json`], "buffer");
  if (!readFileSync(lockfile).equals(committed)) throw new Error(`Approved ${role} lockfile differs from its commit.`);
  return { canonical, lockfile };
}

function verifyWorkspace(workspace) {
  return verifyApplicationWorkspace(workspace, "rollback");
}

function verifyForwardWorkspace(workspace) {
  return verifyApplicationWorkspace(workspace, "forward");
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

export function validateOfflineCacheReadiness(record, operationsCommit, expected = record) {
  exactKeys(record, ["applicationSha", "cacheFileCount", "cacheInventorySha256", "cacheRoot", "lockfileSha256", "missingRequiredTargetIntegrityCount", "nodeVersion", "npmVersion", "offlineResolutionVerified", "operationsCommit", "optionalInapplicableIntegrityCount", "presentRequiredTargetIntegrityCount", "ready", "requiredTargetIntegrityCount", "schemaVersion", "targetCpu", "targetLibc", "targetOs", "totalLockfileIntegrityCount", "valueMaterialRecorded"], "Offline npm cache readiness");
  validateOperationsCommit(operationsCommit);
  const counts = [
    record.totalLockfileIntegrityCount,
    record.requiredTargetIntegrityCount,
    record.presentRequiredTargetIntegrityCount,
    record.missingRequiredTargetIntegrityCount,
    record.optionalInapplicableIntegrityCount,
    record.cacheFileCount
  ];
  if (record.schemaVersion !== READINESS_SCHEMA ||
      record.operationsCommit !== operationsCommit ||
      record.applicationSha !== ROLLBACK_APPLICATION_SHA ||
      record.cacheRoot !== OFFLINE_CACHE_ROOT ||
      record.nodeVersion !== NODE_VERSION || record.npmVersion !== NPM_VERSION ||
      record.targetOs !== APPROVED_TARGET_PLATFORM.os ||
      record.targetCpu !== APPROVED_TARGET_PLATFORM.cpu ||
      record.targetLibc !== APPROVED_TARGET_PLATFORM.libc ||
      !/^[0-9a-f]{64}$/u.test(record.lockfileSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(record.cacheInventorySha256 || "") ||
      counts.some((value) => !Number.isSafeInteger(value) || value < 0) ||
      record.totalLockfileIntegrityCount <= 0 || record.cacheFileCount <= 0 ||
      record.presentRequiredTargetIntegrityCount !== record.requiredTargetIntegrityCount ||
      record.missingRequiredTargetIntegrityCount !== 0 ||
      record.totalLockfileIntegrityCount !==
        record.requiredTargetIntegrityCount + record.optionalInapplicableIntegrityCount ||
      record.offlineResolutionVerified !== true || record.ready !== true ||
      record.valueMaterialRecorded !== false ||
      JSON.stringify(record) !== JSON.stringify(expected)) {
    throw new Error("Offline npm cache readiness evidence is invalid.");
  }
  return record;
}

function readReadinessEvidence(path, operational = true) {
  if (operational) {
    const stats = lstatSync(path);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
        stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o600 ||
        realpathSync(path) !== path) {
      throw new Error("Offline npm cache readiness evidence metadata is unsafe.");
    }
  }
  const bytes = readFileSync(path);
  let record;
  try { record = JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error("Offline npm cache readiness evidence is not valid JSON."); }
  return { bytes, record, identity: sha256(bytes) };
}

function readReadiness() {
  return readReadinessEvidence(READINESS_PATH).record;
}

export function classifyOfflineCacheReadinessDelta(source, candidate) {
  const sourceSemantics = { ...source }, candidateSemantics = { ...candidate };
  delete sourceSemantics.operationsCommit;
  delete candidateSemantics.operationsCommit;
  return JSON.stringify(sourceSemantics) === JSON.stringify(candidateSemantics) &&
    source.operationsCommit !== candidate.operationsCommit
    ? IDENTITY_ONLY_READY_DELTA
    : "UNEXPECTED_SEMANTIC_DELTA";
}

export function validateOfflineCacheReadinessCarryForwardReport(report, expected = report) {
  exactKeys(report, [
    "schemaVersion", "carryForward", "semanticDelta", "sourceOperationsCommit",
    "operationsCommit", "lineage", "sourceReadinessSha256",
    "carriedForwardReadinessSha256", "sourcePreserved", "cacheContentsUnchanged",
    "offlineResolutionPreserved", "valueMaterialRecorded"
  ], "Offline npm cache readiness carry-forward report");
  validateOperationsCommit(report.sourceOperationsCommit);
  validateOperationsCommit(report.operationsCommit);
  if (report.schemaVersion !== READY_CARRY_FORWARD_SCHEMA ||
      report.carryForward !== IDENTITY_ONLY_READY_CARRY_FORWARD ||
      report.semanticDelta !== IDENTITY_ONLY_READY_DELTA ||
      !Array.isArray(report.lineage) || report.lineage.length < 2 ||
      report.lineage[0] !== report.sourceOperationsCommit ||
      report.lineage.at(-1) !== report.operationsCommit ||
      new Set(report.lineage).size !== report.lineage.length ||
      report.lineage.some((commit) => !/^[0-9a-f]{40}$/u.test(commit)) ||
      !/^[0-9a-f]{64}$/u.test(report.sourceReadinessSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(report.carriedForwardReadinessSha256 || "") ||
      report.sourcePreserved !== true || report.cacheContentsUnchanged !== true ||
      report.offlineResolutionPreserved !== true ||
      report.valueMaterialRecorded !== false ||
      JSON.stringify(report) !== JSON.stringify(expected)) {
    throw new Error("Offline npm cache readiness carry-forward report is invalid.");
  }
  return report;
}

export function createOfflineCacheReadinessCarryForwardArtifacts(
  source,
  candidate,
  operationsCommit,
  lineage
) {
  validateOperationsCommit(operationsCommit);
  validateOfflineCacheReadiness(source.record, source.record.operationsCommit);
  validateOfflineCacheReadiness(candidate, operationsCommit);
  const sourceIndex = lineage.indexOf(source.record.operationsCommit);
  if (sourceIndex < 0 || lineage.at(-1) !== operationsCommit ||
      source.record.operationsCommit === operationsCommit) {
    throw new Error("Offline npm cache readiness source authority is not in the trusted lineage.");
  }
  const trustedSuffix = lineage.slice(sourceIndex);
  if (classifyOfflineCacheReadinessDelta(source.record, candidate) !==
      IDENTITY_ONLY_READY_DELTA) {
    throw new Error("Offline npm cache readiness carry-forward changed READY semantics.");
  }
  const readinessPayload = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`);
  if (readinessPayload.length !== source.bytes.length) {
    throw new Error("Offline npm cache readiness exchange size differs.");
  }
  const readinessIdentity = sha256(readinessPayload);
  const report = {
    schemaVersion: READY_CARRY_FORWARD_SCHEMA,
    carryForward: IDENTITY_ONLY_READY_CARRY_FORWARD,
    semanticDelta: IDENTITY_ONLY_READY_DELTA,
    sourceOperationsCommit: source.record.operationsCommit,
    operationsCommit,
    lineage: trustedSuffix,
    sourceReadinessSha256: source.identity,
    carriedForwardReadinessSha256: readinessIdentity,
    sourcePreserved: true,
    cacheContentsUnchanged: true,
    offlineResolutionPreserved: true,
    valueMaterialRecorded: false
  };
  validateOfflineCacheReadinessCarryForwardReport(report);
  return {
    readinessPayload,
    readinessIdentity,
    report,
    reportPayload: Buffer.from(`${JSON.stringify(report)}\n`)
  };
}

export function publishOfflineCacheReadiness(workspace, operationsCommit, options = {}) {
  const record = readinessRecord(workspace, operationsCommit, options);
  writeExclusive(READINESS_PATH, record);
  return record;
}

export function verifyOfflineCacheReadiness(workspace, operationsCommit) {
  const expected = readinessRecord(workspace, operationsCommit, { offlineResolutionVerified: true });
  const actual = readReadiness();
  return validateOfflineCacheReadiness(actual, operationsCommit, expected);
}

function pathIsAbsent(path) {
  try { lstatSync(path); return false; }
  catch (error) { if (error?.code === "ENOENT") return true; throw error; }
}

function userTest(user, predicate, path) {
  return spawnSync("/usr/bin/sudo", ["-u", user, "/usr/bin/test", predicate, path], {
    stdio: "ignore"
  }).status === 0;
}

function firstCacheContentFile(directory = join(OFFLINE_CACHE_ROOT, "_cacache", "content-v2")) {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || (!stats.isDirectory() && !stats.isFile())) {
      throw new Error("Offline npm cache contains a linked or special object.");
    }
    if (stats.isFile()) return path;
    const nested = firstCacheContentFile(path);
    if (nested) return nested;
  }
  return null;
}

function assertSealedCacheOperationalPolicy(canonicalWorkspace) {
  if (!pathIsAbsent(join(canonicalWorkspace, "node_modules")) ||
      !pathIsAbsent(join(canonicalWorkspace, ".next"))) {
    throw new Error("Offline npm cache workspace is not disposable and clean.");
  }
  const promotionPrefix = ".npm-offline-v1.promotion.";
  if (readdirSync(dirname(OFFLINE_CACHE_ROOT)).some((name) => name.startsWith(promotionPrefix))) {
    throw new Error("Offline npm cache promotion residue exists.");
  }
  const activeNpm = spawnSync("/usr/bin/pgrep", [
    "-u", "phase-f1-build", "-f", "(npm|npm-cli\\.js)"
  ], { stdio: "ignore" });
  if (![0, 1].includes(activeNpm.status)) {
    throw new Error("Offline npm cache writer check failed.");
  }
  if (activeNpm.status === 0) throw new Error("An offline npm cache writer is active.");
  const first = firstCacheContentFile();
  if (!first || !userTest("phase-f1-build", "-r", first) ||
      userTest("phase-f1-build", "-w", OFFLINE_CACHE_ROOT)) {
    throw new Error("Offline npm cache build-user access policy differs.");
  }
  if (userTest("bcn-app", "-w", OFFLINE_CACHE_ROOT) ||
      userTest("circle-card-app", "-w", OFFLINE_CACHE_ROOT)) {
    throw new Error("Offline npm cache runtime-user mutation isolation differs.");
  }
  return canonicalWorkspace;
}

function assertReadyCarryForwardOperationalState(workspace) {
  return assertSealedCacheOperationalPolicy(verifyWorkspace(workspace).canonical);
}

export function verifyOfflineCacheForForwardBuild(workspace, operationsCommit, options = {}) {
  validateOperationsCommit(operationsCommit);
  const operational = options.operational !== false;
  if (operational) runtimeVersions();
  const verified = options.workspace ?? verifyForwardWorkspace(workspace);
  const readiness = options.readiness ?? readReadiness();
  validateOfflineCacheReadiness(readiness, operationsCommit);
  if (readiness.cacheRoot !== OFFLINE_CACHE_ROOT || readiness.offlineResolutionVerified !== true ||
      readiness.ready !== true) {
    throw new Error("Current offline npm cache READY evidence is unavailable.");
  }
  if (operational) assertSealedCacheOperationalPolicy(verified.canonical);
  const result = (options.evaluate ?? evaluateOfflineCache)(OFFLINE_CACHE_ROOT, verified.lockfile, {
    operational,
    expectedGid: operational ? buildGroupId() : options.expectedGid,
    enforceMetadata: operational,
    targetPlatform: approvedTargetPlatform()
  });
  if (result.lockfileSha256 !== readiness.lockfileSha256 ||
      result.targetPlatform.os !== readiness.targetOs ||
      result.targetPlatform.cpu !== readiness.targetCpu ||
      result.targetPlatform.libc !== readiness.targetLibc ||
      result.totalLockfileIntegrityCount !== readiness.totalLockfileIntegrityCount ||
      result.requiredTargetIntegrityCount !== readiness.requiredTargetIntegrityCount ||
      result.presentRequiredTargetIntegrityCount !== readiness.presentRequiredTargetIntegrityCount ||
      result.missingRequiredTargetIntegrityCount !== 0 ||
      result.optionalInapplicableIntegrityCount !== readiness.optionalInapplicableIntegrityCount ||
      result.cacheInventorySha256 !== readiness.cacheInventorySha256 ||
      result.fileCount !== readiness.cacheFileCount) {
    throw new Error("Forward dependency contract differs from the sealed READY cache contract.");
  }
  return {
    cacheRoot: OFFLINE_CACHE_ROOT,
    applicationSha: FORWARD_APPLICATION_SHA,
    operationsCommit,
    lockfileSha256: result.lockfileSha256,
    cacheInventorySha256: result.cacheInventorySha256,
    requiredTargetIntegrityCount: result.requiredTargetIntegrityCount,
    missingRequiredTargetIntegrityCount: 0,
    offlineResolutionRequired: true,
    ready: true,
    valueMaterialRecorded: false
  };
}

function protectedCurrentAuthority(operationsCommit) {
  const stats = lstatSync(AUTHORITY_PATH);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
      stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o600 ||
      realpathSync(AUTHORITY_PATH) !== AUTHORITY_PATH) {
    throw new Error("Offline npm cache carry-forward authority metadata is unsafe.");
  }
  const authority = JSON.parse(readFileSync(AUTHORITY_PATH, "utf8"));
  if (authority.operationsCommit !== operationsCommit) {
    throw new Error("Offline npm cache carry-forward requires the current authority.");
  }
}

function successfulPackCommand(packRoot, arguments_, label) {
  const result = spawnSync("/usr/bin/node", arguments_, {
    env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" },
    stdio: "ignore"
  });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error(`${label} failed.`);
  }
  return packRoot;
}

function assertReadyCarryForwardProductionContext(
  workspace,
  sourceOperationsCommit,
  operationsCommit
) {
  const packRoot = `/opt/thebusinesscircle/deployment-packs/${operationsCommit}`;
  const expectedUtility = `${packRoot}/offline-npm-cache.mjs`;
  if (fileURLToPath(import.meta.url) !== expectedUtility ||
      realpathSync(expectedUtility) !== expectedUtility) {
    throw new Error("Offline npm cache readiness carry-forward must run from the authoritative installed pack.");
  }
  protectedCurrentAuthority(operationsCommit);
  const lineage = resolveProtectedAuthorityLineage(operationsCommit);
  if (!lineage.includes(sourceOperationsCommit) || lineage.at(-1) !== operationsCommit) {
    throw new Error("Offline npm cache readiness source authority is not in the trusted lineage.");
  }
  successfulPackCommand(packRoot, [
    `${packRoot}/git-authentication.mjs`, "verify-ready", operationsCommit
  ], "Current Git-authentication readiness verification");
  successfulPackCommand(packRoot, [
    `${packRoot}/environment-readiness.mjs`, "verify", STATE_ROOT, operationsCommit
  ], "Current environment readiness verification");
  const sourcePackRoot = `/opt/thebusinesscircle/deployment-packs/${sourceOperationsCommit}`;
  successfulPackCommand(sourcePackRoot, [
    `${sourcePackRoot}/offline-npm-cache.mjs`, "verify", workspace,
    sourceOperationsCommit
  ], "Trusted source offline npm cache readiness verification");
  return lineage;
}

function exchangeOfflineCacheReadiness(paths, identities, operationsCommit) {
  const helper = `/opt/thebusinesscircle/deployment-packs/${operationsCommit}/atomic-identity-exchange.py`;
  const result = spawnSync("/usr/bin/python3", [
    helper, "offline-npm-cache-readiness-exchange",
    "--authority", paths.authority,
    "--exchange-slot", paths.slot,
    "--preserved-history", paths.preserved,
    "--pre-authority-sha256", identities.source,
    "--pre-slot-sha256", identities.candidate,
    "--preserved-history-sha256", identities.source,
    "--post-authority-sha256", identities.candidate,
    "--post-slot-sha256", identities.source,
    "--expected-parent", paths.stateRoot,
    "--expected-size", String(identities.size)
  ], {
    env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" },
    stdio: "ignore"
  });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error("Atomic offline npm cache readiness exchange failed.");
  }
}

export function publishCarriedForwardOfflineCacheReadiness(options, dependencies = {}) {
  exactKeys(options, ["workspace", "sourceReadinessSha256", "operationsCommit", "carryForward"],
    "Offline npm cache readiness carry-forward invocation");
  validateOperationsCommit(options.operationsCommit);
  if (typeof options.workspace !== "string" || !options.workspace ||
      !/^[0-9a-f]{64}$/u.test(options.sourceReadinessSha256 || "") ||
      options.carryForward !== IDENTITY_ONLY_READY_CARRY_FORWARD) {
    throw new Error("Offline npm cache readiness carry-forward invocation is invalid.");
  }
  const operational = dependencies.operational !== false;
  const root = operational ? STATE_ROOT : resolve(dependencies.stateRoot);
  if (operational && (dependencies.stateRoot && resolve(dependencies.stateRoot) !== STATE_ROOT ||
      realpathSync(STATE_ROOT) !== STATE_ROOT)) {
    throw new Error("Offline npm cache readiness state root is unsafe.");
  }
  const paths = { stateRoot: root, authority: join(root, "offline-npm-cache-readiness.json") };
  const readEvidence = dependencies.readEvidence ?? readReadinessEvidence;
  const source = readEvidence(paths.authority, operational);
  if (source.identity !== options.sourceReadinessSha256) {
    throw new Error("Source offline npm cache readiness identity differs.");
  }
  validateOfflineCacheReadiness(source.record, source.record.operationsCommit);
  const lineage = (dependencies.assertProductionContext ??
    assertReadyCarryForwardProductionContext)(
    options.workspace,
    source.record.operationsCommit,
    options.operationsCommit
  );
  const validateState = dependencies.validateOperationalState ??
    assertReadyCarryForwardOperationalState;
  validateState(options.workspace);
  const createRecord = dependencies.createReadinessRecord ??
    ((operationsCommit) => readinessRecord(options.workspace, operationsCommit, {
      offlineResolutionVerified: true
    }));
  const sourceExpected = createRecord(source.record.operationsCommit);
  validateOfflineCacheReadiness(
    source.record,
    source.record.operationsCommit,
    sourceExpected
  );
  const candidate = createRecord(options.operationsCommit);
  const artifacts = createOfflineCacheReadinessCarryForwardArtifacts(
    source,
    candidate,
    options.operationsCommit,
    lineage
  );
  paths.preserved = preservedOfflineCacheReadinessPath(root, source.record.operationsCommit);
  paths.slot = offlineCacheReadinessExchangeSlotPath(root, options.operationsCommit);
  paths.report = offlineCacheReadinessCarryForwardReportPath(root, options.operationsCommit);
  for (const target of [paths.preserved, paths.slot, paths.report]) {
    if (!(dependencies.pathIsAbsent ?? pathIsAbsent)(target)) {
      throw new Error("Offline npm cache readiness carry-forward target already exists.");
    }
  }
  const publish = dependencies.publish ?? publishNoReplaceSet;
  publish([
    { target: paths.preserved, payload: source.bytes, mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {}) },
    { target: paths.slot, payload: artifacts.readinessPayload, mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {}) },
    { target: paths.report, payload: artifacts.reportPayload, mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {}) }
  ], {
    enforceMetadata: operational,
    fsyncDirectories: operational,
    verifySet() {
      const unchanged = readEvidence(paths.authority, operational);
      const preserved = readEvidence(paths.preserved, operational);
      const candidateEvidence = readEvidence(paths.slot, operational);
      if (unchanged.identity !== source.identity || preserved.identity !== source.identity ||
          candidateEvidence.identity !== artifacts.readinessIdentity ||
          classifyOfflineCacheReadinessDelta(
            source.record,
            candidateEvidence.record
          ) !== IDENTITY_ONLY_READY_DELTA) {
        throw new Error("Offline npm cache readiness carry-forward publication differs.");
      }
      let report;
      try { report = JSON.parse(readFileSync(paths.report, "utf8")); }
      catch { throw new Error("Offline npm cache readiness carry-forward report is not valid JSON."); }
      validateOfflineCacheReadinessCarryForwardReport(report, artifacts.report);
      validateState(options.workspace);
      validateOfflineCacheReadiness(
        source.record,
        source.record.operationsCommit,
        createRecord(source.record.operationsCommit)
      );
      (dependencies.exchange ?? exchangeOfflineCacheReadiness)(paths, {
        source: source.identity,
        candidate: artifacts.readinessIdentity,
        size: source.bytes.length
      }, options.operationsCommit);
      const current = readEvidence(paths.authority, operational);
      const oldSlot = readEvidence(paths.slot, operational);
      validateOfflineCacheReadiness(
        current.record,
        options.operationsCommit,
        createRecord(options.operationsCommit)
      );
      if (current.identity !== artifacts.readinessIdentity ||
          oldSlot.identity !== source.identity ||
          readEvidence(paths.preserved, operational).identity !== source.identity) {
        throw new Error("Carried-forward offline npm cache readiness verification failed.");
      }
      validateState(options.workspace);
    }
  });
  return {
    ...paths,
    sourceOperationsCommit: source.record.operationsCommit,
    sourceReadinessIdentity: source.identity,
    carriedForwardReadinessIdentity: artifacts.readinessIdentity,
    semanticDelta: IDENTITY_ONLY_READY_DELTA,
    lineage: artifacts.report.lineage
  };
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
  const [command, ...arguments_] = process.argv.slice(2);
  if (command === "carry-forward-ready") {
    if (process.getuid?.() !== 0) {
      throw new Error("Offline npm cache readiness carry-forward requires Linux root.");
    }
    const [workspace, sourceReadinessSha256, operationsCommit, carryForward,
      ...extras] = arguments_;
    if (extras.length || !workspace || !sourceReadinessSha256 ||
        !operationsCommit || !carryForward) {
      throw new Error("Usage: offline-npm-cache.mjs carry-forward-ready <approved-rollback-workspace> <source-readiness-sha256> <operations-commit> <carry-forward>");
    }
    const result = publishCarriedForwardOfflineCacheReadiness({
      workspace,
      sourceReadinessSha256,
      operationsCommit,
      carryForward
    });
    process.stdout.write(`OFFLINE_NPM_CACHE_READY identity-only source=${result.sourceReadinessIdentity} current=${result.carriedForwardReadinessIdentity} cache-contents-unchanged=true\n`);
  } else if (command === "verify-forward-build") {
    const [workspace, operationsCommit, ...extras] = arguments_;
    if (extras.length || !workspace || !operationsCommit) {
      throw new Error("Usage: offline-npm-cache.mjs verify-forward-build <approved-forward-workspace> <operations-commit>");
    }
    const result = verifyOfflineCacheForForwardBuild(workspace, operationsCommit);
    process.stdout.write(`OFFLINE_NPM_CACHE_FORWARD_BUILD_READY cache=${result.cacheRoot} missing-required=0 values-recorded=false\n`);
  } else {
    const [workspace, operationsCommit, ...extras] = arguments_;
    if (extras.length || !workspace || !operationsCommit) {
      throw new Error("Usage: offline-npm-cache.mjs <publish-after-offline-verification|verify|classify-recovery|status> <approved-rollback-workspace> <operations-commit>");
    }
    if (command === "publish-after-offline-verification") publishOfflineCacheReadiness(workspace, operationsCommit, { offlineResolutionVerified: true });
    else if (command === "verify") verifyOfflineCacheReadiness(workspace, operationsCommit);
    else if (command === "classify-recovery") process.stdout.write(`${JSON.stringify(classifySealedNotReadyCache(workspace, operationsCommit))}\n`);
    else if (command === "status") {
      try { verifyOfflineCacheReadiness(workspace, operationsCommit); }
      catch { process.stdout.write("OFFLINE_NPM_CACHE_NOT_READY\n"); process.exit(1); }
    } else throw new Error("Usage: offline-npm-cache.mjs <publish-after-offline-verification|verify|classify-recovery|status> <approved-rollback-workspace> <operations-commit>");
    if (command !== "classify-recovery") process.stdout.write("OFFLINE_NPM_CACHE_READY\n");
  }
}
