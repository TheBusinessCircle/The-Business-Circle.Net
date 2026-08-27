import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
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
import { validateProtectedEnvironmentSchema } from "./validate-environment.mjs";

export const ENVIRONMENT_READINESS_SCHEMA = "phase-f1-environment-readiness-v1";
export const ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA =
  "phase-f1-environment-readiness-carry-forward-report-v1";
export const IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD =
  "IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD";
export const CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD =
  "CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD";
export const CHAINED_ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA =
  "phase-f1-environment-readiness-chained-carry-forward-report-v1";
export const TRANSITION_DERIVED_CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD =
  "TRANSITION_DERIVED_CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD";
export const TRANSITION_DERIVED_CHAINED_ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA =
  "phase-f1-environment-readiness-transition-derived-chained-carry-forward-report-v1";
export const IDENTITY_ONLY_READINESS_DELTA = "IDENTITY_ONLY";
export const READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT =
  "2cabfe759e743509315f6c6b81540d2bbf7a0df2";
export const READINESS_CARRY_FORWARD_IMMEDIATE_PREDECESSOR =
  "5b50788fc815fcde726db04f79254df3121ce13a";
export const READINESS_CARRY_FORWARD_CHAIN_SOURCE =
  "f041d4f52ad4cbbb240f4a2ed51fb9f8f8c9a87f";
export const ROLLBACK_APPLICATION_TRANSITION_SOURCE_OPERATIONS_COMMIT =
  "c10abd77ceca632d206b83bcdae3cf8b7db3c9df";
export const ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT =
  "2cc489362cbd8ccabdacf2be4660f4e4da939e5d";
const ENVIRONMENT_APPLICATION_TRANSITION_SCHEMA =
  "phase-f1-environment-readiness-rollback-application-transition-v1";
const ENVIRONMENT_APPLICATION_TRANSITION =
  "REVIEWED_ROLLBACK_APPLICATION_IDENTITY_ENVIRONMENT_READINESS_TRANSITION";
const ENVIRONMENT_APPLICATION_TRANSITION_DELTA =
  "ROLLBACK_APPLICATION_IDENTITY_ONLY";
const MAX_AUTHORITY_LINEAGE_LENGTH = 64;
const READINESS_NAME = "environment-readiness.json";
const AUTHORITY_IDENTITY_PATH =
  "/var/lib/thebusinesscircle/approved-phase-f1-pack.json";
const IDENTITY_HISTORY_ROOT =
  "/var/lib/thebusinesscircle/phase-f1-identity-history";
const AUTHORITY_EXCHANGE_SLOT_PREFIX =
  "/var/lib/thebusinesscircle/.approved-phase-f1-pack.exchange-";
const EXPECTED_VALIDATIONS = Object.freeze({
  bcnProtectedEnvironment: "PASSED",
  buildProtectedEnvironment: "PASSED",
  circleCardProtectedEnvironment: "PASSED",
  crossEnvironmentContract: "PASSED",
  crossUserIsolation: "PASSED",
  releaseIntegrity: "NOT_EVALUATED"
});

