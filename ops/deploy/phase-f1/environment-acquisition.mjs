import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmdirSync,
  statfsSync,
  unlinkSync,
  writeSync
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { isatty } from "node:tty";
import { fileURLToPath } from "node:url";
import { parseProcNet } from "./listener-verification.mjs";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import { readProtectedReadiness } from "./report-protected-readiness.mjs";

const require = createRequire(import.meta.url);
const {
  BCN_ALLOWED_KEYS,
  BUILD_ENV_KEYS,
  CIRCLE_ALLOWED_KEYS,
  CIRCLE_CARD_ONLY_KEYS,
  DELIBERATELY_UNSUPPORTED_KEYS,
  LEGACY_SOURCE_CLASSIFICATIONS,
  REQUIRED_BCN_KEYS,
  REQUIRED_CIRCLE_KEYS,
  REQUIRED_SHARED_KEYS,
  RUNTIME_VALUES,
  SHARED_KEYS,
  TOOLING_ONLY_KEYS
} = require("./environment-groups.cjs");
const {
  prepareSanitizedEnvironment
} = require("./environment-contract.cjs");
const {
  parseDotEnvSource
} = require("./environment-serialization.cjs");

export const PLAN_SCHEMA = "phase-f1-environment-selection-plan-v1";
export const REPORT_SCHEMA = "phase-f1-environment-acquisition-report-v1";
export const CORRECTION_REPORT_SCHEMA =
  "phase-f1-environment-selection-correction-report-v1";
export const CARRY_FORWARD_REPORT_SCHEMA =
  "phase-f1-environment-selection-carry-forward-report-v1";
export const IDENTITY_ONLY_CARRY_FORWARD =
  "IDENTITY_ONLY_SELECTION_PLAN_CARRY_FORWARD";
export const IDENTITY_ONLY_SEMANTIC_DELTA = "IDENTITY_ONLY";
export const UNEXPECTED_SEMANTIC_DELTA = "UNEXPECTED_SEMANTIC_DELTA";
export const CLOUDINARY_CORRECTION =
  "CLOUDINARY_REQUIRED_SHARED_SOURCE_TO_HISTORICAL_DOTENV_PRODUCTION";
export const CLOUDINARY_CORRECTION_NAMES = Object.freeze([
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_CLOUD_NAME"
]);
export const UPSTASH_CORRECTION =
  "UPSTASH_REQUIRED_SHARED_SOURCE_TO_HISTORICAL_DOTENV_PRODUCTION";
export const UPSTASH_CORRECTION_NAMES = Object.freeze([
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_URL"
]);
export const OPERATIONS_COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
export const PLAN_IDENTITY_PATTERN = /^[0-9a-f]{64}$/u;
export const HISTORICAL_DOTENV =
  "/var/www/The-Business-Circle.Net/.env";
export const HISTORICAL_DOTENV_PRODUCTION =
  "/var/www/The-Business-Circle.Net/.env.production";
export const PROTECTED_BACKUP =
  "/var/www/The-Business-Circle.Net/.env.backup-20260720-164833";
export const RUN_ROOT = "/run";
export const ACQUISITION_ROOT = "/run/thebusinesscircle";
export const STATE_ROOT = "/var/lib/thebusinesscircle/deployment-state";
export const AUTHORITY_IDENTITY_PATH =
  "/var/lib/thebusinesscircle/approved-phase-f1-pack.json";
export const LIVE_APPLICATION_NAME = "businesscircle";
export const LIVE_PORT = 3000;
export const SOURCE_SELECTORS = Object.freeze([
  "LIVE_BCN_PROCESS",
  "HISTORICAL_DOTENV",
  "HISTORICAL_DOTENV_PRODUCTION",
  "SECURE_OPERATOR_ENTRY",
  "GENERATED_NON_SECRET_DECISION",
  "OMIT"
]);
export const SOURCE_COMPARISONS = Object.freeze([
  "PRESENT_IN_LIVE_PROCESS",
  "ABSENT_FROM_LIVE_PROCESS",
  "MATCHES_HISTORICAL_DOTENV",
  "MATCHES_HISTORICAL_DOTENV_PRODUCTION",
  "DIFFERS_FROM_HISTORICAL_DOTENV",
  "DIFFERS_FROM_HISTORICAL_DOTENV_PRODUCTION",
  "HISTORICAL_SOURCES_MATCH",
  "HISTORICAL_SOURCES_CONFLICT"
]);
export const SAFE_LIVE_NAMES = Object.freeze([
  "DATABASE_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "TURN_DOMAIN",
  "TURN_TLS_ENABLED",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_SERVER_URL",
  "TURN_REALM",
  "BCN_COMMUNITY_MAX_POSTS_PER_RUN",
  "BCN_COMMUNITY_SOURCE_URLS",
  "COMMUNITY_AUTOMATION_AUTHOR_ID"
]);
export const OPERATOR_ENTRY_NAMES = Object.freeze([
  "PUBLIC_CONTACT_EMAIL",
  "RESEND_REPLY_TO_EMAIL",
  "RESEND_WEBHOOK_SECRET",
  "CIRCLE_CARD_RESEND_API_KEY",
  "CIRCLE_CARD_RESEND_FROM_EMAIL",
  "CIRCLE_CARD_RESEND_REPLY_TO_EMAIL",
  "CIRCLE_CARD_PUBLIC_CONTACT_EMAIL",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN"
]);
export const AUTOMATION_CONDITIONAL_NAMES = Object.freeze([
  "BCN_COMMUNITY_MAX_POSTS_PER_RUN",
  "BCN_COMMUNITY_SOURCE_URLS",
  "COMMUNITY_AUTOMATION_AUTHOR_ID"
]);
export const LIVEKIT_CONDITIONAL_NAMES = Object.freeze([
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_SERVER_URL"
]);
export const REDIS_PAIRS = Object.freeze({
  UPSTASH: Object.freeze([
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN"
  ]),
  KV: Object.freeze(["KV_REST_API_URL", "KV_REST_API_TOKEN"])
});

const ALL_ALLOWED = new Set([
  ...BCN_ALLOWED_KEYS,
  ...CIRCLE_ALLOWED_KEYS,
  ...BUILD_ENV_KEYS
]);
const REQUIRED = new Set([
  ...REQUIRED_SHARED_KEYS,
  ...REQUIRED_BCN_KEYS,
  ...REQUIRED_CIRCLE_KEYS
]);
const FIXED_NAMES = new Set(
  Object.values(RUNTIME_VALUES).flatMap((values) => Object.keys(values))
);
const FORBIDDEN_NAMES = new Set([
  ...TOOLING_ONLY_KEYS,
  ...Object.keys(LEGACY_SOURCE_CLASSIFICATIONS),
  ...DELIBERATELY_UNSUPPORTED_KEYS,
  ...FIXED_NAMES
]);
// BCN may source this setting although Circle Card fixes the same name at launch.
FORBIDDEN_NAMES.delete("BCN_COMMUNITY_AUTOMATION_ENABLED");

function fail(message) {
  throw new Error(message);
}

function own(object, key) {
  return Object.hasOwn(object, key);
}

function mode(stats) {
  return stats.mode & 0o777;
}

function assertPlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(`${label} must be a plain object.`);
  }
}

function assertExactKeys(object, keys, label) {
  assertPlainObject(object, label);
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(`${label} has an unsupported or missing field.`);
  }
}

function ordinal(values) {
  return [...values].sort((left, right) =>
    Buffer.from(left).compare(Buffer.from(right))
  );
}

