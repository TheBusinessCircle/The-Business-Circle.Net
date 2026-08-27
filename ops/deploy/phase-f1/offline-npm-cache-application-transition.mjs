import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PREVIOUS_ROLLBACK_APPLICATION_SHA,
  ROLLBACK_APPLICATION_SHA
} from "./application-identities.mjs";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import { resolveProtectedAuthorityLineage } from "./environment-readiness.mjs";
import {
  APPROVED_TARGET_PLATFORM,
  assertSealedReadyCacheOperationalState,
  NODE_VERSION,
  NPM_VERSION,
  OFFLINE_CACHE_ROOT,
  READINESS_PATH,
  READINESS_SCHEMA,
  STATE_ROOT,
  validateOfflineCacheReadiness
} from "./offline-npm-cache.mjs";

export const OFFLINE_CACHE_APPLICATION_TRANSITION =
  "REVIEWED_ROLLBACK_APPLICATION_IDENTITY_OFFLINE_CACHE_READY_TRANSITION";
export const OFFLINE_CACHE_APPLICATION_TRANSITION_SCHEMA =
  "phase-f1-offline-npm-cache-ready-rollback-application-transition-v1";
export const OFFLINE_CACHE_APPLICATION_TRANSITION_DELTA =
  "ROLLBACK_APPLICATION_IDENTITY_ONLY";
export const TRANSITION_SOURCE_OPERATIONS_COMMIT =
  "c10abd77ceca632d206b83bcdae3cf8b7db3c9df";

const AUTHORITY_PATH = "/var/lib/thebusinesscircle/approved-phase-f1-pack.json";
const sha256 = value => createHash("sha256").update(value).digest("hex");
const READINESS_KEYS = Object.freeze([
  "applicationSha", "cacheFileCount", "cacheInventorySha256", "cacheRoot",
  "lockfileSha256", "missingRequiredTargetIntegrityCount", "nodeVersion",
  "npmVersion", "offlineResolutionVerified", "operationsCommit",
  "optionalInapplicableIntegrityCount", "presentRequiredTargetIntegrityCount",
  "ready", "requiredTargetIntegrityCount", "schemaVersion", "targetCpu",
  "targetLibc", "targetOs", "totalLockfileIntegrityCount", "valueMaterialRecorded"
]);