function exactKeys(value, expected, label) {
  if (!value || Array.isArray(value) || typeof value !== "object" ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} has unknown or missing fields.`);
  }
}

function validateOperationsCommit(value) {
  if (!/^[0-9a-f]{40}$/u.test(value || "")) {
    throw new Error("Environment readiness operations identity is invalid.");
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exactOptions(value, expected, label) {
  exactKeys(value, expected, label);
}

function readinessPath(stateRoot) {
  return join(resolve(stateRoot), READINESS_NAME);
}

export function preservedEnvironmentReadinessPath(
  stateRoot,
  operationsCommit
) {
  validateOperationsCommit(operationsCommit);
  return join(
    resolve(stateRoot),
    `environment-readiness-preserved-${operationsCommit}.json`
  );
}

export function environmentReadinessExchangeSlotPath(
  stateRoot,
  operationsCommit
) {
  validateOperationsCommit(operationsCommit);
  return join(
    resolve(stateRoot),
    `.environment-readiness.exchange-${operationsCommit}.json`
  );
}

export function environmentReadinessCarryForwardReportPath(
  stateRoot,
  operationsCommit
) {
  validateOperationsCommit(operationsCommit);
  return join(
    resolve(stateRoot),
    `environment-readiness-carry-forward-${operationsCommit}.json`
  );
}

export function transitionDerivedEnvironmentReadinessCarryForwardReportPath(
  stateRoot,
  operationsCommit
) {
  validateOperationsCommit(operationsCommit);
  return join(
    resolve(stateRoot),
    `environment-readiness-transition-derived-carry-forward-${operationsCommit}.json`
  );
}

function environmentApplicationTransitionReportPath(stateRoot) {
  return join(
    resolve(stateRoot),
    `environment-readiness-application-transition-${ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT}.json`
  );
}

export function createEnvironmentReadiness(operationsCommit) {
  validateOperationsCommit(operationsCommit);
  return {
    schemaVersion: ENVIRONMENT_READINESS_SCHEMA,
    authority: "protected-environment-only",
    ready: true,
    operationsCommit,
    forwardApplicationSha: FORWARD_APPLICATION_SHA,
    rollbackApplicationSha: ROLLBACK_APPLICATION_SHA,
    historicalProductionSha: HISTORICAL_PRODUCTION_SHA,
    validations: { ...EXPECTED_VALIDATIONS },
    valuesRecorded: false
  };
}

export function validateEnvironmentReadinessRecord(record, operationsCommit) {
  validateOperationsCommit(operationsCommit);
  exactKeys(record, [
    "schemaVersion", "authority", "ready", "operationsCommit",
    "forwardApplicationSha", "rollbackApplicationSha",
    "historicalProductionSha", "validations", "valuesRecorded"
  ], "Environment readiness");
  exactKeys(record.validations, Object.keys(EXPECTED_VALIDATIONS), "Environment readiness validations");
  if (record.schemaVersion !== ENVIRONMENT_READINESS_SCHEMA ||
      record.authority !== "protected-environment-only" || record.ready !== true ||
      record.operationsCommit !== operationsCommit ||
      record.forwardApplicationSha !== FORWARD_APPLICATION_SHA ||
      record.rollbackApplicationSha !== ROLLBACK_APPLICATION_SHA ||
      record.historicalProductionSha !== HISTORICAL_PRODUCTION_SHA ||
      record.valuesRecorded !== false ||
      Object.entries(EXPECTED_VALIDATIONS).some(([key, value]) => record.validations[key] !== value)) {
    throw new Error("Environment readiness identity or validation state is invalid.");
  }
  return record;
}

export function verifyCrossUserIsolation(run = spawnSync) {
  const checks = [
    ["circle-card-app", "/etc/thebusinesscircle/circle-card/runtime.env.json", true],
    ["circle-card-app", "/etc/thebusinesscircle/bcn/runtime.env.json", false],
    ["bcn-app", "/etc/thebusinesscircle/bcn/runtime.env.json", true],
    ["bcn-app", "/etc/thebusinesscircle/circle-card/runtime.env.json", false],
    ["phase-f1-build", "/etc/thebusinesscircle/build/build.env.json", true],
    ["phase-f1-build", "/etc/thebusinesscircle/bcn/runtime.env.json", false],
    ["phase-f1-build", "/etc/thebusinesscircle/circle-card/runtime.env.json", false]
  ];
  for (const [identity, path, readable] of checks) {
    const result = run("/usr/bin/sudo", ["-u", identity, "/usr/bin/test", "-r", path], {
      env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" },
      stdio: "ignore"
    });
    if (result.error || result.signal || result.status !== (readable ? 0 : 1)) {
      throw new Error("Protected environment cross-user isolation failed.");
    }
  }
  return true;
}

function assertOperationalStateRoot(stateRoot) {
  const root = resolve(stateRoot);
  const stats = lstatSync(root);
  if (!stats.isDirectory() || stats.isSymbolicLink() || stats.uid !== 0 || stats.gid !== 0 ||
      (stats.mode & 0o777) !== 0o700 || realpathSync(root) !== root) {
    throw new Error("Environment readiness state root is unsafe.");
  }
  return root;
}

function assertProtectedRegularFile(target, label) {
  const stats = lstatSync(target);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
      stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o600 ||
      realpathSync(target) !== target) {
    throw new Error(`${label} metadata is unsafe.`);
  }
  return stats;
}

function readReadiness(target, operationsCommit, operational) {
  if (operational) {
    assertProtectedRegularFile(target, "Environment readiness file");
  }
  let record;
  try {
    record = JSON.parse(readFileSync(target, "utf8"));
  } catch {
    throw new Error("Environment readiness is not valid JSON.");
  }
  return validateEnvironmentReadinessRecord(record, operationsCommit);
}

function readReadinessEvidence(target, operationsCommit, operational) {
  const evidence = readReadinessEvidenceUnbound(target, operational);
  validateEnvironmentReadinessRecord(evidence.record, operationsCommit);
  return evidence;
}

function readReadinessEvidenceUnbound(target, operational) {
  if (operational) {
    assertProtectedRegularFile(target, "Environment readiness file");
  }
  const bytes = readFileSync(target);
  let record;
  try {
    record = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Environment readiness is not valid JSON.");
  }
  validateOperationsCommit(record?.operationsCommit);
  validateEnvironmentReadinessRecord(record, record.operationsCommit);
  return { bytes, record, identity: sha256(bytes) };
}

function validateApplicationTransitionSourceReadiness(record) {
  exactKeys(record, [
    "schemaVersion", "authority", "ready", "operationsCommit",
    "forwardApplicationSha", "rollbackApplicationSha",
    "historicalProductionSha", "validations", "valuesRecorded"
  ], "Application-transition source environment readiness");
  exactKeys(
    record.validations,
    Object.keys(EXPECTED_VALIDATIONS),
    "Application-transition source environment readiness validations"
  );
  if (record.schemaVersion !== ENVIRONMENT_READINESS_SCHEMA ||
      record.authority !== "protected-environment-only" || record.ready !== true ||
      record.operationsCommit !== ROLLBACK_APPLICATION_TRANSITION_SOURCE_OPERATIONS_COMMIT ||
      record.forwardApplicationSha !== FORWARD_APPLICATION_SHA ||
      record.rollbackApplicationSha !== PREVIOUS_ROLLBACK_APPLICATION_SHA ||
      record.historicalProductionSha !== HISTORICAL_PRODUCTION_SHA ||
      record.valuesRecorded !== false ||
      Object.entries(EXPECTED_VALIDATIONS)
        .some(([key, value]) => record.validations[key] !== value)) {
    throw new Error("Application-transition source environment readiness is invalid.");
  }
  return record;
}

function readApplicationTransitionSourceReadinessEvidence(target, operational) {
  if (operational) {
    assertProtectedRegularFile(
      target,
      "Application-transition source environment readiness"
    );
  }
  const bytes = readFileSync(target);
  let record;
  try {
    record = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Application-transition source environment readiness is not valid JSON.");
  }
  validateApplicationTransitionSourceReadiness(record);
  return { bytes, record, identity: sha256(bytes) };
}

function validateEnvironmentApplicationTransitionReportAnchor(report) {
  exactKeys(report, [
    "schemaVersion", "transition", "semanticDelta", "sourceOperationsCommit",
    "operationsCommit", "lineage", "sourceReadinessSha256",
    "transitionedReadinessSha256", "previousRollbackApplicationSha",
    "rollbackApplicationSha", "forwardApplicationSha",
    "protectedEnvironmentSemanticsUnchanged", "sourcePreserved", "valuesRecorded"
  ], "Environment application-transition anchor report");
  if (report.schemaVersion !== ENVIRONMENT_APPLICATION_TRANSITION_SCHEMA ||
      report.transition !== ENVIRONMENT_APPLICATION_TRANSITION ||
      report.semanticDelta !== ENVIRONMENT_APPLICATION_TRANSITION_DELTA ||
      report.sourceOperationsCommit !==
        ROLLBACK_APPLICATION_TRANSITION_SOURCE_OPERATIONS_COMMIT ||
      report.operationsCommit !== ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT ||
      report.previousRollbackApplicationSha !== PREVIOUS_ROLLBACK_APPLICATION_SHA ||
      report.rollbackApplicationSha !== ROLLBACK_APPLICATION_SHA ||
      report.forwardApplicationSha !== FORWARD_APPLICATION_SHA ||
      !Array.isArray(report.lineage) ||
      report.lineage[0] !== report.sourceOperationsCommit ||
      report.lineage.at(-1) !== report.operationsCommit ||
      new Set(report.lineage).size !== report.lineage.length ||
      report.lineage.some(value => !/^[0-9a-f]{40}$/u.test(value)) ||
      !/^[0-9a-f]{64}$/u.test(report.sourceReadinessSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(report.transitionedReadinessSha256 || "") ||
      report.protectedEnvironmentSemanticsUnchanged !== true ||
      report.sourcePreserved !== true || report.valuesRecorded !== false) {
    throw new Error("Environment application-transition anchor report is invalid.");
  }
  return report;
}

function validateCurrentEnvironment(dependencies = {}) {
  (dependencies.validateSchema ?? validateProtectedEnvironmentSchema)();
  (dependencies.verifyIsolation ?? verifyCrossUserIsolation)();
}

export function publishEnvironmentReadiness(stateRoot, operationsCommit, dependencies = {}) {
  const operational = dependencies.operational !== false;
  const root = operational ? assertOperationalStateRoot(stateRoot) : resolve(stateRoot);
  const target = join(root, READINESS_NAME);
  validateCurrentEnvironment(dependencies);
  const payload = Buffer.from(`${JSON.stringify(createEnvironmentReadiness(operationsCommit), null, 2)}\n`);
  const publish = dependencies.publish ?? publishNoReplaceSet;
  publish([{ target, payload, mode: 0o600, ...(operational ? { uid: 0, gid: 0 } : {}) }], {
    enforceMetadata: operational,
    fsyncDirectories: operational,
    verifySet() {
      readReadiness(target, operationsCommit, operational);
      validateCurrentEnvironment(dependencies);
    }
  });
  return target;
}

export function verifyEnvironmentReadiness(stateRoot, operationsCommit, dependencies = {}) {
  const operational = dependencies.operational !== false;
  const root = operational ? assertOperationalStateRoot(stateRoot) : resolve(stateRoot);
  const target = join(root, READINESS_NAME);
  readReadiness(target, operationsCommit, operational);
  validateCurrentEnvironment(dependencies);
  return true;
}

export function classifyEnvironmentReadinessDelta(source, candidate) {
  try {
    const validatedSource = validateEnvironmentReadinessRecord(
      source,
      source.operationsCommit
    );
    const validatedCandidate = validateEnvironmentReadinessRecord(
      candidate,
      candidate.operationsCommit
    );
    const expected = {
      ...validatedSource,
      operationsCommit: validatedCandidate.operationsCommit,
      validations: { ...validatedSource.validations }
    };
    return JSON.stringify(validatedCandidate) === JSON.stringify(expected)
      ? IDENTITY_ONLY_READINESS_DELTA
      : "UNEXPECTED_SEMANTIC_DELTA";
  } catch {
    return "UNEXPECTED_SEMANTIC_DELTA";
  }
}

function carryForwardOptions(options) {
  exactOptions(options, [
    "priorOperationsCommit",
    "priorReadinessSha256",
    "immediatePredecessorOperationsCommit",
    "operationsCommit",
    "carryForward"
  ], "environment-readiness carry-forward options");
  validateOperationsCommit(options.priorOperationsCommit);
  validateOperationsCommit(options.immediatePredecessorOperationsCommit);
  validateOperationsCommit(options.operationsCommit);
  if (!/^[0-9a-f]{64}$/u.test(options.priorReadinessSha256 || "")) {
    throw new Error("Exact prior environment-readiness identity is required.");
  }
  if (options.carryForward !== IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD) {
    throw new Error("Unsupported environment-readiness carry-forward identifier.");
  }
  if (options.priorOperationsCommit !== READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT ||
      options.immediatePredecessorOperationsCommit !== READINESS_CARRY_FORWARD_IMMEDIATE_PREDECESSOR ||
      new Set([
        options.priorOperationsCommit,
        options.immediatePredecessorOperationsCommit,
        options.operationsCommit
      ]).size !== 3) {
    throw new Error("Environment-readiness carry-forward lineage is not approved.");
  }
  return options;
}

export function createEnvironmentReadinessCarryForwardArtifacts(
  sourceEvidence,
  options
) {
  carryForwardOptions(options);
  if (sourceEvidence.identity !== options.priorReadinessSha256) {
    throw new Error("Prior environment-readiness identity differs.");
  }
  validateEnvironmentReadinessRecord(
    sourceEvidence.record,
    options.priorOperationsCommit
  );
  const candidate = createEnvironmentReadiness(options.operationsCommit);
  if (classifyEnvironmentReadinessDelta(sourceEvidence.record, candidate) !==
      IDENTITY_ONLY_READINESS_DELTA) {
    throw new Error("Environment-readiness carry-forward has an unexpected semantic delta.");
  }
  const readinessPayload = Buffer.from(
    `${JSON.stringify(candidate, null, 2)}\n`,
    "utf8"
  );
  const readinessIdentity = sha256(readinessPayload);
  const report = {
    schemaVersion: ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA,
    carryForward: options.carryForward,
    semanticDelta: IDENTITY_ONLY_READINESS_DELTA,
    sourceOperationsCommit: options.priorOperationsCommit,
    immediatePredecessorOperationsCommit:
      options.immediatePredecessorOperationsCommit,
    operationsCommit: options.operationsCommit,
    lineage: [
      options.priorOperationsCommit,
      options.immediatePredecessorOperationsCommit,
      options.operationsCommit
    ],
    sourceReadinessSha256: sourceEvidence.identity,
    carriedForwardReadinessSha256: readinessIdentity,
    sourcePreserved: true,
    valuesRecorded: false
  };
  const reportPayload = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8");
  validateEnvironmentReadinessCarryForwardReport(report, report);
  return { candidate, readinessPayload, readinessIdentity, report, reportPayload };
}

export function validateEnvironmentReadinessCarryForwardReport(
  report,
  expected
) {
  exactKeys(report, [
    "schemaVersion",
    "carryForward",
    "semanticDelta",
    "sourceOperationsCommit",
    "immediatePredecessorOperationsCommit",
    "operationsCommit",
    "lineage",
    "sourceReadinessSha256",
    "carriedForwardReadinessSha256",
    "sourcePreserved",
    "valuesRecorded"
  ], "environment-readiness carry-forward report");
  if (report.schemaVersion !== ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA ||
      report.carryForward !== IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD ||
      report.semanticDelta !== IDENTITY_ONLY_READINESS_DELTA ||
      !Array.isArray(report.lineage) || report.lineage.length !== 3 ||
      report.lineage[0] !== report.sourceOperationsCommit ||
      report.lineage[1] !== report.immediatePredecessorOperationsCommit ||
      report.lineage[2] !== report.operationsCommit ||
      !/^[0-9a-f]{64}$/u.test(report.sourceReadinessSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(report.carriedForwardReadinessSha256 || "") ||
      report.sourcePreserved !== true || report.valuesRecorded !== false ||
      (expected && JSON.stringify(report) !== JSON.stringify(expected))) {
    throw new Error("Environment-readiness carry-forward report is invalid.");
  }
  carryForwardOptions({
    priorOperationsCommit: report.sourceOperationsCommit,
    priorReadinessSha256: report.sourceReadinessSha256,
    immediatePredecessorOperationsCommit:
      report.immediatePredecessorOperationsCommit,
    operationsCommit: report.operationsCommit,
    carryForward: report.carryForward
  });
  return report;
}

function chainedCarryForwardOptions(options) {
  exactOptions(options, [
    "sourceOperationsCommit",
    "sourceReadinessSha256",
    "operationsCommit",
    "carryForward"
  ], "chained environment-readiness carry-forward options");
  validateOperationsCommit(options.sourceOperationsCommit);
  validateOperationsCommit(options.operationsCommit);
  if (!/^[0-9a-f]{64}$/u.test(options.sourceReadinessSha256 || "")) {
    throw new Error("Exact chained source environment-readiness identity is required.");
  }
  if (options.carryForward !==
      CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD) {
    throw new Error("Unsupported chained environment-readiness carry-forward identifier.");
  }
  if (options.sourceOperationsCommit === options.operationsCommit) {
    throw new Error("Chained environment-readiness source and target must differ.");
  }
  return options;
}

function validatePriorCarryForwardReport(report, sourceEvidence, lineage) {
  const sourceIndex = lineage.indexOf(sourceEvidence.record.operationsCommit);
  if (sourceIndex < 0) {
    throw new Error("Source readiness authority is not in the trusted lineage.");
  }
  const expectedLineage = lineage.slice(0, sourceIndex + 1);
  if (report.schemaVersion === ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA) {
    validateEnvironmentReadinessCarryForwardReport(report);
  } else {
    validateChainedEnvironmentReadinessCarryForwardReport(report);
  }
  if (JSON.stringify(report.lineage) !== JSON.stringify(expectedLineage) ||
      report.operationsCommit !== sourceEvidence.record.operationsCommit ||
      report.carriedForwardReadinessSha256 !== sourceEvidence.identity) {
    throw new Error("Prior environment-readiness lineage report differs.");
  }
  return report;
}

export function createChainedEnvironmentReadinessCarryForwardArtifacts(
  sourceEvidence,
  priorReportEvidence,
  options,
  trustedLineage
) {
  chainedCarryForwardOptions(options);
  if (!Array.isArray(trustedLineage) || trustedLineage.length < 4 ||
      new Set(trustedLineage).size !== trustedLineage.length ||
      trustedLineage[0] !== READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT ||
      trustedLineage.at(-1) !== options.operationsCommit ||
      !trustedLineage.includes(options.sourceOperationsCommit)) {
    throw new Error("Trusted readiness authority lineage is invalid.");
  }
  for (const commit of trustedLineage) validateOperationsCommit(commit);
  if (sourceEvidence.identity !== options.sourceReadinessSha256) {
    throw new Error("Chained source environment-readiness identity differs.");
  }
  validateEnvironmentReadinessRecord(
    sourceEvidence.record,
    options.sourceOperationsCommit
  );
  const priorReport = validatePriorCarryForwardReport(
    priorReportEvidence.record,
    sourceEvidence,
    trustedLineage
  );
  if (priorReportEvidence.identity !== sha256(priorReportEvidence.bytes)) {
    throw new Error("Prior environment-readiness lineage report identity differs.");
  }
  const candidate = createEnvironmentReadiness(options.operationsCommit);
  if (classifyEnvironmentReadinessDelta(sourceEvidence.record, candidate) !==
      IDENTITY_ONLY_READINESS_DELTA) {
    throw new Error("Chained environment-readiness carry-forward has an unexpected semantic delta.");
  }
  const readinessPayload = Buffer.from(
    `${JSON.stringify(candidate, null, 2)}\n`,
    "utf8"
  );
  const readinessIdentity = sha256(readinessPayload);
  const report = {
    schemaVersion: CHAINED_ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA,
    carryForward: options.carryForward,
    semanticDelta: IDENTITY_ONLY_READINESS_DELTA,
    sourceOperationsCommit: options.sourceOperationsCommit,
    operationsCommit: options.operationsCommit,
    lineage: [...trustedLineage],
    sourceReadinessSha256: sourceEvidence.identity,
    carriedForwardReadinessSha256: readinessIdentity,
    priorCarryForwardReportSha256: priorReportEvidence.identity,
    originalReadinessSha256:
      priorReport.originalReadinessSha256 ?? priorReport.sourceReadinessSha256,
    sourcePreserved: true,
    valuesRecorded: false
  };
  const reportPayload = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8");
  validateChainedEnvironmentReadinessCarryForwardReport(report, report);
  return { candidate, readinessPayload, readinessIdentity, report, reportPayload };
}

export function validateChainedEnvironmentReadinessCarryForwardReport(
  report,
  expected
) {
  exactKeys(report, [
    "schemaVersion",
    "carryForward",
    "semanticDelta",
    "sourceOperationsCommit",
    "operationsCommit",
    "lineage",
    "sourceReadinessSha256",
    "carriedForwardReadinessSha256",
    "priorCarryForwardReportSha256",
    "originalReadinessSha256",
    "sourcePreserved",
    "valuesRecorded"
  ], "chained environment-readiness carry-forward report");
  chainedCarryForwardOptions({
    sourceOperationsCommit: report.sourceOperationsCommit,
    sourceReadinessSha256: report.sourceReadinessSha256,
    operationsCommit: report.operationsCommit,
    carryForward: report.carryForward
  });
  if (!Array.isArray(report.lineage) || report.lineage.length < 4 ||
      new Set(report.lineage).size !== report.lineage.length) {
    throw new Error("Chained environment-readiness carry-forward report is invalid.");
  }
  for (const commit of report.lineage) validateOperationsCommit(commit);
  const sourceIndex = report.lineage.indexOf(report.sourceOperationsCommit);
  if (report.schemaVersion !== CHAINED_ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA ||
      report.semanticDelta !== IDENTITY_ONLY_READINESS_DELTA ||
      report.lineage[0] !== READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT ||
      report.lineage.at(-1) !== report.operationsCommit ||
      sourceIndex < 2 || sourceIndex >= report.lineage.length - 1 ||
      !/^[0-9a-f]{64}$/u.test(report.carriedForwardReadinessSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(report.priorCarryForwardReportSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(report.originalReadinessSha256 || "") ||
      report.sourcePreserved !== true || report.valuesRecorded !== false ||
      (expected && JSON.stringify(report) !== JSON.stringify(expected))) {
    throw new Error("Chained environment-readiness carry-forward report is invalid.");
  }
  return report;
}

function transitionDerivedChainedCarryForwardOptions(options) {
  exactOptions(options, [
    "sourceOperationsCommit",
    "sourceReadinessSha256",
    "operationsCommit",
    "carryForward"
  ], "transition-derived chained environment-readiness carry-forward options");
  validateOperationsCommit(options.sourceOperationsCommit);
  validateOperationsCommit(options.operationsCommit);
  if (!/^[0-9a-f]{64}$/u.test(options.sourceReadinessSha256 || "")) {
    throw new Error(
      "Exact transition-derived source environment-readiness identity is required."
    );
  }
  if (options.carryForward !==
      TRANSITION_DERIVED_CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD) {
    throw new Error(
      "Unsupported transition-derived chained environment-readiness carry-forward identifier."
    );
  }
  if (options.sourceOperationsCommit === options.operationsCommit) {
    throw new Error(
      "Transition-derived environment-readiness source and target must differ."
    );
  }
  return options;
}

export function validateTransitionDerivedEnvironmentReadinessCarryForwardReport(
  report,
  expected
) {
  exactKeys(report, [
    "schemaVersion", "carryForward", "semanticDelta",
    "sourceOperationsCommit", "operationsCommit", "lineage",
    "sourceReadinessSha256", "carriedForwardReadinessSha256",
    "sourceLineageReportSha256", "applicationTransitionReportSha256",
    "applicationTransitionSourceReadinessSha256",
    "applicationTransitionReadinessSha256",
    "protectedEnvironmentSemanticsUnchanged", "sourcePreserved",
    "valuesRecorded"
  ], "transition-derived chained environment-readiness carry-forward report");
  transitionDerivedChainedCarryForwardOptions({
    sourceOperationsCommit: report.sourceOperationsCommit,
    sourceReadinessSha256: report.sourceReadinessSha256,
    operationsCommit: report.operationsCommit,
    carryForward: report.carryForward
  });
  if (report.schemaVersion !==
        TRANSITION_DERIVED_CHAINED_ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA ||
      report.semanticDelta !== IDENTITY_ONLY_READINESS_DELTA ||
      !Array.isArray(report.lineage) || report.lineage.length < 4 ||
      new Set(report.lineage).size !== report.lineage.length ||
      report.lineage[0] !== ROLLBACK_APPLICATION_TRANSITION_SOURCE_OPERATIONS_COMMIT ||
      report.lineage.at(-1) !== report.operationsCommit ||
      !report.lineage.includes(ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT) ||
      !report.lineage.includes(report.sourceOperationsCommit) ||
      report.lineage.indexOf(report.sourceOperationsCommit) >=
        report.lineage.length - 1 ||
      report.lineage.some(value => !/^[0-9a-f]{40}$/u.test(value)) ||
      !/^[0-9a-f]{64}$/u.test(report.carriedForwardReadinessSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(report.sourceLineageReportSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(report.applicationTransitionReportSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(
        report.applicationTransitionSourceReadinessSha256 || ""
      ) ||
      !/^[0-9a-f]{64}$/u.test(report.applicationTransitionReadinessSha256 || "") ||
      report.protectedEnvironmentSemanticsUnchanged !== true ||
      report.sourcePreserved !== true || report.valuesRecorded !== false ||
      (expected && JSON.stringify(report) !== JSON.stringify(expected))) {
    throw new Error(
      "Transition-derived chained environment-readiness carry-forward report is invalid."
    );
  }
  return report;
}

export function createTransitionDerivedEnvironmentReadinessCarryForwardArtifacts(
  sourceEvidence,
  priorLineageReportEvidence,
  applicationTransitionReportEvidence,
  applicationTransitionSourceReadinessEvidence,
  applicationTransitionReadinessEvidence,
  options,
  trustedLineage
) {
  transitionDerivedChainedCarryForwardOptions(options);
  if (!Array.isArray(trustedLineage) || trustedLineage.length < 5 ||
      new Set(trustedLineage).size !== trustedLineage.length ||
      trustedLineage[0] !== READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT ||
      trustedLineage.at(-1) !== options.operationsCommit ||
      !trustedLineage.includes(ROLLBACK_APPLICATION_TRANSITION_SOURCE_OPERATIONS_COMMIT) ||
      !trustedLineage.includes(ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT) ||
      !trustedLineage.includes(options.sourceOperationsCommit)) {
    throw new Error("Trusted transition-derived readiness authority lineage is invalid.");
  }
  for (const commit of trustedLineage) validateOperationsCommit(commit);
  if (sourceEvidence.identity !== options.sourceReadinessSha256) {
    throw new Error("Transition-derived source environment-readiness identity differs.");
  }
  validateEnvironmentReadinessRecord(
    sourceEvidence.record,
    options.sourceOperationsCommit
  );
  const applicationTransitionReport =
    validateEnvironmentApplicationTransitionReportAnchor(
      applicationTransitionReportEvidence.record
    );
  if (applicationTransitionReportEvidence.identity !==
      sha256(applicationTransitionReportEvidence.bytes)) {
    throw new Error("Environment application-transition report identity differs.");
  }
  validateApplicationTransitionSourceReadiness(
    applicationTransitionSourceReadinessEvidence.record
  );
  if (applicationTransitionSourceReadinessEvidence.identity !==
        sha256(applicationTransitionSourceReadinessEvidence.bytes) ||
      applicationTransitionSourceReadinessEvidence.identity !==
        applicationTransitionReport.sourceReadinessSha256) {
    throw new Error("Environment application-transition source readiness differs.");
  }
  validateEnvironmentReadinessRecord(
    applicationTransitionReadinessEvidence.record,
    ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT
  );
  if (applicationTransitionReadinessEvidence.identity !==
        sha256(applicationTransitionReadinessEvidence.bytes) ||
      applicationTransitionReadinessEvidence.identity !==
        applicationTransitionReport.transitionedReadinessSha256) {
    throw new Error("Environment application-transition readiness anchor differs.");
  }
  const transitionIndex = trustedLineage.indexOf(
    ROLLBACK_APPLICATION_TRANSITION_SOURCE_OPERATIONS_COMMIT
  );
  const sourceIndex = trustedLineage.indexOf(options.sourceOperationsCommit);
  const expectedSourceLineage = trustedLineage.slice(transitionIndex, sourceIndex + 1);
  if (JSON.stringify(applicationTransitionReport.lineage) !== JSON.stringify(
    trustedLineage.slice(
      transitionIndex,
      trustedLineage.indexOf(ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT) + 1
    )
  )) {
    throw new Error("Environment application-transition protected lineage differs.");
  }
  if (options.sourceOperationsCommit ===
      ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT) {
    if (priorLineageReportEvidence.identity !==
        applicationTransitionReportEvidence.identity ||
        !priorLineageReportEvidence.bytes.equals(
          applicationTransitionReportEvidence.bytes
        ) ||
        sourceEvidence.identity !== applicationTransitionReadinessEvidence.identity) {
      throw new Error("Initial transition-derived readiness source differs.");
    }
  } else {
    const prior = validateTransitionDerivedEnvironmentReadinessCarryForwardReport(
      priorLineageReportEvidence.record
    );
    if (priorLineageReportEvidence.identity !==
          sha256(priorLineageReportEvidence.bytes) ||
        prior.operationsCommit !== options.sourceOperationsCommit ||
        prior.carriedForwardReadinessSha256 !== sourceEvidence.identity ||
        prior.applicationTransitionReportSha256 !==
          applicationTransitionReportEvidence.identity ||
        prior.applicationTransitionSourceReadinessSha256 !==
          applicationTransitionSourceReadinessEvidence.identity ||
        prior.applicationTransitionReadinessSha256 !==
          applicationTransitionReadinessEvidence.identity ||
        JSON.stringify(prior.lineage) !== JSON.stringify(expectedSourceLineage)) {
      throw new Error("Prior transition-derived readiness lineage report differs.");
    }
  }
  const candidate = createEnvironmentReadiness(options.operationsCommit);
  if (classifyEnvironmentReadinessDelta(sourceEvidence.record, candidate) !==
      IDENTITY_ONLY_READINESS_DELTA) {
    throw new Error(
      "Transition-derived environment-readiness carry-forward has an unexpected semantic delta."
    );
  }
  const readinessPayload = Buffer.from(
    `${JSON.stringify(candidate, null, 2)}\n`,
    "utf8"
  );
  if (readinessPayload.length !== sourceEvidence.bytes.length) {
    throw new Error(
      "Transition-derived environment-readiness exchange size differs."
    );
  }
  const readinessIdentity = sha256(readinessPayload);
  const report = {
    schemaVersion:
      TRANSITION_DERIVED_CHAINED_ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA,
    carryForward: options.carryForward,
    semanticDelta: IDENTITY_ONLY_READINESS_DELTA,
    sourceOperationsCommit: options.sourceOperationsCommit,
    operationsCommit: options.operationsCommit,
    lineage: trustedLineage.slice(transitionIndex),
    sourceReadinessSha256: sourceEvidence.identity,
    carriedForwardReadinessSha256: readinessIdentity,
    sourceLineageReportSha256: priorLineageReportEvidence.identity,
    applicationTransitionReportSha256: applicationTransitionReportEvidence.identity,
    applicationTransitionSourceReadinessSha256:
      applicationTransitionSourceReadinessEvidence.identity,
    applicationTransitionReadinessSha256:
      applicationTransitionReadinessEvidence.identity,
    protectedEnvironmentSemanticsUnchanged: true,
    sourcePreserved: true,
    valuesRecorded: false
  };
  const reportPayload = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8");
  validateTransitionDerivedEnvironmentReadinessCarryForwardReport(report, report);
  return { candidate, readinessPayload, readinessIdentity, report, reportPayload };
}

function readProtectedPackIdentityUnbound(target) {
  assertProtectedRegularFile(target, "Operations-pack identity");
  const bytes = readFileSync(target);
  let identity;
  try {
    identity = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Operations-pack identity is not valid JSON.");
  }
  validateOperationsCommit(identity?.operationsCommit);
  return { bytes, identity, sha256: sha256(bytes) };
}

function readProtectedPackIdentity(target, expectedOperationsCommit) {
  const evidence = readProtectedPackIdentityUnbound(target);
  if (evidence.identity.operationsCommit !== expectedOperationsCommit) {
    throw new Error("Operations-pack identity lineage differs.");
  }
  return evidence;
}

function authorityHistoryIdentityPath(operationsCommit) {
  return join(
    IDENTITY_HISTORY_ROOT,
    operationsCommit,
    "approved-phase-f1-pack.json"
  );
}

function authorityExchangeSlotPath(operationsCommit) {
  validateOperationsCommit(operationsCommit);
  return `${AUTHORITY_EXCHANGE_SLOT_PREFIX}${operationsCommit}.json`;
}

export function verifyProtectedAuthorityLineage(lineage, dependencies = {}) {
  if (!Array.isArray(lineage) || lineage.length < 2 ||
      new Set(lineage).size !== lineage.length) {
    throw new Error("Trusted readiness authority lineage is ambiguous.");
  }
  for (const commit of lineage) validateOperationsCommit(commit);
  const readIdentity = dependencies.readIdentity ?? readProtectedPackIdentity;
  const verifyPack = dependencies.verifyPack ?? ((commit, identityPath) => {
    const verifier =
      `/opt/thebusinesscircle/deployment-packs/${commit}/verify-pack-integrity.mjs`;
    const result = spawnSync("/usr/bin/node", [verifier, identityPath], {
      env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" },
      stdio: "ignore"
    });
    if (result.error || result.signal || result.status !== 0) {
      throw new Error("Trusted readiness lineage pack integrity failed.");
    }
  });
  const evidence = new Map();
  for (const [index, commit] of lineage.entries()) {
    const identityPath = index === lineage.length - 1
      ? AUTHORITY_IDENTITY_PATH
      : authorityHistoryIdentityPath(commit);
    const record = readIdentity(identityPath, commit);
    verifyPack(commit, identityPath);
    evidence.set(commit, record);
  }
  for (let index = 1; index < lineage.length; index += 1) {
    const predecessor = lineage[index - 1];
    const successor = lineage[index];
    const slotPath = authorityExchangeSlotPath(successor);
    const slot = readIdentity(slotPath, predecessor);
    if (slot.sha256 !== evidence.get(predecessor).sha256 ||
        !slot.bytes.equals(evidence.get(predecessor).bytes)) {
      throw new Error("Trusted readiness authority exchange lineage differs.");
    }
  }
  return true;
}

export function resolveProtectedAuthorityLineage(
  operationsCommit,
  dependencies = {}
) {
  validateOperationsCommit(operationsCommit);
  const anchor = dependencies.anchorOperationsCommit ??
    READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT;
  validateOperationsCommit(anchor);
  const readIdentity = dependencies.readIdentity ??
    readProtectedPackIdentityUnbound;
  const verifyPack = dependencies.verifyPack ?? ((commit, identityPath) => {
    const verifier =
      `/opt/thebusinesscircle/deployment-packs/${commit}/verify-pack-integrity.mjs`;
    const result = spawnSync("/usr/bin/node", [verifier, identityPath], {
      env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" },
      stdio: "ignore"
    });
    if (result.error || result.signal || result.status !== 0) {
      throw new Error("Trusted readiness lineage pack integrity failed.");
    }
  });
  const current = readIdentity(AUTHORITY_IDENTITY_PATH);
  if (current.identity.operationsCommit !== operationsCommit) {
    throw new Error("Trusted readiness target is not the current authority.");
  }
  verifyPack(operationsCommit, AUTHORITY_IDENTITY_PATH);
  const reversed = [operationsCommit];
  const seen = new Set(reversed);
  let successor = operationsCommit;
  while (successor !== anchor) {
    if (reversed.length >= MAX_AUTHORITY_LINEAGE_LENGTH) {
      throw new Error("Trusted readiness authority lineage is ambiguous.");
    }
    const slotPath = authorityExchangeSlotPath(successor);
    const slot = readIdentity(slotPath);
    const predecessor = slot.identity.operationsCommit;
    validateOperationsCommit(predecessor);
    if (seen.has(predecessor)) {
      throw new Error("Trusted readiness authority lineage is ambiguous.");
    }
    const historyPath = authorityHistoryIdentityPath(predecessor);
    const history = readIdentity(historyPath);
    if (history.identity.operationsCommit !== predecessor ||
        slot.sha256 !== history.sha256 || !slot.bytes.equals(history.bytes)) {
      throw new Error("Trusted readiness authority exchange lineage differs.");
    }
    verifyPack(predecessor, historyPath);
    reversed.push(predecessor);
    seen.add(predecessor);
    successor = predecessor;
  }
  return reversed.reverse();
}

function readCarryForwardReportEvidence(target, operational) {
  if (operational) {
    assertProtectedRegularFile(
      target,
      "Prior environment-readiness carry-forward report"
    );
  }
  const bytes = readFileSync(target);
  let record;
  try {
    record = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Prior environment-readiness carry-forward report is not valid JSON.");
  }
  return { bytes, record, identity: sha256(bytes) };
}

function assertCarryForwardProductionContext(options) {
  const expectedUtility =
    `/opt/thebusinesscircle/deployment-packs/${options.operationsCommit}/` +
    "environment-readiness.mjs";
  if (fileURLToPath(import.meta.url) !== expectedUtility ||
      realpathSync(expectedUtility) !== expectedUtility) {
    throw new Error("Readiness carry-forward must run from the authoritative installed pack.");
  }
  const identities = [
    [options.operationsCommit, AUTHORITY_IDENTITY_PATH],
    ...[
      options.priorOperationsCommit,
      options.immediatePredecessorOperationsCommit
    ].map((commit) => [
      commit,
      join(
        IDENTITY_HISTORY_ROOT,
        commit,
        "approved-phase-f1-pack.json"
      )
    ])
  ];
  for (const [commit, identityPath] of identities) {
    readProtectedPackIdentity(identityPath, commit);
    const verifier =
      `/opt/thebusinesscircle/deployment-packs/${commit}/verify-pack-integrity.mjs`;
    const result = spawnSync("/usr/bin/node", [verifier, identityPath], {
      env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" },
      stdio: "ignore"
    });
    if (result.error || result.signal || result.status !== 0) {
      throw new Error("Trusted readiness lineage pack integrity failed.");
    }
  }
}

function assertChainedCarryForwardProductionContext(options) {
  const expectedUtility =
    `/opt/thebusinesscircle/deployment-packs/${options.operationsCommit}/` +
    "environment-readiness.mjs";
  if (fileURLToPath(import.meta.url) !== expectedUtility ||
      realpathSync(expectedUtility) !== expectedUtility) {
    throw new Error("Chained readiness carry-forward must run from the authoritative installed pack.");
  }
  return resolveProtectedAuthorityLineage(options.operationsCommit);
}

function exchangeEnvironmentReadiness(paths, identities, operationsCommit) {
  const helper =
    `/opt/thebusinesscircle/deployment-packs/${operationsCommit}/` +
    "atomic-identity-exchange.py";
  const result = spawnSync("/usr/bin/python3", [
    helper,
    "readiness-exchange",
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
    throw new Error("Atomic environment-readiness exchange failed.");
  }
}

export function publishCarriedForwardEnvironmentReadiness(options, dependencies = {}) {
  carryForwardOptions(options);
  const operational = dependencies.operational !== false;
  const root = operational
    ? assertOperationalStateRoot(dependencies.stateRoot)
    : resolve(dependencies.stateRoot);
  const paths = {
    stateRoot: root,
    authority: readinessPath(root),
    preserved: preservedEnvironmentReadinessPath(
      root,
      options.priorOperationsCommit
    ),
    slot: environmentReadinessExchangeSlotPath(root, options.operationsCommit),
    report: environmentReadinessCarryForwardReportPath(
      root,
      options.operationsCommit
    )
  };
  (dependencies.assertProductionContext ?? assertCarryForwardProductionContext)(options);
  for (const target of [paths.preserved, paths.slot, paths.report]) {
    if ((dependencies.exists ?? existsSync)(target)) {
      throw new Error("Environment-readiness carry-forward target already exists.");
    }
  }
  const readEvidence = dependencies.readEvidence ?? readReadinessEvidence;
  const source = readEvidence(
    paths.authority,
    options.priorOperationsCommit,
    operational
  );
  const artifacts = createEnvironmentReadinessCarryForwardArtifacts(source, options);
  validateCurrentEnvironment(dependencies);
  const publish = dependencies.publish ?? publishNoReplaceSet;
  publish([
    {
      target: paths.preserved,
      payload: source.bytes,
      mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {})
    },
    {
      target: paths.slot,
      payload: artifacts.readinessPayload,
      mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {})
    },
    {
      target: paths.report,
      payload: artifacts.reportPayload,
      mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {})
    }
  ], {
    enforceMetadata: operational,
    fsyncDirectories: operational,
    verifySet() {
      const unchanged = readEvidence(
        paths.authority,
        options.priorOperationsCommit,
        operational
      );
      if (unchanged.identity !== source.identity) {
        throw new Error("Source environment-readiness evidence changed.");
      }
      const preserved = readEvidence(
        paths.preserved,
        options.priorOperationsCommit,
        operational
      );
      const candidate = readEvidence(
        paths.slot,
        options.operationsCommit,
        operational
      );
      if (preserved.identity !== source.identity ||
          candidate.identity !== artifacts.readinessIdentity ||
          classifyEnvironmentReadinessDelta(source.record, candidate.record) !==
            IDENTITY_ONLY_READINESS_DELTA) {
        throw new Error("Environment-readiness carry-forward publication differs.");
      }
      let report;
      try {
        report = JSON.parse(readFileSync(paths.report, "utf8"));
      } catch {
        throw new Error("Environment-readiness carry-forward report is not valid JSON.");
      }
      validateEnvironmentReadinessCarryForwardReport(
        report,
        artifacts.report
      );
      validateCurrentEnvironment(dependencies);
      (dependencies.exchange ?? exchangeEnvironmentReadiness)(paths, {
        source: source.identity,
        candidate: artifacts.readinessIdentity,
        size: source.bytes.length
      }, options.operationsCommit);
      const current = readEvidence(
        paths.authority,
        options.operationsCommit,
        operational
      );
      const oldSlot = readEvidence(
        paths.slot,
        options.priorOperationsCommit,
        operational
      );
      if (current.identity !== artifacts.readinessIdentity ||
          oldSlot.identity !== source.identity) {
        throw new Error("Carried-forward environment-readiness verification failed.");
      }
      validateCurrentEnvironment(dependencies);
    }
  });
  return {
    ...paths,
    sourceReadinessIdentity: source.identity,
    carriedForwardReadinessIdentity: artifacts.readinessIdentity,
    semanticDelta: IDENTITY_ONLY_READINESS_DELTA
  };
}

export function publishChainedCarriedForwardEnvironmentReadiness(
  options,
  dependencies = {}
) {
  exactOptions(options, [
    "sourceReadinessSha256",
    "operationsCommit",
    "carryForward"
  ], "chained environment-readiness carry-forward invocation");
  validateOperationsCommit(options.operationsCommit);
  if (!/^[0-9a-f]{64}$/u.test(options.sourceReadinessSha256 || "") ||
      options.carryForward !==
        CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD) {
    throw new Error("Chained environment-readiness carry-forward invocation is invalid.");
  }
  const operational = dependencies.operational !== false;
  const root = operational
    ? assertOperationalStateRoot(dependencies.stateRoot)
    : resolve(dependencies.stateRoot);
  const readEvidence = dependencies.readEvidence ?? readReadinessEvidence;
  const readSourceEvidence = dependencies.readSourceEvidence ??
    readReadinessEvidenceUnbound;
  const source = readSourceEvidence(readinessPath(root), operational);
  if (source.identity !== options.sourceReadinessSha256) {
    throw new Error("Chained source environment-readiness identity differs.");
  }
  const resolvedOptions = {
    sourceOperationsCommit: source.record.operationsCommit,
    sourceReadinessSha256: options.sourceReadinessSha256,
    operationsCommit: options.operationsCommit,
    carryForward: options.carryForward
  };
  chainedCarryForwardOptions(resolvedOptions);
  const lineage = (dependencies.assertProductionContext ??
    assertChainedCarryForwardProductionContext)(resolvedOptions);
  if (!Array.isArray(lineage) ||
      lineage.at(-1) !== options.operationsCommit ||
      !lineage.includes(source.record.operationsCommit)) {
    throw new Error("Source readiness authority is not in the trusted lineage.");
  }
  const paths = {
    stateRoot: root,
    authority: readinessPath(root),
    preserved: preservedEnvironmentReadinessPath(
      root,
      resolvedOptions.sourceOperationsCommit
    ),
    slot: environmentReadinessExchangeSlotPath(root, options.operationsCommit),
    report: environmentReadinessCarryForwardReportPath(
      root,
      options.operationsCommit
    ),
    priorReport: environmentReadinessCarryForwardReportPath(
      root,
      resolvedOptions.sourceOperationsCommit
    ),
    originalReadiness: preservedEnvironmentReadinessPath(
      root,
      READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT
    )
  };
  for (const target of [paths.preserved, paths.slot, paths.report]) {
    if ((dependencies.exists ?? existsSync)(target)) {
      throw new Error("Chained environment-readiness carry-forward target already exists.");
    }
  }
  const readReport = dependencies.readReportEvidence ??
    readCarryForwardReportEvidence;
  const priorReport = readReport(paths.priorReport, operational);
  const originalReadiness = readEvidence(
    paths.originalReadiness,
    READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT,
    operational
  );
  if (originalReadiness.identity !==
      (priorReport.record.originalReadinessSha256 ??
        priorReport.record.sourceReadinessSha256)) {
    throw new Error("Original environment-readiness lineage evidence differs.");
  }
  const artifacts = createChainedEnvironmentReadinessCarryForwardArtifacts(
    source,
    priorReport,
    resolvedOptions,
    lineage
  );
  validateCurrentEnvironment(dependencies);
  const publish = dependencies.publish ?? publishNoReplaceSet;
  publish([
    {
      target: paths.preserved,
      payload: source.bytes,
      mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {})
    },
    {
      target: paths.slot,
      payload: artifacts.readinessPayload,
      mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {})
    },
    {
      target: paths.report,
      payload: artifacts.reportPayload,
      mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {})
    }
  ], {
    enforceMetadata: operational,
    fsyncDirectories: operational,
    verifySet() {
      const unchanged = readEvidence(
        paths.authority,
        resolvedOptions.sourceOperationsCommit,
        operational
      );
      const unchangedPriorReport = readReport(paths.priorReport, operational);
      const unchangedOriginalReadiness = readEvidence(
        paths.originalReadiness,
        READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT,
        operational
      );
      if (unchanged.identity !== source.identity ||
          unchangedPriorReport.identity !== priorReport.identity ||
          unchangedOriginalReadiness.identity !== originalReadiness.identity) {
        throw new Error("Chained source environment-readiness evidence changed.");
      }
      const preserved = readEvidence(
        paths.preserved,
        resolvedOptions.sourceOperationsCommit,
        operational
      );
      const candidate = readEvidence(
        paths.slot,
        options.operationsCommit,
        operational
      );
      if (preserved.identity !== source.identity ||
          candidate.identity !== artifacts.readinessIdentity ||
          classifyEnvironmentReadinessDelta(source.record, candidate.record) !==
            IDENTITY_ONLY_READINESS_DELTA) {
        throw new Error("Chained environment-readiness carry-forward publication differs.");
      }
      let report;
      try {
        report = JSON.parse(readFileSync(paths.report, "utf8"));
      } catch {
        throw new Error("Chained environment-readiness carry-forward report is not valid JSON.");
      }
      validateChainedEnvironmentReadinessCarryForwardReport(
        report,
        artifacts.report
      );
      validateCurrentEnvironment(dependencies);
      (dependencies.exchange ?? exchangeEnvironmentReadiness)(paths, {
        source: source.identity,
        candidate: artifacts.readinessIdentity,
        size: source.bytes.length
      }, options.operationsCommit);
      const current = readEvidence(
        paths.authority,
        options.operationsCommit,
        operational
      );
      const oldSlot = readEvidence(
        paths.slot,
        resolvedOptions.sourceOperationsCommit,
        operational
      );
      if (current.identity !== artifacts.readinessIdentity ||
          oldSlot.identity !== source.identity) {
        throw new Error("Chained carried-forward environment-readiness verification failed.");
      }
      validateCurrentEnvironment(dependencies);
    }
  });
  return {
    ...paths,
    sourceReadinessIdentity: source.identity,
    carriedForwardReadinessIdentity: artifacts.readinessIdentity,
    semanticDelta: IDENTITY_ONLY_READINESS_DELTA,
    lineage: artifacts.report.lineage
  };
}

export function publishTransitionDerivedCarriedForwardEnvironmentReadiness(
  options,
  dependencies = {}
) {
  exactOptions(options, [
    "sourceReadinessSha256",
    "operationsCommit",
    "carryForward"
  ], "transition-derived chained environment-readiness carry-forward invocation");
  validateOperationsCommit(options.operationsCommit);
  if (!/^[0-9a-f]{64}$/u.test(options.sourceReadinessSha256 || "") ||
      options.carryForward !==
        TRANSITION_DERIVED_CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD) {
    throw new Error(
      "Transition-derived chained environment-readiness carry-forward invocation is invalid."
    );
  }
  const operational = dependencies.operational !== false;
  const root = operational
    ? assertOperationalStateRoot(dependencies.stateRoot)
    : resolve(dependencies.stateRoot);
  const readEvidence = dependencies.readEvidence ?? readReadinessEvidence;
  const readSourceEvidence = dependencies.readSourceEvidence ??
    readReadinessEvidenceUnbound;
  const readReport = dependencies.readReportEvidence ??
    readCarryForwardReportEvidence;
  const readTransitionSource = dependencies.readTransitionSourceEvidence ??
    readApplicationTransitionSourceReadinessEvidence;
  const source = readSourceEvidence(readinessPath(root), operational);
  if (source.identity !== options.sourceReadinessSha256) {
    throw new Error("Transition-derived source environment-readiness identity differs.");
  }
  const resolvedOptions = {
    sourceOperationsCommit: source.record.operationsCommit,
    sourceReadinessSha256: options.sourceReadinessSha256,
    operationsCommit: options.operationsCommit,
    carryForward: options.carryForward
  };
  transitionDerivedChainedCarryForwardOptions(resolvedOptions);
  const lineage = (dependencies.assertProductionContext ??
    assertChainedCarryForwardProductionContext)(resolvedOptions);
  if (!Array.isArray(lineage) || lineage.at(-1) !== options.operationsCommit ||
      !lineage.includes(source.record.operationsCommit) ||
      !lineage.includes(ROLLBACK_APPLICATION_TRANSITION_SOURCE_OPERATIONS_COMMIT) ||
      !lineage.includes(ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT)) {
    throw new Error(
      "Transition-derived source readiness authority is not in the trusted lineage."
    );
  }
  const priorReportPath = source.record.operationsCommit ===
      ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT
    ? environmentApplicationTransitionReportPath(root)
    : transitionDerivedEnvironmentReadinessCarryForwardReportPath(
      root,
      source.record.operationsCommit
    );
  const paths = {
    stateRoot: root,
    authority: readinessPath(root),
    preserved: preservedEnvironmentReadinessPath(
      root,
      source.record.operationsCommit
    ),
    slot: environmentReadinessExchangeSlotPath(root, options.operationsCommit),
    report: transitionDerivedEnvironmentReadinessCarryForwardReportPath(
      root,
      options.operationsCommit
    ),
    priorReport: priorReportPath,
    applicationTransitionReport: environmentApplicationTransitionReportPath(root),
    applicationTransitionSourceReadiness: preservedEnvironmentReadinessPath(
      root,
      ROLLBACK_APPLICATION_TRANSITION_SOURCE_OPERATIONS_COMMIT
    ),
    applicationTransitionReadiness: source.record.operationsCommit ===
        ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT
      ? readinessPath(root)
      : preservedEnvironmentReadinessPath(
        root,
        ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT
      )
  };
  for (const target of [paths.preserved, paths.slot, paths.report]) {
    if ((dependencies.exists ?? existsSync)(target)) {
      throw new Error(
        "Transition-derived environment-readiness carry-forward target already exists."
      );
    }
  }
  const priorReport = readReport(paths.priorReport, operational);
  const applicationTransitionReport = paths.priorReport ===
      paths.applicationTransitionReport
    ? priorReport
    : readReport(paths.applicationTransitionReport, operational);
  const applicationTransitionSourceReadiness = readTransitionSource(
    paths.applicationTransitionSourceReadiness,
    operational
  );
  const applicationTransitionReadiness =
    paths.applicationTransitionReadiness === paths.authority
      ? source
      : readEvidence(
        paths.applicationTransitionReadiness,
        ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT,
        operational
      );
  const artifacts =
    createTransitionDerivedEnvironmentReadinessCarryForwardArtifacts(
      source,
      priorReport,
      applicationTransitionReport,
      applicationTransitionSourceReadiness,
      applicationTransitionReadiness,
      resolvedOptions,
      lineage
    );
  validateCurrentEnvironment(dependencies);
  const publish = dependencies.publish ?? publishNoReplaceSet;
  publish([
    {
      target: paths.preserved,
      payload: source.bytes,
      mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {})
    },
    {
      target: paths.slot,
      payload: artifacts.readinessPayload,
      mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {})
    },
    {
      target: paths.report,
      payload: artifacts.reportPayload,
      mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {})
    }
  ], {
    enforceMetadata: operational,
    fsyncDirectories: operational,
    verifySet() {
      const unchanged = readEvidence(
        paths.authority,
        source.record.operationsCommit,
        operational
      );
      const unchangedPriorReport = readReport(paths.priorReport, operational);
      const unchangedApplicationTransitionReport = paths.priorReport ===
          paths.applicationTransitionReport
        ? unchangedPriorReport
        : readReport(paths.applicationTransitionReport, operational);
      const unchangedApplicationTransitionSourceReadiness = readTransitionSource(
        paths.applicationTransitionSourceReadiness,
        operational
      );
      const unchangedApplicationTransitionReadiness =
        source.record.operationsCommit ===
          ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT
          ? unchanged
          : readEvidence(
            paths.applicationTransitionReadiness,
            ROLLBACK_APPLICATION_TRANSITION_OPERATIONS_COMMIT,
            operational
          );
      if (unchanged.identity !== source.identity ||
          unchangedPriorReport.identity !== priorReport.identity ||
          unchangedApplicationTransitionReport.identity !==
            applicationTransitionReport.identity ||
          unchangedApplicationTransitionSourceReadiness.identity !==
            applicationTransitionSourceReadiness.identity ||
          unchangedApplicationTransitionReadiness.identity !==
            applicationTransitionReadiness.identity) {
        throw new Error(
          "Transition-derived environment-readiness source evidence changed."
        );
      }
      const preserved = readEvidence(
        paths.preserved,
        source.record.operationsCommit,
        operational
      );
      const candidate = readEvidence(
        paths.slot,
        options.operationsCommit,
        operational
      );
      if (preserved.identity !== source.identity ||
          candidate.identity !== artifacts.readinessIdentity ||
          classifyEnvironmentReadinessDelta(source.record, candidate.record) !==
            IDENTITY_ONLY_READINESS_DELTA) {
        throw new Error(
          "Transition-derived environment-readiness publication differs."
        );
      }
      validateTransitionDerivedEnvironmentReadinessCarryForwardReport(
        JSON.parse(readFileSync(paths.report, "utf8")),
        artifacts.report
      );
      validateCurrentEnvironment(dependencies);
      (dependencies.exchange ?? exchangeEnvironmentReadiness)(paths, {
        source: source.identity,
        candidate: artifacts.readinessIdentity,
        size: source.bytes.length
      }, options.operationsCommit);
      const current = readEvidence(
        paths.authority,
        options.operationsCommit,
        operational
      );
      const oldSlot = readEvidence(
        paths.slot,
        source.record.operationsCommit,
        operational
      );
      if (current.identity !== artifacts.readinessIdentity ||
          oldSlot.identity !== source.identity ||
          readEvidence(
            paths.preserved,
            source.record.operationsCommit,
            operational
          ).identity !== source.identity) {
        throw new Error(
          "Transition-derived carried-forward environment-readiness verification failed."
        );
      }
      validateCurrentEnvironment(dependencies);
    }
  });
  return {
    ...paths,
    sourceReadinessIdentity: source.identity,
    carriedForwardReadinessIdentity: artifacts.readinessIdentity,
    semanticDelta: IDENTITY_ONLY_READINESS_DELTA,
    lineage: artifacts.report.lineage
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.getuid?.() !== 0) throw new Error("Environment readiness requires Linux root.");
  const [mode, ...arguments_] = process.argv.slice(2);
  if (mode === "carry-forward") {
    const [stateRoot, priorOperationsCommit, priorReadinessSha256,
      immediatePredecessorOperationsCommit, operationsCommit, carryForward,
      ...extras] = arguments_;
    if (extras.length || !stateRoot || !priorOperationsCommit ||
        !priorReadinessSha256 || !immediatePredecessorOperationsCommit ||
        !operationsCommit || !carryForward) {
      throw new Error("Usage: environment-readiness.mjs carry-forward <state-root> <prior-operations-commit> <prior-readiness-sha256> <immediate-predecessor-operations-commit> <operations-commit> <carry-forward>");
    }
    const result = publishCarriedForwardEnvironmentReadiness({
      priorOperationsCommit,
      priorReadinessSha256,
      immediatePredecessorOperationsCommit,
      operationsCommit,
      carryForward
    }, { stateRoot });
    process.stdout.write(
      `Environment readiness identity-only carried forward source=${result.sourceReadinessIdentity} current=${result.carriedForwardReadinessIdentity} values-recorded=false\n`
    );
  } else if (mode === "carry-forward-transition-derived-chained") {
    const [stateRoot, sourceReadinessSha256, operationsCommit,
      carryForward, ...extras] = arguments_;
    if (extras.length || !stateRoot ||
        !sourceReadinessSha256 || !operationsCommit || !carryForward) {
      throw new Error("Usage: environment-readiness.mjs carry-forward-transition-derived-chained <state-root> <source-readiness-sha256> <operations-commit> <carry-forward>");
    }
    const result =
      publishTransitionDerivedCarriedForwardEnvironmentReadiness({
        sourceReadinessSha256,
        operationsCommit,
        carryForward
      }, { stateRoot });
    process.stdout.write(
      `Environment readiness transition-derived chained identity-only carried forward source=${result.sourceReadinessIdentity} current=${result.carriedForwardReadinessIdentity} values-recorded=false\n`
    );
  } else if (mode === "carry-forward-chained") {
    const [stateRoot, sourceReadinessSha256, operationsCommit,
      carryForward, ...extras] = arguments_;
    if (extras.length || !stateRoot ||
        !sourceReadinessSha256 || !operationsCommit || !carryForward) {
      throw new Error("Usage: environment-readiness.mjs carry-forward-chained <state-root> <source-readiness-sha256> <operations-commit> <carry-forward>");
    }
    const result = publishChainedCarriedForwardEnvironmentReadiness({
      sourceReadinessSha256,
      operationsCommit,
      carryForward
    }, { stateRoot });
    process.stdout.write(
      `Environment readiness chained identity-only carried forward source=${result.sourceReadinessIdentity} current=${result.carriedForwardReadinessIdentity} values-recorded=false\n`
    );
  } else {
    const [stateRoot, operationsCommit, ...extras] = arguments_;
    if (extras.length || !stateRoot || !operationsCommit ||
        !new Set(["publish", "verify"]).has(mode)) {
      throw new Error("Usage: environment-readiness.mjs <publish|verify> <state-root> <operations-commit>");
    }
    if (mode === "publish") publishEnvironmentReadiness(stateRoot, operationsCommit);
    else verifyEnvironmentReadiness(stateRoot, operationsCommit);
    process.stdout.write(`Environment-only readiness ${mode === "publish" ? "published" : "verified"}.\n`);
  }
}