function planIdentity(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function acquisitionDirectory(operationsCommit) {
  if (!OPERATIONS_COMMIT_PATTERN.test(operationsCommit)) {
    fail("Exact operations commit is required.");
  }
  return `${ACQUISITION_ROOT}/phase-f1-environment-${operationsCommit}`;
}

export function selectionPlanPath(operationsCommit, stateRoot = STATE_ROOT) {
  if (!OPERATIONS_COMMIT_PATTERN.test(operationsCommit ?? "")) {
    fail("Selection plan path requires an exact operations commit.");
  }
  return `${stateRoot}/phase-f1-environment-selection-${operationsCommit}.json`;
}

export function acquisitionReportPath(operationsCommit) {
  return `${STATE_ROOT}/phase-f1-environment-acquisition-${operationsCommit}.json`;
}

export function correctionReportPath(operationsCommit, stateRoot = STATE_ROOT) {
  if (!OPERATIONS_COMMIT_PATTERN.test(operationsCommit ?? "")) {
    fail("Correction report path requires an exact operations commit.");
  }
  return `${stateRoot}/phase-f1-environment-selection-correction-${operationsCommit}.json`;
}

export function carryForwardReportPath(
  operationsCommit,
  stateRoot = STATE_ROOT
) {
  if (!OPERATIONS_COMMIT_PATTERN.test(operationsCommit ?? "")) {
    fail("Carry-forward report path requires an exact operations commit.");
  }
  return `${stateRoot}/phase-f1-environment-selection-carry-forward-${operationsCommit}.json`;
}

function expectedScopes(name) {
  const scopes = [];
  if (BCN_ALLOWED_KEYS.includes(name)) scopes.push("bcn");
  if (CIRCLE_ALLOWED_KEYS.includes(name)) scopes.push("circle-card");
  if (BUILD_ENV_KEYS.includes(name)) scopes.push("build");
  return scopes;
}

function expectedEquality(name) {
  if (SHARED_KEYS.includes(name)) return "BCN_CIRCLE_IDENTICAL";
  if (CIRCLE_CARD_ONLY_KEYS.includes(name)) {
    return "SINGLE_SOURCE_CIRCLE_LIFECYCLE";
  }
  return "NONE";
}

function expectedDifference(name) {
  return name === "CIRCLE_CARD_RESEND_API_KEY" ? "RESEND_API_KEY" : null;
}

function assertNoValueMaterial(value, path = "plan") {
  if (typeof value === "string") {
    if (
      /(?:^|[-_])(value|encoded|fingerprint|digest|hash|length)(?:$|[-_])/iu.test(
        path
      )
    ) {
      fail("Selection plan may not contain values or value-derived material.");
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoValueMaterial(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (/^(?:value|encodedValue|valueHash|valueLength|secretFingerprint)$/iu.test(key)) {
        fail("Selection plan may not contain values or value-derived material.");
      }
      assertNoValueMaterial(item, `${path}.${key}`);
    }
  }
}

export function parseSelectionPlan(text) {
  let plan;
  try {
    plan = JSON.parse(text);
  } catch {
    fail("Selection plan is not valid JSON.");
  }
  assertNoValueMaterial(plan);
  assertExactKeys(
    plan,
    ["schemaVersion", "operationsCommit", "decisions", "variables"],
    "selection plan"
  );
  if (plan.schemaVersion !== PLAN_SCHEMA) {
    fail("Selection plan schema is not approved.");
  }
  if (!OPERATIONS_COMMIT_PATTERN.test(plan.operationsCommit)) {
    fail("Selection plan operations commit is invalid.");
  }
  assertExactKeys(
    plan.decisions,
    ["redisProvider", "bcnCommunityAutomation", "livekitRealtime"],
    "selection plan decisions"
  );
  if (!["UPSTASH", "KV"].includes(plan.decisions.redisProvider)) {
    fail("Exactly one approved Redis provider decision is required.");
  }
  if (!["ENABLED", "DISABLED"].includes(plan.decisions.bcnCommunityAutomation)) {
    fail("BCN community automation decision is invalid.");
  }
  if (!["RETAINED", "DISABLED"].includes(plan.decisions.livekitRealtime)) {
    fail("LiveKit/realtime decision is invalid.");
  }
  if (!Array.isArray(plan.variables)) {
    fail("Selection plan variables must be an array.");
  }

  const names = new Set();
  for (const entry of plan.variables) {
    assertExactKeys(
      entry,
      [
        "name",
        "scopes",
        "source",
        "required",
        "omissionDisablesFeature",
        "equality",
        "differsFrom",
        "operatorEntered",
        "generatedDecision"
      ],
      "selection plan variable"
    );
    if (
      typeof entry.name !== "string" ||
      !/^[A-Z][A-Z0-9_]*$/u.test(entry.name)
    ) {
      fail("Selection plan variable name is invalid.");
    }
    if (names.has(entry.name)) fail(`Duplicate selected variable: ${entry.name}`);
    names.add(entry.name);
    if (FORBIDDEN_NAMES.has(entry.name)) {
      fail(`Non-migrating variable rejected: ${entry.name}`);
    }
    if (!ALL_ALLOWED.has(entry.name)) {
      fail(`Unknown variable rejected: ${entry.name}`);
    }
    if (!SOURCE_SELECTORS.includes(entry.source)) {
      fail(`Unsupported source selector: ${entry.name}`);
    }
    if (
      !Array.isArray(entry.scopes) ||
      JSON.stringify(entry.scopes) !== JSON.stringify(expectedScopes(entry.name))
    ) {
      fail(`Incorrect scope contract: ${entry.name}`);
    }
    if (entry.required !== REQUIRED.has(entry.name)) {
      fail(`Incorrect required classification: ${entry.name}`);
    }
    if (typeof entry.omissionDisablesFeature !== "boolean") {
      fail(`Feature-omission classification must be boolean: ${entry.name}`);
    }
    if (entry.equality !== expectedEquality(entry.name)) {
      fail(`Incorrect shared-value rule: ${entry.name}`);
    }
    if (entry.differsFrom !== expectedDifference(entry.name)) {
      fail(`Incorrect separation rule: ${entry.name}`);
    }
    if (entry.operatorEntered !== (entry.source === "SECURE_OPERATOR_ENTRY")) {
      fail(`Incorrect operator-entry classification: ${entry.name}`);
    }
    if (
      entry.source === "LIVE_BCN_PROCESS" &&
      !SAFE_LIVE_NAMES.includes(entry.name)
    ) {
      fail(`Live process selection is not approved for: ${entry.name}`);
    }
    if (
      entry.source === "SECURE_OPERATOR_ENTRY" &&
      !OPERATOR_ENTRY_NAMES.includes(entry.name)
    ) {
      fail(`Secure operator entry is not approved for: ${entry.name}`);
    }
    if (entry.source === "GENERATED_NON_SECRET_DECISION") {
      if (
        entry.name !== "BCN_COMMUNITY_AUTOMATION_ENABLED" ||
        entry.generatedDecision !==
          `BCN_COMMUNITY_AUTOMATION_${plan.decisions.bcnCommunityAutomation}`
      ) {
        fail("Generated decision is not narrowly approved.");
      }
    } else if (entry.generatedDecision !== null) {
      fail(`Unexpected generated decision: ${entry.name}`);
    }
    if (entry.source === "OMIT" && entry.required) {
      fail(`Required variable cannot be omitted: ${entry.name}`);
    }
  }

  for (const name of REQUIRED) {
    if (!names.has(name)) fail(`Required selection is missing: ${name}`);
  }
  const selected = new Map(plan.variables.map((entry) => [entry.name, entry]));
  const redisProvider = plan.decisions.redisProvider;
  const selectedPair = REDIS_PAIRS[redisProvider];
  const unusedPair = REDIS_PAIRS[redisProvider === "UPSTASH" ? "KV" : "UPSTASH"];
  for (const name of selectedPair) {
    if (!selected.has(name) || selected.get(name).source === "OMIT") {
      fail(`Selected Redis provider is incomplete: ${name}`);
    }
  }
  for (const name of unusedPair) {
    if (selected.has(name) && selected.get(name).source !== "OMIT") {
      fail(`Unselected Redis provider must be absent: ${name}`);
    }
  }
  const automationEnabled =
    plan.decisions.bcnCommunityAutomation === "ENABLED";
  const automationEntry = selected.get("BCN_COMMUNITY_AUTOMATION_ENABLED");
  if (
    !automationEntry ||
    automationEntry.source !== "GENERATED_NON_SECRET_DECISION"
  ) {
    fail("BCN automation requires one explicit generated decision.");
  }
  for (const name of AUTOMATION_CONDITIONAL_NAMES) {
    const entry = selected.get(name);
    if (automationEnabled && (!entry || entry.source === "OMIT")) {
      fail(`Enabled automation requires explicit selection: ${name}`);
    }
    if (!automationEnabled && entry && entry.source !== "OMIT") {
      fail(`Disabled automation must omit: ${name}`);
    }
  }
  const livekitRetained = plan.decisions.livekitRealtime === "RETAINED";
  for (const name of LIVEKIT_CONDITIONAL_NAMES) {
    const entry = selected.get(name);
    if (livekitRetained && (!entry || entry.source === "OMIT")) {
      fail(`Retained LiveKit requires explicit selection: ${name}`);
    }
    if (!livekitRetained && entry && entry.source !== "OMIT") {
      fail(`Disabled LiveKit must omit: ${name}`);
    }
  }
  return {
    ...plan,
    variables: [...plan.variables].sort((left, right) =>
      Buffer.from(left.name).compare(Buffer.from(right.name))
    )
  };
}

function assertCanonicalAbsolute(path, label) {
  if (typeof path !== "string" || !path.startsWith("/") || resolve(path) !== path) {
    fail(`${label} must be an absolute normalised path.`);
  }
  if (realpathSync(path) !== path) fail(`${label} must be canonical.`);
}

function assertProtectedRegularFile(path, label, expectedMode = 0o600) {
  assertCanonicalAbsolute(path, label);
  const stats = lstatSync(path);
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1 ||
    stats.uid !== 0 ||
    stats.gid !== 0 ||
    mode(stats) !== expectedMode
  ) {
    fail(`${label} metadata is unsafe.`);
  }
  return stats;
}

export function readSelectionPlan(path, options = {}) {
  const expectedOperationsCommit = options.expectedOperationsCommit;
  const stateRoot = options.stateRoot ?? STATE_ROOT;
  if (!OPERATIONS_COMMIT_PATTERN.test(expectedOperationsCommit ?? "")) {
    fail("Expected operations commit is required.");
  }
  if (path !== selectionPlanPath(expectedOperationsCommit, stateRoot)) {
    fail("Selection plan path is not the commit-bound protected path.");
  }
  assertProtectedRegularFile(path, "selection plan");
  const bytes = readFileSync(path);
  const plan = parseSelectionPlan(bytes.toString("utf8"));
  if (plan.operationsCommit !== expectedOperationsCommit) {
    fail("Selection plan operations identity differs.");
  }
  return { plan, bytes, identity: planIdentity(bytes) };
}

function pathObjectExists(path, lstat = lstatSync) {
  try {
    lstat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function assertCorrectionStateRoot(stateRoot) {
  assertCanonicalAbsolute(stateRoot, "deployment-state root");
  const stats = lstatSync(stateRoot);
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    stats.uid !== 0 ||
    stats.gid !== 0 ||
    mode(stats) !== 0o700
  ) {
    fail("Deployment-state root metadata is unsafe.");
  }
}

function assertProductionCorrectionContext(operationsCommit) {
  const expectedUtility =
    `/opt/thebusinesscircle/deployment-packs/${operationsCommit}/` +
    "environment-acquisition.mjs";
  if (
    fileURLToPath(import.meta.url) !== expectedUtility ||
    realpathSync(expectedUtility) !== expectedUtility
  ) {
    fail("Plan correction must run from the exact installed operations pack.");
  }
  assertProtectedRegularFile(AUTHORITY_IDENTITY_PATH, "authoritative identity");
  let authority;
  try {
    authority = JSON.parse(readFileSync(AUTHORITY_IDENTITY_PATH, "utf8"));
  } catch {
    fail("Authoritative identity is not valid JSON.");
  }
  if (authority.operationsCommit !== operationsCommit) {
    fail("Plan correction operations commit is not authoritative.");
  }
}

function exactLockedDecisions(decisions) {
  return (
    decisions.redisProvider === "UPSTASH" &&
    decisions.bcnCommunityAutomation === "DISABLED" &&
    decisions.livekitRealtime === "RETAINED"
  );
}

function correctionNames(correction) {
  if (correction === CLOUDINARY_CORRECTION) {
    return CLOUDINARY_CORRECTION_NAMES;
  }
  if (correction === UPSTASH_CORRECTION) {
    return UPSTASH_CORRECTION_NAMES;
  }
  fail("Unsupported selection-plan correction identifier.");
}

function assertCorrectionPreconditions(parsedPrior, correction, affectedNames) {
  for (const name of affectedNames) {
    const entry = parsedPrior.variables.find((item) => item.name === name);
    if (
      !entry ||
      entry.source !== "LIVE_BCN_PROCESS" ||
      entry.operatorEntered !== false
    ) {
      const classification =
        correction === UPSTASH_CORRECTION ? "Upstash" : "Cloudinary";
      fail(`Prior ${classification} selection is not correctable: ${name}`);
    }
  }
  if (correction === UPSTASH_CORRECTION) {
    for (const name of REDIS_PAIRS.KV) {
      const entry = parsedPrior.variables.find((item) => item.name === name);
      if (entry && entry.source !== "OMIT") {
        fail(`Unselected Redis provider is not excluded: ${name}`);
      }
    }
  }
}

export function buildCorrectedSelectionPlan(priorPlan, options) {
  const {
    priorOperationsCommit,
    operationsCommit,
    correction
  } = options;
  if (
    !OPERATIONS_COMMIT_PATTERN.test(priorOperationsCommit ?? "") ||
    !OPERATIONS_COMMIT_PATTERN.test(operationsCommit ?? "") ||
    priorOperationsCommit === operationsCommit
  ) {
    fail("Distinct exact prior and new operations commits are required.");
  }
  const correctionVariableNames = correctionNames(correction);
  const parsedPrior = parseSelectionPlan(JSON.stringify(priorPlan));
  if (parsedPrior.operationsCommit !== priorOperationsCommit) {
    fail("Prior selection plan operations commit differs.");
  }
  if (!exactLockedDecisions(parsedPrior.decisions)) {
    fail("Prior selection plan locked decisions differ.");
  }
  const affected = new Set(correctionVariableNames);
  assertCorrectionPreconditions(parsedPrior, correction, affected);

  const corrected = {
    ...parsedPrior,
    operationsCommit,
    decisions: { ...parsedPrior.decisions },
    variables: parsedPrior.variables.map((entry) =>
      affected.has(entry.name)
        ? { ...entry, source: "HISTORICAL_DOTENV_PRODUCTION" }
        : { ...entry }
    )
  };
  const validated = parseSelectionPlan(JSON.stringify(corrected));
  const expected = {
    ...parsedPrior,
    operationsCommit,
    decisions: { ...parsedPrior.decisions },
    variables: parsedPrior.variables.map((entry) =>
      affected.has(entry.name)
        ? { ...entry, source: "HISTORICAL_DOTENV_PRODUCTION" }
        : { ...entry }
    )
  };
  if (JSON.stringify(validated) !== JSON.stringify(expected)) {
    fail("Corrected selection plan contains an unauthorised change.");
  }
  return validated;
}

export function renderSelectionPlan(plan) {
  const validated = parseSelectionPlan(JSON.stringify(plan));
  return Buffer.from(`${JSON.stringify(validated, null, 2)}\n`, "utf8");
}

function correctionEvidence(priorRecord, correctedPlanIdentity, options) {
  return {
    schemaVersion: CORRECTION_REPORT_SCHEMA,
    priorOperationsCommit: options.priorOperationsCommit,
    operationsCommit: options.operationsCommit,
    priorPlanSha256: priorRecord.identity,
    correctedPlanSha256: correctedPlanIdentity,
    correction: options.correction,
    affectedVariables: [...correctionNames(options.correction)],
    oldSelector: "LIVE_BCN_PROCESS",
    newSelector: "HISTORICAL_DOTENV_PRODUCTION",
    originalPreserved: true,
    valuesRecorded: false
  };
}

function parseCorrectionEvidence(text, expected) {
  let report;
  try {
    report = JSON.parse(text);
  } catch {
    fail("Selection-plan correction evidence is not valid JSON.");
  }
  assertExactKeys(
    report,
    [
      "schemaVersion",
      "priorOperationsCommit",
      "operationsCommit",
      "priorPlanSha256",
      "correctedPlanSha256",
      "correction",
      "affectedVariables",
      "oldSelector",
      "newSelector",
      "originalPreserved",
      "valuesRecorded"
    ],
    "selection-plan correction evidence"
  );
  if (JSON.stringify(report) !== JSON.stringify(expected)) {
    fail("Selection-plan correction evidence differs from the approved record.");
  }
  return report;
}

export function createPlanCorrectionArtifacts(priorRecord, options) {
  if (!PLAN_IDENTITY_PATTERN.test(options.priorPlanSha256 ?? "")) {
    fail("Exact prior selection-plan identity is required.");
  }
  if (priorRecord.identity !== options.priorPlanSha256) {
    fail("Prior selection-plan identity differs.");
  }
  const correctedPlan = buildCorrectedSelectionPlan(priorRecord.plan, options);
  const planPayload = renderSelectionPlan(correctedPlan);
  const correctedPlanIdentity = planIdentity(planPayload);
  const evidence = correctionEvidence(
    priorRecord,
    correctedPlanIdentity,
    options
  );
  const evidencePayload = Buffer.from(
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8"
  );
  parseCorrectionEvidence(evidencePayload.toString("utf8"), evidence);
  return {
    correctedPlan,
    correctedPlanIdentity,
    planPayload,
    evidence,
    evidencePayload
  };
}

export function publishCorrectedSelectionPlan(options, dependencies = {}) {
  const stateRoot = dependencies.stateRoot ?? STATE_ROOT;
  const pathForPlan =
    dependencies.selectionPlanPath ??
    ((commit) => selectionPlanPath(commit, stateRoot));
  const pathForReport =
    dependencies.correctionReportPath ??
    ((commit) => correctionReportPath(commit, stateRoot));
  const readPlan =
    dependencies.readSelectionPlan ??
    ((path, commit) =>
      readSelectionPlan(path, {
        expectedOperationsCommit: commit,
        stateRoot
      }));
  const read = dependencies.readFile ?? readFileSync;
  const exists = dependencies.pathObjectExists ?? pathObjectExists;
  const publish = dependencies.publishNoReplaceSet ?? publishNoReplaceSet;
  (dependencies.assertStateRoot ?? assertCorrectionStateRoot)(stateRoot);
  (dependencies.assertProductionContext ?? assertProductionCorrectionContext)(
    options.operationsCommit
  );

  const priorPath = pathForPlan(options.priorOperationsCommit);
  const correctedPath = pathForPlan(options.operationsCommit);
  const reportPath = pathForReport(options.operationsCommit);
  if (exists(correctedPath) || exists(reportPath)) {
    fail("Corrected selection-plan target already exists.");
  }
  const priorRecord = readPlan(priorPath, options.priorOperationsCommit);
  const artifacts = createPlanCorrectionArtifacts(priorRecord, options);

  publish(
    [
      {
        target: correctedPath,
        payload: artifacts.planPayload,
        uid: 0,
        gid: 0,
        mode: 0o600
      },
      {
        target: reportPath,
        payload: artifacts.evidencePayload,
        uid: 0,
        gid: 0,
        mode: 0o600
      }
    ],
    {
      enforceMetadata: true,
      fsyncDirectories: true,
      verifySet() {
        const preserved = readPlan(priorPath, options.priorOperationsCommit);
        if (preserved.identity !== priorRecord.identity) {
          fail("Original selection plan changed during correction.");
        }
        const published = readPlan(correctedPath, options.operationsCommit);
        if (published.identity !== artifacts.correctedPlanIdentity) {
          fail("Corrected selection-plan identity verification failed.");
        }
        parseCorrectionEvidence(
          read(reportPath, "utf8"),
          artifacts.evidence
        );
      }
    }
  );
  return {
    priorPath,
    correctedPath,
    reportPath,
    priorPlanIdentity: priorRecord.identity,
    correctedPlanIdentity: artifacts.correctedPlanIdentity
  };
}

export function classifySelectionPlanSemanticDelta(priorPlan, candidatePlan) {
  let prior;
  let candidate;
  try {
    prior = parseSelectionPlan(JSON.stringify(priorPlan));
    candidate = parseSelectionPlan(JSON.stringify(candidatePlan));
  } catch {
    return UNEXPECTED_SEMANTIC_DELTA;
  }
  const expected = {
    ...prior,
    operationsCommit: candidate.operationsCommit,
    decisions: { ...prior.decisions },
    variables: prior.variables.map((entry) => ({ ...entry }))
  };
  return JSON.stringify(candidate) === JSON.stringify(expected) &&
    JSON.stringify(candidatePlan) === JSON.stringify(expected)
    ? IDENTITY_ONLY_SEMANTIC_DELTA
    : UNEXPECTED_SEMANTIC_DELTA;
}

export function buildCarriedForwardSelectionPlan(priorPlan, options) {
  assertExactKeys(
    options,
    [
      "priorOperationsCommit",
      "priorPlanSha256",
      "operationsCommit",
      "carryForward"
    ],
    "selection-plan carry-forward options"
  );
  const { priorOperationsCommit, operationsCommit, carryForward } = options;
  if (carryForward !== IDENTITY_ONLY_CARRY_FORWARD) {
    fail("Unsupported selection-plan carry-forward identifier.");
  }
  if (
    !OPERATIONS_COMMIT_PATTERN.test(priorOperationsCommit ?? "") ||
    !OPERATIONS_COMMIT_PATTERN.test(operationsCommit ?? "") ||
    priorOperationsCommit === operationsCommit
  ) {
    fail("Distinct exact prior and new operations commits are required.");
  }
  const parsedPrior = parseSelectionPlan(JSON.stringify(priorPlan));
  if (parsedPrior.operationsCommit !== priorOperationsCommit) {
    fail("Prior selection plan operations commit differs.");
  }
  const candidate = parseSelectionPlan(
    JSON.stringify({ ...parsedPrior, operationsCommit })
  );
  if (
    classifySelectionPlanSemanticDelta(parsedPrior, candidate) !==
    IDENTITY_ONLY_SEMANTIC_DELTA
  ) {
    fail("Carried-forward selection plan has an unexpected semantic delta.");
  }
  return candidate;
}

function carryForwardEvidence(priorRecord, carriedForwardPlanIdentity, options) {
  return {
    schemaVersion: CARRY_FORWARD_REPORT_SCHEMA,
    priorOperationsCommit: options.priorOperationsCommit,
    operationsCommit: options.operationsCommit,
    priorPlanSha256: priorRecord.identity,
    carriedForwardPlanSha256: carriedForwardPlanIdentity,
    carryForward: options.carryForward,
    semanticDelta: IDENTITY_ONLY_SEMANTIC_DELTA,
    originalPreserved: true,
    valuesRecorded: false
  };
}

function parseCarryForwardEvidence(text, expected) {
  let report;
  try {
    report = JSON.parse(text);
  } catch {
    fail("Selection-plan carry-forward evidence is not valid JSON.");
  }
  assertExactKeys(
    report,
    [
      "schemaVersion",
      "priorOperationsCommit",
      "operationsCommit",
      "priorPlanSha256",
      "carriedForwardPlanSha256",
      "carryForward",
      "semanticDelta",
      "originalPreserved",
      "valuesRecorded"
    ],
    "selection-plan carry-forward evidence"
  );
  if (JSON.stringify(report) !== JSON.stringify(expected)) {
    fail("Selection-plan carry-forward evidence differs from the approved record.");
  }
  return report;
}

export function createPlanCarryForwardArtifacts(priorRecord, options) {
  if (!PLAN_IDENTITY_PATTERN.test(options.priorPlanSha256 ?? "")) {
    fail("Exact prior selection-plan identity is required.");
  }
  if (priorRecord.identity !== options.priorPlanSha256) {
    fail("Prior selection-plan identity differs.");
  }
  const carriedForwardPlan = buildCarriedForwardSelectionPlan(
    priorRecord.plan,
    options
  );
  const planPayload = renderSelectionPlan(carriedForwardPlan);
  const carriedForwardPlanIdentity = planIdentity(planPayload);
  const evidence = carryForwardEvidence(
    priorRecord,
    carriedForwardPlanIdentity,
    options
  );
  const evidencePayload = Buffer.from(
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8"
  );
  parseCarryForwardEvidence(evidencePayload.toString("utf8"), evidence);
  return {
    carriedForwardPlan,
    carriedForwardPlanIdentity,
    planPayload,
    evidence,
    evidencePayload
  };
}

export function publishCarriedForwardSelectionPlan(options, dependencies = {}) {
  const stateRoot = dependencies.stateRoot ?? STATE_ROOT;
  const pathForPlan =
    dependencies.selectionPlanPath ??
    ((commit) => selectionPlanPath(commit, stateRoot));
  const pathForReport =
    dependencies.carryForwardReportPath ??
    ((commit) => carryForwardReportPath(commit, stateRoot));
  const readPlan =
    dependencies.readSelectionPlan ??
    ((path, commit) =>
      readSelectionPlan(path, {
        expectedOperationsCommit: commit,
        stateRoot
      }));
  const read = dependencies.readFile ?? readFileSync;
  const exists = dependencies.pathObjectExists ?? pathObjectExists;
  const publish = dependencies.publishNoReplaceSet ?? publishNoReplaceSet;
  (dependencies.assertStateRoot ?? assertCorrectionStateRoot)(stateRoot);
  (dependencies.assertProductionContext ?? assertProductionCorrectionContext)(
    options.operationsCommit
  );

  const priorPath = pathForPlan(options.priorOperationsCommit);
  const carriedForwardPath = pathForPlan(options.operationsCommit);
  const reportPath = pathForReport(options.operationsCommit);
  if (exists(carriedForwardPath) || exists(reportPath)) {
    fail("Carried-forward selection-plan target already exists.");
  }
  const priorRecord = readPlan(priorPath, options.priorOperationsCommit);
  const artifacts = createPlanCarryForwardArtifacts(priorRecord, options);

  publish(
    [
      {
        target: carriedForwardPath,
        payload: artifacts.planPayload,
        uid: 0,
        gid: 0,
        mode: 0o600
      },
      {
        target: reportPath,
        payload: artifacts.evidencePayload,
        uid: 0,
        gid: 0,
        mode: 0o600
      }
    ],
    {
      enforceMetadata: true,
      fsyncDirectories: true,
      verifySet() {
        const preserved = readPlan(priorPath, options.priorOperationsCommit);
        if (preserved.identity !== priorRecord.identity) {
          fail("Original selection plan changed during carry-forward.");
        }
        const published = readPlan(carriedForwardPath, options.operationsCommit);
        if (published.identity !== artifacts.carriedForwardPlanIdentity) {
          fail("Carried-forward selection-plan identity verification failed.");
        }
        if (
          classifySelectionPlanSemanticDelta(priorRecord.plan, published.plan) !==
          IDENTITY_ONLY_SEMANTIC_DELTA
        ) {
          fail("Published selection plan has an unexpected semantic delta.");
        }
        parseCarryForwardEvidence(
          read(reportPath, "utf8"),
          artifacts.evidence
        );
      }
    }
  );
  return {
    priorPath,
    carriedForwardPath,
    reportPath,
    priorPlanIdentity: priorRecord.identity,
    carriedForwardPlanIdentity: artifacts.carriedForwardPlanIdentity,
    semanticDelta: IDENTITY_ONLY_SEMANTIC_DELTA
  };
}

function safeHistoricalValues(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([name]) => ALL_ALLOWED.has(name))
  );
}