function exactKeys(value, expected, label) {
  if (!value || Array.isArray(value) || typeof value !== "object" ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} has unknown or missing fields.`);
  }
}

function commit(value, label) {
  if (!/^[0-9a-f]{40}$/u.test(value || "")) throw new Error(`${label} is invalid.`);
}

function digest(value, label) {
  if (!/^[0-9a-f]{64}$/u.test(value || "")) throw new Error(`${label} is invalid.`);
}

function protectedEvidence(path, label, enforceMetadata) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
      realpathSync(path) !== path ||
      (enforceMetadata && (stats.uid !== 0 || stats.gid !== 0 ||
        (stats.mode & 0o777) !== 0o600))) {
    throw new Error(`${label} metadata is unsafe.`);
  }
  const bytes = readFileSync(path);
  let record;
  try { record = JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error(`${label} is not valid JSON.`); }
  return { bytes, record, identity: sha256(bytes) };
}

export function validateSourceOfflineCacheReadiness(record, operationsCommit) {
  commit(operationsCommit, "Source offline cache authority");
  exactKeys(record, READINESS_KEYS, "Source offline npm cache readiness");
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
      record.applicationSha !== PREVIOUS_ROLLBACK_APPLICATION_SHA ||
      record.cacheRoot !== OFFLINE_CACHE_ROOT ||
      record.nodeVersion !== NODE_VERSION || record.npmVersion !== NPM_VERSION ||
      record.targetOs !== APPROVED_TARGET_PLATFORM.os ||
      record.targetCpu !== APPROVED_TARGET_PLATFORM.cpu ||
      record.targetLibc !== APPROVED_TARGET_PLATFORM.libc ||
      !/^[0-9a-f]{64}$/u.test(record.lockfileSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(record.cacheInventorySha256 || "") ||
      counts.some(value => !Number.isSafeInteger(value) || value < 0) ||
      record.totalLockfileIntegrityCount <= 0 || record.cacheFileCount <= 0 ||
      record.presentRequiredTargetIntegrityCount !== record.requiredTargetIntegrityCount ||
      record.missingRequiredTargetIntegrityCount !== 0 ||
      record.totalLockfileIntegrityCount !==
        record.requiredTargetIntegrityCount + record.optionalInapplicableIntegrityCount ||
      record.offlineResolutionVerified !== true || record.ready !== true ||
      record.valueMaterialRecorded !== false) {
    throw new Error("Source offline npm cache readiness is not the approved application transition source.");
  }
  return record;
}

export function classifyOfflineCacheApplicationTransition(source, candidate) {
  try {
    validateSourceOfflineCacheReadiness(source, source.operationsCommit);
    validateOfflineCacheReadiness(candidate, candidate.operationsCommit);
    const sourceSemantics = { ...source };
    const candidateSemantics = { ...candidate };
    delete sourceSemantics.operationsCommit;
    delete sourceSemantics.applicationSha;
    delete candidateSemantics.operationsCommit;
    delete candidateSemantics.applicationSha;
    return JSON.stringify(sourceSemantics) === JSON.stringify(candidateSemantics) &&
      source.operationsCommit !== candidate.operationsCommit &&
      candidate.applicationSha === ROLLBACK_APPLICATION_SHA
      ? OFFLINE_CACHE_APPLICATION_TRANSITION_DELTA
      : "UNEXPECTED_SEMANTIC_DELTA";
  } catch {
    return "UNEXPECTED_SEMANTIC_DELTA";
  }
}

export function createOfflineCacheApplicationTransitionRecord(source, operationsCommit) {
  validateSourceOfflineCacheReadiness(source, source.operationsCommit);
  commit(operationsCommit, "Offline cache transition authority");
  const candidate = {
    ...source,
    operationsCommit,
    applicationSha: ROLLBACK_APPLICATION_SHA
  };
  validateOfflineCacheReadiness(candidate, operationsCommit);
  return candidate;
}

export function createOfflineCacheApplicationTransitionArtifacts(
  source,
  candidate,
  operationsCommit,
  lineage
) {
  commit(operationsCommit, "Offline cache transition authority");
  validateSourceOfflineCacheReadiness(source.record, source.record.operationsCommit);
  validateOfflineCacheReadiness(candidate, operationsCommit);
  if (source.record.operationsCommit !== TRANSITION_SOURCE_OPERATIONS_COMMIT ||
      !Array.isArray(lineage) || lineage.at(-1) !== operationsCommit ||
      !lineage.includes(TRANSITION_SOURCE_OPERATIONS_COMMIT) ||
      new Set(lineage).size !== lineage.length ||
      classifyOfflineCacheApplicationTransition(source.record, candidate) !==
        OFFLINE_CACHE_APPLICATION_TRANSITION_DELTA) {
    throw new Error("Offline cache application transition changed READY semantics or lineage.");
  }
  const readinessPayload = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`);
  if (readinessPayload.length !== source.bytes.length) {
    throw new Error("Offline cache application transition exchange size differs.");
  }
  const readinessIdentity = sha256(readinessPayload);
  const report = {
    schemaVersion: OFFLINE_CACHE_APPLICATION_TRANSITION_SCHEMA,
    transition: OFFLINE_CACHE_APPLICATION_TRANSITION,
    semanticDelta: OFFLINE_CACHE_APPLICATION_TRANSITION_DELTA,
    sourceOperationsCommit: source.record.operationsCommit,
    operationsCommit,
    lineage: lineage.slice(lineage.indexOf(source.record.operationsCommit)),
    sourceReadinessSha256: source.identity,
    transitionedReadinessSha256: readinessIdentity,
    previousRollbackApplicationSha: PREVIOUS_ROLLBACK_APPLICATION_SHA,
    rollbackApplicationSha: ROLLBACK_APPLICATION_SHA,
    lockfileIdentityUnchanged: true,
    cacheContentsUnchanged: true,
    offlineResolutionPreserved: true,
    sourcePreserved: true,
    valuesRecorded: false
  };
  validateOfflineCacheApplicationTransitionReport(report);
  return {
    readinessPayload,
    readinessIdentity,
    report,
    reportPayload: Buffer.from(`${JSON.stringify(report, null, 2)}\n`)
  };
}

