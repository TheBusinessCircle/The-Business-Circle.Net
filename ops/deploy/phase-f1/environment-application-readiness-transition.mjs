import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FORWARD_APPLICATION_SHA,
  HISTORICAL_PRODUCTION_SHA,
  PREVIOUS_ROLLBACK_APPLICATION_SHA,
  ROLLBACK_APPLICATION_SHA
} from "./application-identities.mjs";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import {
  createEnvironmentReadiness,
  resolveProtectedAuthorityLineage,
  validateEnvironmentReadinessRecord,
  verifyCrossUserIsolation
} from "./environment-readiness.mjs";
import { validateProtectedEnvironmentSchema } from "./validate-environment.mjs";

export const ENVIRONMENT_APPLICATION_TRANSITION =
  "REVIEWED_ROLLBACK_APPLICATION_IDENTITY_ENVIRONMENT_READINESS_TRANSITION";
export const ENVIRONMENT_APPLICATION_TRANSITION_SCHEMA =
  "phase-f1-environment-readiness-rollback-application-transition-v1";
export const ENVIRONMENT_APPLICATION_TRANSITION_DELTA =
  "ROLLBACK_APPLICATION_IDENTITY_ONLY";
export const ENVIRONMENT_APPLICATION_TRANSITION_EXCHANGE_MODE =
  "readiness-exchange";
export const TRANSITION_SOURCE_OPERATIONS_COMMIT =
  "c10abd77ceca632d206b83bcdae3cf8b7db3c9df";

const STATE_ROOT = "/var/lib/thebusinesscircle/deployment-state";
const AUTHORITY_PATH = "/var/lib/thebusinesscircle/approved-phase-f1-pack.json";
const EXPECTED_VALIDATIONS = Object.freeze({
  bcnProtectedEnvironment: "PASSED",
  buildProtectedEnvironment: "PASSED",
  circleCardProtectedEnvironment: "PASSED",
  crossEnvironmentContract: "PASSED",
  crossUserIsolation: "PASSED",
  releaseIntegrity: "NOT_EVALUATED"
});
const sha256 = value => createHash("sha256").update(value).digest("hex");

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

export function validateSourceEnvironmentReadiness(record, operationsCommit) {
  commit(operationsCommit, "Source environment readiness authority");
  exactKeys(record, [
    "schemaVersion", "authority", "ready", "operationsCommit",
    "forwardApplicationSha", "rollbackApplicationSha",
    "historicalProductionSha", "validations", "valuesRecorded"
  ], "Source environment readiness");
  exactKeys(record.validations, Object.keys(EXPECTED_VALIDATIONS),
    "Source environment readiness validations");
  if (record.schemaVersion !== "phase-f1-environment-readiness-v1" ||
      record.authority !== "protected-environment-only" || record.ready !== true ||
      record.operationsCommit !== operationsCommit ||
      record.forwardApplicationSha !== FORWARD_APPLICATION_SHA ||
      record.rollbackApplicationSha !== PREVIOUS_ROLLBACK_APPLICATION_SHA ||
      record.historicalProductionSha !== HISTORICAL_PRODUCTION_SHA ||
      record.valuesRecorded !== false ||
      Object.entries(EXPECTED_VALIDATIONS)
        .some(([key, value]) => record.validations[key] !== value)) {
    throw new Error("Source environment readiness is not the approved application transition source.");
  }
  return record;
}

export function classifyEnvironmentApplicationTransition(source, candidate) {
  try {
    validateSourceEnvironmentReadiness(source, source.operationsCommit);
    validateEnvironmentReadinessRecord(candidate, candidate.operationsCommit);
    const expected = {
      ...source,
      operationsCommit: candidate.operationsCommit,
      rollbackApplicationSha: ROLLBACK_APPLICATION_SHA,
      validations: { ...source.validations }
    };
    return JSON.stringify(candidate) === JSON.stringify(expected) &&
      source.operationsCommit !== candidate.operationsCommit
      ? ENVIRONMENT_APPLICATION_TRANSITION_DELTA
      : "UNEXPECTED_SEMANTIC_DELTA";
  } catch {
    return "UNEXPECTED_SEMANTIC_DELTA";
  }
}