export function readApprovedHistoricalFile(
  path,
  expectedPath,
  options = {}
) {
  if (path === PROTECTED_BACKUP || basename(path) === basename(PROTECTED_BACKUP)) {
    fail("Protected backup source is explicitly denied.");
  }
  if (path !== expectedPath) fail("Arbitrary historical source path rejected.");
  assertCanonicalAbsolute(path, "historical source");
  const stats = lstatSync(path);
  const enforceRoot = options.enforceRoot !== false;
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1 ||
    (enforceRoot && (stats.uid !== 0 || stats.gid !== 0 || mode(stats) !== 0o600))
  ) {
    fail("Historical source metadata is unsafe.");
  }
  const source = readFileSync(path, "utf8");
  return safeHistoricalValues(parseDotEnvSource(source, path));
}

export function extractAllowlistedEnvironment(bytes, allowlist) {
  const approved = new Set(allowlist);
  const values = {};
  const working = Buffer.from(bytes);
  try {
    let start = 0;
    while (start < working.length) {
      let end = working.indexOf(0, start);
      if (end < 0) end = working.length;
      const separator = working.indexOf(0x3d, start);
      if (separator > start && separator < end) {
        const name = working.toString("utf8", start, separator);
        if (approved.has(name)) {
          values[name] = working.toString("utf8", separator + 1, end);
        }
      }
      start = end + 1;
    }
  } finally {
    working.fill(0);
  }
  return values;
}