export function validateOfflineCacheApplicationTransitionReport(report, expected = report) {
  exactKeys(report, [
    "schemaVersion", "transition", "semanticDelta", "sourceOperationsCommit",
    "operationsCommit", "lineage", "sourceReadinessSha256",
    "transitionedReadinessSha256", "previousRollbackApplicationSha",
    "rollbackApplicationSha", "lockfileIdentityUnchanged", "cacheContentsUnchanged",
    "offlineResolutionPreserved", "sourcePreserved", "valuesRecorded"
  ], "Offline cache application transition report");
  if (report.schemaVersion !== OFFLINE_CACHE_APPLICATION_TRANSITION_SCHEMA ||
      report.transition !== OFFLINE_CACHE_APPLICATION_TRANSITION ||
      report.semanticDelta !== OFFLINE_CACHE_APPLICATION_TRANSITION_DELTA ||
      report.sourceOperationsCommit !== TRANSITION_SOURCE_OPERATIONS_COMMIT ||
      report.previousRollbackApplicationSha !== PREVIOUS_ROLLBACK_APPLICATION_SHA ||
      report.rollbackApplicationSha !== ROLLBACK_APPLICATION_SHA ||
      !Array.isArray(report.lineage) || report.lineage[0] !== report.sourceOperationsCommit ||
      report.lineage.at(-1) !== report.operationsCommit ||
      new Set(report.lineage).size !== report.lineage.length ||
      report.lineage.some(value => !/^[0-9a-f]{40}$/u.test(value)) ||
      report.lockfileIdentityUnchanged !== true || report.cacheContentsUnchanged !== true ||
      report.offlineResolutionPreserved !== true || report.sourcePreserved !== true ||
      report.valuesRecorded !== false || JSON.stringify(report) !== JSON.stringify(expected)) {
    throw new Error("Offline cache application transition report is invalid.");
  }
  digest(report.sourceReadinessSha256, "Source offline cache readiness identity");
  digest(report.transitionedReadinessSha256, "Transitioned offline cache readiness identity");
  return report;
}

function currentAuthority(operationsCommit) {
  const authority = protectedEvidence(AUTHORITY_PATH, "Operations authority", true).record;
  if (authority.operationsCommit !== operationsCommit) {
    throw new Error("Offline cache application transition requires the current authority.");
  }
}

function currentPrerequisites(operationsCommit) {
  const pack = `/opt/thebusinesscircle/deployment-packs/${operationsCommit}`;
  for (const [arguments_, label] of [
    [[`${pack}/git-authentication.mjs`, "verify-ready", operationsCommit],
      "Current Git-authentication readiness"],
    [[`${pack}/environment-readiness.mjs`, "verify", STATE_ROOT, operationsCommit],
      "Current environment readiness"]
  ]) {
    const result = spawnSync("/usr/bin/node", arguments_, {
      env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" },
      stdio: "ignore"
    });
    if (result.error || result.signal || result.status !== 0) {
      throw new Error(`${label} verification failed.`);
    }
  }
}

function exchange(paths, identities, operationsCommit) {
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
  ], { env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" }, stdio: "ignore" });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error("Atomic offline cache application transition failed.");
  }
}

