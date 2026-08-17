import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FORWARD_APPLICATION_SHA,
  HISTORICAL_PRODUCTION_SHA,
  ROLLBACK_APPLICATION_SHA
} from "./application-identities.mjs";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import { validateProtectedEnvironmentSchema } from "./validate-environment.mjs";

export const ENVIRONMENT_READINESS_SCHEMA = "phase-f1-environment-readiness-v1";
export const ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA =
  "phase-f1-environment-readiness-carry-forward-report-v1";
export const IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD =
  "IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD";
export const IDENTITY_ONLY_READINESS_DELTA = "IDENTITY_ONLY";
export const READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT =
  "2cabfe759e743509315f6c6b81540d2bbf7a0df2";
export const READINESS_CARRY_FORWARD_IMMEDIATE_PREDECESSOR =
  "5b50788fc815fcde726db04f79254df3121ce13a";
const READINESS_NAME = "environment-readiness.json";
const AUTHORITY_IDENTITY_PATH =
  "/var/lib/thebusinesscircle/approved-phase-f1-pack.json";
const IDENTITY_HISTORY_ROOT =
  "/var/lib/thebusinesscircle/phase-f1-identity-history";
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
  validateEnvironmentReadinessRecord(record, operationsCommit);
  return { bytes, record, identity: sha256(bytes) };
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

function readProtectedPackIdentity(target, expectedOperationsCommit) {
  assertProtectedRegularFile(target, "Operations-pack identity");
  let identity;
  try {
    identity = JSON.parse(readFileSync(target, "utf8"));
  } catch {
    throw new Error("Operations-pack identity is not valid JSON.");
  }
  if (identity.operationsCommit !== expectedOperationsCommit) {
    throw new Error("Operations-pack identity lineage differs.");
  }
  return identity;
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