function procStat(pid, read = readFileSync) {
  const body = read(`/proc/${pid}/stat`, "utf8");
  const close = body.lastIndexOf(")");
  if (close < 0) fail("Malformed process stat record.");
  const fields = body.slice(close + 2).trim().split(/\s+/u);
  return { pid: Number(pid), ppid: Number(fields[1]) };
}

function procChildren(parentPid, dependencies) {
  const children = [];
  for (const name of dependencies.readdir("/proc")) {
    if (!/^\d+$/u.test(name)) continue;
    try {
      const record = procStat(Number(name), dependencies.readFile);
      if (record.ppid === parentPid) children.push(record.pid);
    } catch {
      // A process may disappear during inspection; the final exact tree gate
      // still fails closed if the required process is no longer present.
    }
  }
  return children;
}

function descendantPids(rootPid, dependencies) {
  const found = [];
  const pending = [rootPid];
  while (pending.length) {
    const parent = pending.shift();
    for (const child of procChildren(parent, dependencies)) {
      if (found.includes(child)) continue;
      found.push(child);
      pending.push(child);
    }
  }
  return found;
}

function pidSocketInodes(pid, dependencies) {
  const result = new Set();
  for (const name of dependencies.readdir(`/proc/${pid}/fd`)) {
    try {
      const target = dependencies.readlink(`/proc/${pid}/fd/${name}`);
      const match = /^socket:\[(\d+)\]$/u.exec(target);
      if (match) result.add(match[1]);
    } catch {
      // File descriptors can close while enumerating; ownership is checked
      // against the complete listener result immediately afterward.
    }
  }
  return result;
}