export function publishOfflineCacheApplicationTransition(options, dependencies = {}) {
  exactKeys(options, ["sourceReadinessSha256", "operationsCommit", "transition"],
    "Offline cache application transition invocation");
  commit(options.operationsCommit, "Offline cache application transition authority");
  digest(options.sourceReadinessSha256, "Source offline cache readiness identity");
  if (options.transition !== OFFLINE_CACHE_APPLICATION_TRANSITION) {
    throw new Error("Offline cache application transition invocation is invalid.");
  }
  const operational = dependencies.operational !== false;
  const stateRoot = operational ? STATE_ROOT : resolve(dependencies.stateRoot);
  if (operational) {
    if (fileURLToPath(import.meta.url) !==
        `/opt/thebusinesscircle/deployment-packs/${options.operationsCommit}/offline-npm-cache-application-transition.mjs` ||
        realpathSync(stateRoot) !== stateRoot) {
      throw new Error("Offline cache application transition production context is unsafe.");
    }
    currentAuthority(options.operationsCommit);
    currentPrerequisites(options.operationsCommit);
  }
  const lineage = (dependencies.resolveLineage ?? resolveProtectedAuthorityLineage)(
    options.operationsCommit
  );
  const paths = {
    stateRoot,
    authority: operational ? READINESS_PATH : join(stateRoot, "offline-npm-cache-readiness.json"),
    preserved: join(stateRoot,
      `offline-npm-cache-readiness-preserved-${TRANSITION_SOURCE_OPERATIONS_COMMIT}.json`),
    slot: join(stateRoot, `.offline-npm-cache-readiness.exchange-${options.operationsCommit}.json`),
    report: join(stateRoot,
      `offline-npm-cache-readiness-application-transition-${options.operationsCommit}.json`)
  };
  const read = dependencies.readEvidence ?? protectedEvidence;
  const source = read(paths.authority, "Source offline cache readiness", operational);
  if (source.identity !== options.sourceReadinessSha256) {
    throw new Error("Source offline cache readiness identity differs.");
  }
  const expectedCacheState = {
    cacheFileCount: source.record.cacheFileCount,
    cacheInventorySha256: source.record.cacheInventorySha256
  };
  (dependencies.assertState ?? assertSealedReadyCacheOperationalState)(expectedCacheState);
  const candidate = (dependencies.createCandidate ??
    createOfflineCacheApplicationTransitionRecord)(source.record, options.operationsCommit);
  const artifacts = createOfflineCacheApplicationTransitionArtifacts(
    source, candidate, options.operationsCommit, lineage
  );
  for (const path of [paths.preserved, paths.slot, paths.report]) {
    if ((dependencies.exists ?? existsSync)(path)) {
      throw new Error("Offline cache application transition target already exists.");
    }
  }
  (dependencies.publish ?? publishNoReplaceSet)([
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
      const unchanged = read(paths.authority, "Source offline cache readiness", operational);
      const preserved = read(paths.preserved, "Preserved offline cache readiness", operational);
      const transitioned = read(paths.slot, "Candidate offline cache readiness", operational);
      if (unchanged.identity !== source.identity || preserved.identity !== source.identity ||
          transitioned.identity !== artifacts.readinessIdentity ||
          classifyOfflineCacheApplicationTransition(source.record, transitioned.record) !==
            OFFLINE_CACHE_APPLICATION_TRANSITION_DELTA) {
        throw new Error("Offline cache application transition publication differs.");
      }
      validateOfflineCacheApplicationTransitionReport(
        JSON.parse(readFileSync(paths.report, "utf8")), artifacts.report
      );
      (dependencies.assertState ?? assertSealedReadyCacheOperationalState)(expectedCacheState);
      const rechecked = (dependencies.createCandidate ??
        createOfflineCacheApplicationTransitionRecord)(
        source.record,
        options.operationsCommit
      );
      if (JSON.stringify(rechecked) !== JSON.stringify(candidate)) {
        throw new Error("Offline cache application transition state changed before exchange.");
      }
      (dependencies.exchange ?? exchange)(paths, {
        source: source.identity,
        candidate: artifacts.readinessIdentity,
        size: source.bytes.length
      }, options.operationsCommit);
      const current = read(paths.authority, "Current offline cache readiness", operational);
      const oldSlot = read(paths.slot, "Prior offline cache readiness slot", operational);
      validateOfflineCacheReadiness(current.record, options.operationsCommit, candidate);
      if (current.identity !== artifacts.readinessIdentity || oldSlot.identity !== source.identity ||
          read(paths.preserved, "Preserved offline cache readiness", operational).identity !==
            source.identity) {
        throw new Error("Offline cache application transition final verification failed.");
      }
      (dependencies.assertState ?? assertSealedReadyCacheOperationalState)(expectedCacheState);
    }
  });
  return {
    sourceReadinessIdentity: source.identity,
    transitionedReadinessIdentity: artifacts.readinessIdentity,
    semanticDelta: OFFLINE_CACHE_APPLICATION_TRANSITION_DELTA,
    lineage: artifacts.report.lineage
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.getuid?.() !== 0) {
    throw new Error("Offline cache application transition requires Linux root.");
  }
  const [mode, sourceReadinessSha256, operationsCommit, transition, ...extras] =
    process.argv.slice(2);
  if (mode !== "transition-ready-rollback-application" || extras.length ||
      !sourceReadinessSha256 || !operationsCommit || !transition) {
    throw new Error("Usage: offline-npm-cache-application-transition.mjs transition-ready-rollback-application <source-readiness-sha256> <operations-commit> <transition>");
  }
  const result = publishOfflineCacheApplicationTransition({
    sourceReadinessSha256,
    operationsCommit,
    transition
  });
  process.stdout.write(
    `OFFLINE_NPM_CACHE_READY_ROLLBACK_APPLICATION_TRANSITION source=${result.sourceReadinessIdentity} current=${result.transitionedReadinessIdentity} semantic-delta=${result.semanticDelta} cache-contents-unchanged=true\n`
  );
}