export function createEnvironmentApplicationTransitionArtifacts(
  source,
  operationsCommit,
  lineage
) {
  commit(operationsCommit, "Environment transition authority");
  validateSourceEnvironmentReadiness(source.record, source.record.operationsCommit);
  if (source.record.operationsCommit !== TRANSITION_SOURCE_OPERATIONS_COMMIT ||
      !Array.isArray(lineage) || lineage.at(-1) !== operationsCommit ||
      !lineage.includes(TRANSITION_SOURCE_OPERATIONS_COMMIT) ||
      new Set(lineage).size !== lineage.length) {
    throw new Error("Environment application transition lineage is not approved.");
  }
  const candidate = createEnvironmentReadiness(operationsCommit);
  if (classifyEnvironmentApplicationTransition(source.record, candidate) !==
      ENVIRONMENT_APPLICATION_TRANSITION_DELTA) {
    throw new Error("Environment application transition changed readiness semantics.");
  }
  const readinessPayload = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`);
  if (readinessPayload.length !== source.bytes.length) {
    throw new Error("Environment application transition exchange size differs.");
  }
  const readinessIdentity = sha256(readinessPayload);
  const report = {
    schemaVersion: ENVIRONMENT_APPLICATION_TRANSITION_SCHEMA,
    transition: ENVIRONMENT_APPLICATION_TRANSITION,
    semanticDelta: ENVIRONMENT_APPLICATION_TRANSITION_DELTA,
    sourceOperationsCommit: source.record.operationsCommit,
    operationsCommit,
    lineage: lineage.slice(lineage.indexOf(source.record.operationsCommit)),
    sourceReadinessSha256: source.identity,
    transitionedReadinessSha256: readinessIdentity,
    previousRollbackApplicationSha: PREVIOUS_ROLLBACK_APPLICATION_SHA,
    rollbackApplicationSha: ROLLBACK_APPLICATION_SHA,
    forwardApplicationSha: FORWARD_APPLICATION_SHA,
    protectedEnvironmentSemanticsUnchanged: true,
    sourcePreserved: true,
    valuesRecorded: false
  };
  validateEnvironmentApplicationTransitionReport(report);
  return {
    candidate,
    readinessPayload,
    readinessIdentity,
    report,
    reportPayload: Buffer.from(`${JSON.stringify(report, null, 2)}\n`)
  };
}

export function validateEnvironmentApplicationTransitionReport(report, expected = report) {
  exactKeys(report, [
    "schemaVersion", "transition", "semanticDelta", "sourceOperationsCommit",
    "operationsCommit", "lineage", "sourceReadinessSha256",
    "transitionedReadinessSha256", "previousRollbackApplicationSha",
    "rollbackApplicationSha", "forwardApplicationSha",
    "protectedEnvironmentSemanticsUnchanged", "sourcePreserved", "valuesRecorded"
  ], "Environment application transition report");
  if (report.schemaVersion !== ENVIRONMENT_APPLICATION_TRANSITION_SCHEMA ||
      report.transition !== ENVIRONMENT_APPLICATION_TRANSITION ||
      report.semanticDelta !== ENVIRONMENT_APPLICATION_TRANSITION_DELTA ||
      report.sourceOperationsCommit !== TRANSITION_SOURCE_OPERATIONS_COMMIT ||
      report.previousRollbackApplicationSha !== PREVIOUS_ROLLBACK_APPLICATION_SHA ||
      report.rollbackApplicationSha !== ROLLBACK_APPLICATION_SHA ||
      report.forwardApplicationSha !== FORWARD_APPLICATION_SHA ||
      !Array.isArray(report.lineage) || report.lineage[0] !== report.sourceOperationsCommit ||
      report.lineage.at(-1) !== report.operationsCommit ||
      new Set(report.lineage).size !== report.lineage.length ||
      report.lineage.some(value => !/^[0-9a-f]{40}$/u.test(value)) ||
      report.protectedEnvironmentSemanticsUnchanged !== true ||
      report.sourcePreserved !== true || report.valuesRecorded !== false ||
      JSON.stringify(report) !== JSON.stringify(expected)) {
    throw new Error("Environment application transition report is invalid.");
  }
  digest(report.sourceReadinessSha256, "Source environment readiness identity");
  digest(report.transitionedReadinessSha256, "Transitioned environment readiness identity");
  return report;
}

function currentAuthority(operationsCommit) {
  const authority = protectedEvidence(AUTHORITY_PATH, "Operations authority", true).record;
  if (authority.operationsCommit !== operationsCommit) {
    throw new Error("Environment application transition requires the current authority.");
  }
}

function sourcePackVerifies(sourceOperationsCommit) {
  const pack = `/opt/thebusinesscircle/deployment-packs/${sourceOperationsCommit}`;
  const result = spawnSync("/usr/bin/node", [
    `${pack}/environment-readiness.mjs`, "verify", STATE_ROOT, sourceOperationsCommit
  ], { env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" }, stdio: "ignore" });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error("Trusted source environment readiness verification failed.");
  }
}

function validateCurrentEnvironment(dependencies) {
  (dependencies.validateSchema ?? validateProtectedEnvironmentSchema)();
  (dependencies.verifyIsolation ?? verifyCrossUserIsolation)();
}

function exchange(paths, identities, operationsCommit) {
  const helper = `/opt/thebusinesscircle/deployment-packs/${operationsCommit}/atomic-identity-exchange.py`;
  const result = spawnSync("/usr/bin/python3", [
    helper, ENVIRONMENT_APPLICATION_TRANSITION_EXCHANGE_MODE,
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
    throw new Error("Atomic environment application transition failed.");
  }
}

export function publishEnvironmentApplicationTransition(options, dependencies = {}) {
  exactKeys(options, ["sourceReadinessSha256", "operationsCommit", "transition"],
    "Environment application transition invocation");
  commit(options.operationsCommit, "Environment application transition authority");
  digest(options.sourceReadinessSha256, "Source environment readiness identity");
  if (options.transition !== ENVIRONMENT_APPLICATION_TRANSITION) {
    throw new Error("Environment application transition identifier is unsupported.");
  }
  const operational = dependencies.operational !== false;
  const stateRoot = operational ? STATE_ROOT : resolve(dependencies.stateRoot);
  if (operational) {
    if (fileURLToPath(import.meta.url) !==
        `/opt/thebusinesscircle/deployment-packs/${options.operationsCommit}/environment-application-readiness-transition.mjs` ||
        realpathSync(stateRoot) !== stateRoot) {
      throw new Error("Environment application transition production context is unsafe.");
    }
    currentAuthority(options.operationsCommit);
    sourcePackVerifies(TRANSITION_SOURCE_OPERATIONS_COMMIT);
  }
  const lineage = (dependencies.resolveLineage ?? resolveProtectedAuthorityLineage)(
    options.operationsCommit
  );
  const paths = {
    stateRoot,
    authority: join(stateRoot, "environment-readiness.json"),
    preserved: join(stateRoot,
      `environment-readiness-preserved-${TRANSITION_SOURCE_OPERATIONS_COMMIT}.json`),
    slot: join(stateRoot, `.environment-readiness.exchange-${options.operationsCommit}.json`),
    report: join(stateRoot,
      `environment-readiness-application-transition-${options.operationsCommit}.json`)
  };
  const read = dependencies.readEvidence ?? protectedEvidence;
  const source = read(paths.authority, "Source environment readiness", operational);
  if (source.identity !== options.sourceReadinessSha256) {
    throw new Error("Source environment readiness identity differs.");
  }
  const artifacts = createEnvironmentApplicationTransitionArtifacts(
    source, options.operationsCommit, lineage
  );
  validateCurrentEnvironment(dependencies);
  for (const path of [paths.preserved, paths.slot, paths.report]) {
    if ((dependencies.exists ?? existsSync)(path)) {
      throw new Error("Environment application transition target already exists.");
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
      const unchanged = read(paths.authority, "Source environment readiness", operational);
      const preserved = read(paths.preserved, "Preserved environment readiness", operational);
      const candidate = read(paths.slot, "Candidate environment readiness", operational);
      if (unchanged.identity !== source.identity || preserved.identity !== source.identity ||
          candidate.identity !== artifacts.readinessIdentity ||
          classifyEnvironmentApplicationTransition(source.record, candidate.record) !==
            ENVIRONMENT_APPLICATION_TRANSITION_DELTA) {
        throw new Error("Environment application transition publication differs.");
      }
      validateEnvironmentApplicationTransitionReport(
        JSON.parse(readFileSync(paths.report, "utf8")), artifacts.report
      );
      validateCurrentEnvironment(dependencies);
      (dependencies.exchange ?? exchange)(paths, {
        source: source.identity,
        candidate: artifacts.readinessIdentity,
        size: source.bytes.length
      }, options.operationsCommit);
      const current = read(paths.authority, "Current environment readiness", operational);
      const oldSlot = read(paths.slot, "Prior environment readiness slot", operational);
      validateEnvironmentReadinessRecord(current.record, options.operationsCommit);
      if (current.identity !== artifacts.readinessIdentity ||
          oldSlot.identity !== source.identity ||
          read(paths.preserved, "Preserved environment readiness", operational).identity !==
            source.identity) {
        throw new Error("Environment application transition final verification failed.");
      }
      validateCurrentEnvironment(dependencies);
    }
  });
  return {
    sourceReadinessIdentity: source.identity,
    transitionedReadinessIdentity: artifacts.readinessIdentity,
    semanticDelta: ENVIRONMENT_APPLICATION_TRANSITION_DELTA,
    lineage: artifacts.report.lineage
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.getuid?.() !== 0) {
    throw new Error("Environment application transition requires Linux root.");
  }
  const [mode, sourceReadinessSha256, operationsCommit, transition, ...extras] =
    process.argv.slice(2);
  if (mode !== "transition-rollback-application" || extras.length ||
      !sourceReadinessSha256 || !operationsCommit || !transition) {
    throw new Error("Usage: environment-application-readiness-transition.mjs transition-rollback-application <source-readiness-sha256> <operations-commit> <transition>");
  }
  const result = publishEnvironmentApplicationTransition({
    sourceReadinessSha256,
    operationsCommit,
    transition
  });
  process.stdout.write(
    `ENVIRONMENT_READINESS_ROLLBACK_APPLICATION_TRANSITION source=${result.sourceReadinessIdentity} current=${result.transitionedReadinessIdentity} semantic-delta=${result.semanticDelta} values-recorded=false\n`
  );
}