function systemListeners(dependencies) {
  const entries = parseProcNet(
    dependencies.readFile("/proc/net/tcp", "utf8"),
    4
  );
  if (dependencies.exists("/proc/net/tcp6")) {
    entries.push(
      ...parseProcNet(dependencies.readFile("/proc/net/tcp6", "utf8"), 6)
    );
  }
  return entries;
}

function defaultProcessDependencies() {
  return {
    execFile: (path, args) =>
      execFileSync(path, args, {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"]
      }),
    exists: existsSync,
    readFile: readFileSync,
    readdir: readdirSync,
    readlink: readlinkSync
  };
}

export function resolveLiveBcnProcess(
  dependencies = defaultProcessDependencies()
) {
  const pm2Candidates = ["/usr/local/bin/pm2", "/usr/bin/pm2"];
  const pm2Path = pm2Candidates.find((path) => dependencies.exists(path));
  if (!pm2Path) fail("Approved PM2 CLI is unavailable.");
  let output;
  try {
    output = dependencies.execFile(pm2Path, [
      "pid",
      LIVE_APPLICATION_NAME
    ]);
  } catch {
    fail("Live BCN PM2 PID could not be inspected safely.");
  }
  if (!/^[0-9]+\r?\n?$/u.test(output)) {
    fail("Live BCN PM2 PID response is ambiguous.");
  }
  const applicationPid = Number(output.trim());
  if (!Number.isInteger(applicationPid) || applicationPid <= 1) {
    fail("Live BCN PM2 application is not online.");
  }
  const daemonPid = Number(
    dependencies.readFile("/root/.pm2/pm2.pid", "utf8").trim()
  );
  if (!Number.isInteger(daemonPid) || daemonPid <= 1) {
    fail("PM2 daemon PID is invalid.");
  }
  const appStat = procStat(applicationPid, dependencies.readFile);
  if (appStat.ppid !== daemonPid) {
    fail("Live BCN process is not owned by the verified PM2 daemon.");
  }
  const descendants = descendantPids(applicationPid, dependencies);
  const nextPids = descendants.filter((pid) => {
    try {
      const comm = dependencies.readFile(`/proc/${pid}/comm`, "utf8").trim();
      return comm.startsWith("next-server");
    } catch {
      return false;
    }
  });
  if (nextPids.length !== 1) fail("Expected Next process tree is ambiguous.");
  const nextPid = nextPids[0];
  const listenerMatches = systemListeners(dependencies).filter(
    (entry) => entry.port === LIVE_PORT
  );
  if (listenerMatches.length !== 1) {
    fail("Port 3000 listener is absent or ambiguous.");
  }
  const sockets = pidSocketInodes(nextPid, dependencies);
  if (!sockets.has(listenerMatches[0].inode)) {
    fail("Port 3000 is not owned by the expected Next process.");
  }
  const daemonExecutable = dependencies.readlink(`/proc/${daemonPid}/exe`);
  const appExecutable = dependencies.readlink(`/proc/${applicationPid}/exe`);
  const nextExecutable = dependencies.readlink(`/proc/${nextPid}/exe`);
  if (
    basename(daemonExecutable) !== "node" ||
    basename(appExecutable) !== "node" ||
    basename(nextExecutable) !== "node"
  ) {
    fail("Live BCN executable identity is not Node.");
  }
  return Object.freeze({
    pm2Path,
    daemonPid,
    daemonExecutable,
    applicationPid,
    nextPid,
    appExecutable,
    nextExecutable,
    listenerAddress: listenerMatches[0].address
  });
}

