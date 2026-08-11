import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
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
const READINESS_NAME = "environment-readiness.json";
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

function readReadiness(target, operationsCommit, operational) {
  if (operational) {
    const stats = lstatSync(target);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
        stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o600 ||
        realpathSync(target) !== target) {
      throw new Error("Environment readiness file metadata is unsafe.");
    }
  }
  let record;
  try {
    record = JSON.parse(readFileSync(target, "utf8"));
  } catch {
    throw new Error("Environment readiness is not valid JSON.");
  }
  return validateEnvironmentReadinessRecord(record, operationsCommit);
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

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.getuid?.() !== 0) throw new Error("Environment readiness requires Linux root.");
  const [mode, stateRoot, operationsCommit, ...extras] = process.argv.slice(2);
  if (extras.length || !stateRoot || !operationsCommit || !new Set(["publish", "verify"]).has(mode)) {
    throw new Error("Usage: environment-readiness.mjs <publish|verify> <state-root> <operations-commit>");
  }
  if (mode === "publish") publishEnvironmentReadiness(stateRoot, operationsCommit);
  else verifyEnvironmentReadiness(stateRoot, operationsCommit);
  process.stdout.write(`Environment-only readiness ${mode === "publish" ? "published" : "verified"}.\n`);
}