export function readLiveBcnValues(processIdentity, names, dependencies = {}) {
  const read = dependencies.readFile ?? readFileSync;
  const approved = names.filter((name) => SAFE_LIVE_NAMES.includes(name));
  if (approved.length !== names.length) {
    fail("Live process read requested a non-approved name.");
  }
  return extractAllowlistedEnvironment(
    read(`/proc/${processIdentity.applicationPid}/environ`),
    approved
  );
}

export function classifySources(name, live, dotenv, production) {
  const classifications = [];
  const hasLive = own(live, name);
  const hasDotenv = own(dotenv, name);
  const hasProduction = own(production, name);
  classifications.push(
    hasLive ? "PRESENT_IN_LIVE_PROCESS" : "ABSENT_FROM_LIVE_PROCESS"
  );
  if (hasLive && hasDotenv) {
    classifications.push(
      live[name] === dotenv[name]
        ? "MATCHES_HISTORICAL_DOTENV"
        : "DIFFERS_FROM_HISTORICAL_DOTENV"
    );
  }
  if (hasLive && hasProduction) {
    classifications.push(
      live[name] === production[name]
        ? "MATCHES_HISTORICAL_DOTENV_PRODUCTION"
        : "DIFFERS_FROM_HISTORICAL_DOTENV_PRODUCTION"
    );
  }
  if (hasDotenv && hasProduction) {
    classifications.push(
      dotenv[name] === production[name]
        ? "HISTORICAL_SOURCES_MATCH"
        : "HISTORICAL_SOURCES_CONFLICT"
    );
  }
  return classifications;
}

function sensitiveOperatorName(name) {
  return /(?:SECRET|TOKEN|API_KEY|PASSWORD|DATABASE_URL)$/u.test(name);
}

function readLineFromFd(fd) {
  const chunks = [];
  const byte = Buffer.alloc(1);
  try {
    while (true) {
      const count = readSync(fd, byte, 0, 1, null);
      if (count !== 1) fail("Controlling terminal closed during entry.");
      if (byte[0] === 10 || byte[0] === 13) break;
      chunks.push(Buffer.from(byte));
    }
    return Buffer.concat(chunks);
  } finally {
    byte.fill(0);
    for (const chunk of chunks) chunk.fill(0);
  }
}

function defaultTerminalDependencies() {
  const dependencies = {
    open: () => openSync("/dev/tty", "r+"),
    close: closeSync,
    isatty,
    setEcho(fd, enabled) {
      const result = spawnSync(
        "/usr/bin/stty",
        ["-F", "/dev/tty", enabled ? "echo" : "-echo"],
        { stdio: [fd, fd, fd] }
      );
      if (result.status !== 0) fail("Controlling-terminal echo control failed.");
    },
    write(fd, text) {
      const bytes = Buffer.from(text, "utf8");
      try {
        let offset = 0;
        while (offset < bytes.length) {
          offset += writeSync(fd, bytes, offset, bytes.length - offset);
        }
      } finally {
        bytes.fill(0);
      }
    },
    read: readLineFromFd,
    installSignalGuards(fd) {
      const restore = () => {
        spawnSync("/usr/bin/stty", ["-F", "/dev/tty", "echo"], {
          stdio: [fd, fd, fd]
        });
      };
      const handlers = new Map();
      const remove = () => {
        process.removeListener("exit", restore);
        for (const [signal, handler] of handlers) {
          process.removeListener(signal, handler);
        }
      };
      for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        const handler = () => {
          remove();
          restore();
          process.kill(process.pid, signal);
        };
        handlers.set(signal, handler);
        process.once(signal, handler);
      }
      process.once("exit", restore);
      return remove;
    }
  };
  return dependencies;
}

export function secureOperatorEntry(
  name,
  dependencies = defaultTerminalDependencies()
) {
  if (!OPERATOR_ENTRY_NAMES.includes(name)) {
    fail(`Operator entry is not approved for: ${name}`);
  }
  const fd = dependencies.open();
  let echoDisabled = false;
  let removeSignalGuards = () => {};
  let first;
  let second;
  try {
    if (!dependencies.isatty(fd)) fail("A real controlling terminal is required.");
    dependencies.setEcho(fd, false);
    echoDisabled = true;
    removeSignalGuards = dependencies.installSignalGuards?.(fd) ?? (() => {});
    dependencies.write(fd, `Enter ${name}: `);
    first = dependencies.read(fd);
    dependencies.write(fd, "\n");
    if (sensitiveOperatorName(name)) {
      dependencies.write(fd, `Confirm ${name}: `);
      second = dependencies.read(fd);
      dependencies.write(fd, "\n");
      if (!first.equals(second)) fail(`Confirmation mismatch: ${name}`);
    }
    const value = first.toString("utf8");
    if (!value || /[\0\r\n\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(value)) {
      fail(`Operator entry is empty or unsupported: ${name}`);
    }
    if (
      name === "CIRCLE_CARD_RESEND_FROM_EMAIL" &&
      !/@circlecard\.co\.uk$/iu.test(value)
    ) {
      fail("Circle Card sender must use the approved domain.");
    }
    return value;
  } finally {
    if (first) first.fill(0);
    if (second) second.fill(0);
    removeSignalGuards();
    if (echoDisabled) {
      try {
        dependencies.setEcho(fd, true);
      } catch {
        // The caller receives the original failure; terminal restoration is
        // attempted unconditionally and is independently covered by tests.
      }
    }
    dependencies.close(fd);
  }
}

function dotenvCandidates(name, value) {
  const candidates = [];
  if (
    !/[\0\r\n\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(value) &&
    value.trim() === value &&
    !value.includes("#")
  ) {
    candidates.push(`${name}=${value}\n`);
  }
  if (!value.includes("'")) candidates.push(`${name}='${value}'\n`);
  if (!value.includes('"')) candidates.push(`${name}="${value}"\n`);
  return candidates;
}

export function encodeDotEnvValue(name, value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    /[\0\r\n\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(value)
  ) {
    fail(`Unsupported single-line value: ${name}`);
  }
  for (const candidate of dotenvCandidates(name, value)) {
    try {
      const parsed = parseDotEnvSource(candidate, `generated ${name}`);
      if (parsed[name] === value) return candidate;
    } catch {
      // Try the next deterministic Node-compatible quoting form.
    }
  }
  fail(`Value cannot be represented exactly in Node dotenv syntax: ${name}`);
}

export function renderOperatorInput(values) {
  const names = ordinal(Object.keys(values));
  if (new Set(names).size !== names.length) fail("Duplicate output names rejected.");
  let body = "";
  for (const name of names) {
    if (!ALL_ALLOWED.has(name) || FORBIDDEN_NAMES.has(name)) {
      fail(`Non-migrating output name rejected: ${name}`);
    }
    body += encodeDotEnvValue(name, values[name]);
  }
  const parsed = parseDotEnvSource(body, "generated operator input");
  for (const name of names) {
    if (parsed[name] !== values[name]) {
      fail(`Generated operator input failed exact round-trip: ${name}`);
    }
  }
  return body;
}

export function assembleSelectedValues(
  plan,
  sources,
  operatorReader = secureOperatorEntry
) {
  const result = {};
  for (const entry of plan.variables) {
    let value;
    switch (entry.source) {
      case "LIVE_BCN_PROCESS":
        value = sources.live[entry.name];
        if (value === undefined) {
          fail(`Selected live BCN value is absent: ${entry.name}`);
        }
        break;
      case "HISTORICAL_DOTENV":
        value = sources.dotenv[entry.name];
        if (value === undefined) {
          fail(`Selected historical .env value is absent: ${entry.name}`);
        }
        break;
      case "HISTORICAL_DOTENV_PRODUCTION":
        value = sources.production[entry.name];
        if (value === undefined) {
          fail(`Selected historical .env.production value is absent: ${entry.name}`);
        }
        break;
      case "SECURE_OPERATOR_ENTRY":
        value = operatorReader(entry.name);
        break;
      case "GENERATED_NON_SECRET_DECISION":
        value =
          plan.decisions.bcnCommunityAutomation === "ENABLED"
            ? "true"
            : "false";
        break;
      case "OMIT":
        continue;
      default:
        fail(`Unsupported source selector: ${entry.name}`);
    }
    result[entry.name] = value;
  }
  const prepared = prepareSanitizedEnvironment(result);
  if (prepared.issues.length) {
    const names = ordinal(
      prepared.issues.flatMap((issue) => issue.names ?? [])
    );
    fail(`Selected input failed environment contract: ${names.join(",")}`);
  }
  return result;
}

function tmpfsMagic(stats) {
  // Linux TMPFS_MAGIC. BigInt avoids platform-dependent integer truncation.
  return BigInt(stats.type) === 0x01021994n;
}

export function assertRunTmpfs(path = RUN_ROOT, dependencies = {}) {
  const statfs = dependencies.statfs ?? statfsSync;
  const realpath = dependencies.realpath ?? realpathSync;
  if (path !== RUN_ROOT || realpath(path) !== RUN_ROOT) {
    fail("/run must be the canonical approved temporary root.");
  }
  if (!tmpfsMagic(statfs(path, { bigint: true }))) {
    fail("/run is not tmpfs.");
  }
}

function fsyncDirectory(path) {
  const fd = openSync(path, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function ensureAcquisitionRoot() {
  assertRunTmpfs();
  if (!existsSync(ACQUISITION_ROOT)) {
    mkdirSync(ACQUISITION_ROOT, { mode: 0o700 });
  }
  assertCanonicalAbsolute(ACQUISITION_ROOT, "acquisition root");
  const stats = lstatSync(ACQUISITION_ROOT);
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    stats.uid !== 0 ||
    stats.gid !== 0 ||
    mode(stats) !== 0o700
  ) {
    fail("Acquisition root metadata is unsafe.");
  }
}

export function createAcquisitionDirectory(operationsCommit) {
  ensureAcquisitionRoot();
  const directory = acquisitionDirectory(operationsCommit);
  if (existsSync(directory)) fail("Acquisition directory already exists.");
  mkdirSync(directory, { mode: 0o700 });
  const stats = lstatSync(directory);
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    stats.uid !== 0 ||
    stats.gid !== 0 ||
    mode(stats) !== 0o700 ||
    readdirSync(directory).length !== 0
  ) {
    fail("New acquisition directory metadata is unsafe.");
  }
  fsyncDirectory(ACQUISITION_ROOT);
  return directory;
}

function publishOperatorInput(path, body) {
  publishNoReplaceSet(
    [
      {
        target: path,
        payload: Buffer.from(body, "utf8"),
        uid: 0,
        gid: 0,
        mode: 0o600,
        verify(target) {
          const stats = assertProtectedRegularFile(
            target,
            "operator input",
            0o600
          );
          if (!tmpfsMagic(statfsSync(target, { bigint: true }))) {
            fail("Operator input is not on tmpfs.");
          }
          if (stats.size !== Buffer.byteLength(body)) {
            fail("Operator input write length differs.");
          }
        }
      }
    ],
    { enforceMetadata: true, fsyncDirectories: true }
  );
}

function safeVariableReport(plan, sources) {
  return plan.variables.map((entry) => ({
    name: entry.name,
    scopes: entry.scopes,
    source: entry.source,
    required: entry.required,
    omissionDisablesFeature: entry.omissionDisablesFeature,
    equality: entry.equality,
    differsFrom: entry.differsFrom,
    operatorEntered: entry.operatorEntered,
    classifications: SAFE_LIVE_NAMES.includes(entry.name)
      ? classifySources(
          entry.name,
          sources.live,
          sources.dotenv,
          sources.production
        )
      : []
  }));
}

function safeReport(plan, planDigest, inputPath, inputStats, sources) {
  return {
    schemaVersion: REPORT_SCHEMA,
    operationsCommit: plan.operationsCommit,
    selectionPlan: {
      schemaVersion: plan.schemaVersion,
      sha256: planDigest
    },
    variables: safeVariableReport(plan, sources),
    decisions: plan.decisions,
    operatorEnteredNames: plan.variables
      .filter((entry) => entry.operatorEntered)
      .map((entry) => entry.name),
    redisProvider: plan.decisions.redisProvider,
    validation: "PASSED",
    temporaryInput: {
      path: inputPath,
      owner: inputStats.uid,
      group: inputStats.gid,
      mode: mode(inputStats).toString(8).padStart(4, "0"),
      linkCount: inputStats.nlink,
      fileType: "regular"
    },
    valueMaterialRecorded: false
  };
}

function renderSafeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function publishReport(path, report) {
  publishNoReplaceSet(
    [
      {
        target: path,
        payload: Buffer.from(renderSafeJson(report), "utf8"),
        uid: 0,
        gid: 0,
        mode: 0o600
      }
    ],
    { enforceMetadata: true, fsyncDirectories: true }
  );
}

function parseArguments(argv) {
  const [modeName, ...rest] = argv;
  const args = {};
  for (let index = 0; index < rest.length; index += 2) {
    const name = rest[index];
    const value = rest[index + 1];
    if (!name?.startsWith("--") || value === undefined || value.startsWith("--")) {
      fail("Arguments must be explicit option/value pairs.");
    }
    const key = name.slice(2);
    if (own(args, key)) fail(`Duplicate argument rejected: ${name}`);
    args[key] = value;
  }
  return { mode: modeName, args };
}

function exactArguments(args, expected) {
  const actual = Object.keys(args).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail("Unexpected or missing command argument.");
  }
}

function readProductionSources(liveNames) {
  const dotenv = readApprovedHistoricalFile(
    HISTORICAL_DOTENV,
    HISTORICAL_DOTENV
  );
  const production = readApprovedHistoricalFile(
    HISTORICAL_DOTENV_PRODUCTION,
    HISTORICAL_DOTENV_PRODUCTION
  );
  const processIdentity = resolveLiveBcnProcess();
  const live = readLiveBcnValues(processIdentity, liveNames);
  return { dotenv, production, live, processIdentity };
}

function valueFreeInspection(names, sources) {
  return {
    authority: "value-free-explicit-source-classification",
    liveProcess: {
      pm2Application: LIVE_APPLICATION_NAME,
      status: "online",
      applicationPid: sources.processIdentity.applicationPid,
      nextPid: sources.processIdentity.nextPid,
      port: LIVE_PORT,
      listenerOwner: "verified-next-process"
    },
    variables: ordinal(names).map((name) => ({
      name,
      classifications: classifySources(
        name,
        sources.live,
        sources.dotenv,
        sources.production
      )
    })),
    valuesPrinted: false
  };
}

function verifyInputFile(plan, inputPath) {
  const expected = join(acquisitionDirectory(plan.operationsCommit), "operator-input.env");
  if (inputPath !== expected) fail("Operator input path is not invocation-owned.");
  const stats = assertProtectedRegularFile(inputPath, "operator input", 0o600);
  if (!tmpfsMagic(statfsSync(inputPath, { bigint: true }))) {
    fail("Operator input is not on /run tmpfs.");
  }
  const source = readFileSync(inputPath, "utf8");
  const values = parseDotEnvSource(source, inputPath);
  const selected = new Set(
    plan.variables
      .filter((entry) => entry.source !== "OMIT")
      .map((entry) => entry.name)
  );
  const actual = new Set(Object.keys(values));
  if (
    selected.size !== actual.size ||
    [...selected].some((name) => !actual.has(name))
  ) {
    fail("Operator input names differ from the approved plan.");
  }
  const prepared = prepareSanitizedEnvironment(values);
  if (prepared.issues.length) {
    fail(
      `Operator input readiness failed: ${ordinal(
        prepared.issues.flatMap((issue) => issue.names ?? [])
      ).join(",")}`
    );
  }
  return { stats, names: ordinal(actual) };
}

function runInspect() {
  const names = [...SAFE_LIVE_NAMES];
  const sources = readProductionSources(names);
  process.stdout.write(renderSafeJson(valueFreeInspection(names, sources)));
}

function runAcquire(planRecord) {
  const plan = planRecord.plan;
  const liveNames = plan.variables
    .filter((entry) => entry.source === "LIVE_BCN_PROCESS")
    .map((entry) => entry.name);
  const sources = readProductionSources(liveNames);
  const values = assembleSelectedValues(plan, sources);
  const body = renderOperatorInput(values);
  const directory = createAcquisitionDirectory(plan.operationsCommit);
  const inputPath = join(directory, "operator-input.env");
  publishOperatorInput(inputPath, body);
  const verification = verifyInputFile(plan, inputPath);
  const report = safeReport(
    plan,
    planRecord.identity,
    inputPath,
    verification.stats,
    sources
  );
  publishReport(acquisitionReportPath(plan.operationsCommit), report);
  process.stdout.write(
    `ACQUISITION_PASSED names=${verification.names.join(",")} input=${inputPath}\n`
  );
}

function runDestroy(plan, args) {
  if (
    args["publication-status"] !== "VERIFIED" ||
    args["preflight-status"] !== "PASSED"
  ) {
    fail("Input destruction requires conclusive publication and preflight success.");
  }
  const directory = acquisitionDirectory(plan.operationsCommit);
  const inputPath = join(directory, "operator-input.env");
  verifyInputFile(plan, inputPath);
  const readiness = readProtectedReadiness();
  if (!readiness.ready || readiness.issues.length) {
    fail("Protected environment readiness is not conclusively verified.");
  }
  if (readdirSync(directory).join("\0") !== "operator-input.env") {
    fail("Acquisition directory contains unexpected evidence.");
  }
  unlinkSync(inputPath);
  fsyncDirectory(directory);
  rmdirSync(directory);
  fsyncDirectory(ACQUISITION_ROOT);
  if (existsSync(inputPath) || existsSync(directory)) {
    fail("Temporary acquisition objects remain after unlink.");
  }
  process.stdout.write(
    "DESTROY_INPUT_PASSED tmpfs-file-unlinked=true secure-erasure-claimed=false\n"
  );
}

export function runCli(argv = process.argv.slice(2)) {
  const parsed = parseArguments(argv);
  if (
    ![
      "inspect",
      "validate-plan",
      "acquire",
      "verify-input",
      "destroy-input",
      "correct-plan",
      "carry-forward-plan"
    ].includes(parsed.mode)
  ) {
    fail(
      "Mode must be inspect, validate-plan, acquire, verify-input, destroy-input, correct-plan, or carry-forward-plan."
    );
  }
  const expectedArgs =
    parsed.mode === "correct-plan"
      ? [
          "prior-operations-commit",
          "prior-plan-sha256",
          "operations-commit",
          "correction"
        ]
      : parsed.mode === "carry-forward-plan"
      ? [
          "prior-operations-commit",
          "prior-plan-sha256",
          "operations-commit",
          "carry-forward"
        ]
      : parsed.mode === "destroy-input"
      ? ["plan", "operations-commit", "publication-status", "preflight-status"]
      : ["plan", "operations-commit"];
  exactArguments(parsed.args, expectedArgs);
  if (process.platform !== "linux" || process.getuid?.() !== 0) {
    fail("Production acquisition modes require Linux root.");
  }
  if (parsed.mode === "correct-plan") {
    const result = publishCorrectedSelectionPlan({
      priorOperationsCommit: parsed.args["prior-operations-commit"],
      priorPlanSha256: parsed.args["prior-plan-sha256"],
      operationsCommit: parsed.args["operations-commit"],
      correction: parsed.args.correction
    });
    process.stdout.write(
      `PLAN_CORRECTED prior=${result.priorPlanIdentity} corrected=${result.correctedPlanIdentity} values-recorded=false\n`
    );
    return;
  }
  if (parsed.mode === "carry-forward-plan") {
    const result = publishCarriedForwardSelectionPlan({
      priorOperationsCommit: parsed.args["prior-operations-commit"],
      priorPlanSha256: parsed.args["prior-plan-sha256"],
      operationsCommit: parsed.args["operations-commit"],
      carryForward: parsed.args["carry-forward"]
    });
    process.stdout.write(
      `PLAN_CARRIED_FORWARD prior=${result.priorPlanIdentity} carried-forward=${result.carriedForwardPlanIdentity} semantic-delta=${result.semanticDelta} values-recorded=false\n`
    );
    return;
  }
  const operationsCommit = parsed.args["operations-commit"];
  const planRecord = readSelectionPlan(parsed.args.plan, {
    expectedOperationsCommit: operationsCommit
  });
  switch (parsed.mode) {
    case "validate-plan":
      process.stdout.write(
        `PLAN_VALID names=${planRecord.plan.variables
          .map((entry) => entry.name)
          .join(",")} values-recorded=false\n`
      );
      return;
    case "inspect":
      runInspect();
      return;
    case "acquire":
      runAcquire(planRecord);
      return;
    case "verify-input": {
      const inputPath = join(
        acquisitionDirectory(operationsCommit),
        "operator-input.env"
      );
      const result = verifyInputFile(planRecord.plan, inputPath);
      process.stdout.write(
        `INPUT_VALID names=${result.names.join(",")} values-recorded=false\n`
      );
      return;
    }
    case "destroy-input":
      runDestroy(planRecord.plan, parsed.args);
      return;
    default:
      fail("Unreachable acquisition mode.");
  }
}

export const __test = Object.freeze({
  parseArguments,
  exactArguments,
  publishOperatorInput,
  verifyInputFile,
  tmpfsMagic,
  sensitiveOperatorName,
  safeReport,
  renderSafeJson
});

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}
