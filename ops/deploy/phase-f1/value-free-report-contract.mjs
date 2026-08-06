import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  BCN_ONLY_KEYS,
  BUILD_ENV_KEYS,
  CIRCLE_CARD_ONLY_KEYS,
  CIRCLE_LIFECYCLE_KEYS,
  DELIBERATELY_UNSUPPORTED_KEYS,
  LEGACY_SOURCE_CLASSIFICATIONS,
  REQUIRED_BCN_KEYS,
  REQUIRED_CIRCLE_KEYS,
  REQUIRED_SHARED_KEYS,
  RUNTIME_VALUES,
  SHARED_KEYS,
  TOOLING_ONLY_KEYS
} = require("./environment-groups.cjs");

const compareNames = (left, right) =>
  Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));

export const SYMBOLIC_SOURCE_IDENTIFIERS = Object.freeze([
  "HISTORICAL_DOTENV",
  "HISTORICAL_DOTENV_PRODUCTION",
  "LIVE_BCN_PROCESS",
  "PROTECTED_BACKUP_SOURCE"
]);
export const HISTORICAL_SOURCE_IDENTIFIERS = Object.freeze(
  SYMBOLIC_SOURCE_IDENTIFIERS.slice(0, 2)
);
export const VALUE_FREE_ISSUE_CODES = Object.freeze([
  "PROTECTED_BACKUP_SOURCE_DENIED",
  "UNCOMMITTED_CHANGE_PRESENT"
]);

const classifications = new Map();
for (const name of SHARED_KEYS) classifications.set(name, "shared");
for (const name of BCN_ONLY_KEYS) classifications.set(name, "bcn-only");
for (const name of CIRCLE_CARD_ONLY_KEYS) {
  classifications.set(name, "circle-card-only");
}
for (const name of CIRCLE_LIFECYCLE_KEYS) {
  classifications.set(name, "circle-and-bcn-lifecycle");
}
for (const name of BUILD_ENV_KEYS) {
  if (!classifications.has(name)) classifications.set(name, "build-only");
}
for (const name of TOOLING_ONLY_KEYS) {
  classifications.set(name, "tooling-only-not-runtime");
}
for (const name of DELIBERATELY_UNSUPPORTED_KEYS) {
  classifications.set(name, "deliberately-unsupported");
}
for (const [name, classification] of Object.entries(
  LEGACY_SOURCE_CLASSIFICATIONS
)) {
  classifications.set(name, classification);
}
for (const name of new Set(
  Object.values(RUNTIME_VALUES).flatMap((values) => Object.keys(values))
)) {
  classifications.set(name, "runtime-fixed");
}

const excludedClassifications = new Set([
  "tooling-only-not-runtime",
  "deliberately-unsupported",
  "runtime-fixed",
  ...new Set(Object.values(LEGACY_SOURCE_CLASSIFICATIONS))
]);

export const VALUE_INSPECTION_ALLOWLIST = Object.freeze(
  [...classifications]
    .filter(([, classification]) => !excludedClassifications.has(classification))
    .map(([name]) => name)
    .sort(compareNames)
);

export const RECOGNIZED_EXCLUDED_NAMES = Object.freeze(
  [...classifications]
    .filter(([, classification]) => excludedClassifications.has(classification))
    .map(([name]) => name)
    .sort(compareNames)
);

export const RECOGNIZED_SOURCE_NAMES = Object.freeze(
  [...classifications.keys()].sort(compareNames)
);

export const REQUIRED_LEGACY_REPORT_NAMES = Object.freeze(
  [...new Set([
    ...REQUIRED_SHARED_KEYS,
    ...REQUIRED_BCN_KEYS,
    ...REQUIRED_CIRCLE_KEYS
  ])].sort(compareNames)
);

const allowedVariableKeys = Object.freeze([
  "classification",
  "locations",
  "name",
  "status"
]);
const allowedReportKeys = Object.freeze([
  "authoritativeForMachineReadiness",
  "authority",
  "reviewRequired",
  "unknownSourceNameCount",
  "variables"
]);
const allowedGitStatusKeys = Object.freeze([
  "issues",
  "schemaVersion",
  "state"
]);
const allowedStatuses = new Set([
  "ABSENT_REQUIRED",
  "CONFLICT",
  "DUPLICATE",
  "DUPLICATE_NAME_ONLY",
  "EMPTY_REQUIRED",
  "PLACEHOLDER",
  "PRESENT_NAME_ONLY",
  "absent",
  "empty",
  "present"
]);
const allowedClassifications = new Set(classifications.values());

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort(compareNames);
  const approved = [...expected].sort(compareNames);
  if (JSON.stringify(actual) !== JSON.stringify(approved)) {
    throw new Error(`${label} contains an unexpected field.`);
  }
}

export function sourceClassification(name) {
  return classifications.get(name) ?? null;
}

export function isValueInspectableName(name) {
  return VALUE_INSPECTION_ALLOWLIST.includes(name);
}

export function isRecognizedExcludedName(name) {
  return RECOGNIZED_EXCLUDED_NAMES.includes(name);
}

export function validateLegacyReportOutput(report) {
  exactKeys(report, allowedReportKeys, "Legacy report");
  if (
    report.authority !== "legacy-source-names-only" ||
    report.authoritativeForMachineReadiness !== false ||
    typeof report.reviewRequired !== "boolean" ||
    !Number.isSafeInteger(report.unknownSourceNameCount) ||
    report.unknownSourceNameCount < 0 ||
    !Array.isArray(report.variables)
  ) {
    throw new Error("Legacy report schema validation failed.");
  }
  for (const item of report.variables) {
    exactKeys(item, allowedVariableKeys, "Legacy report variable");
    if (
      typeof item.name !== "string" ||
      !classifications.has(item.name) ||
      typeof item.classification !== "string" ||
      item.classification !== classifications.get(item.name) ||
      typeof item.status !== "string" ||
      !allowedStatuses.has(item.status) ||
      !Array.isArray(item.locations) ||
      item.locations.some(
        (location) => !HISTORICAL_SOURCE_IDENTIFIERS.includes(location)
      ) ||
      !allowedClassifications.has(item.classification)
    ) {
      throw new Error("Legacy report variable schema validation failed.");
    }
  }
  return report;
}

export function validateGitStatusReportOutput(report) {
  exactKeys(report, allowedGitStatusKeys, "Git status report");
  if (
    report.schemaVersion !== "phase-f1-git-status-report-v1" ||
    !["BLOCKED", "CLEAN", "DIRTY"].includes(report.state) ||
    !Array.isArray(report.issues) ||
    report.issues.some((issue) => !VALUE_FREE_ISSUE_CODES.includes(issue)) ||
    new Set(report.issues).size !== report.issues.length ||
    (report.state === "CLEAN" && report.issues.length !== 0) ||
    (report.state === "DIRTY" &&
      JSON.stringify(report.issues) !==
        JSON.stringify(["UNCOMMITTED_CHANGE_PRESENT"])) ||
    (report.state === "BLOCKED" &&
      JSON.stringify(report.issues) !==
        JSON.stringify(["PROTECTED_BACKUP_SOURCE_DENIED"]))
  ) {
    throw new Error("Git status report schema validation failed.");
  }
  return report;
}

export const VALUE_FREE_REPORT_SCHEMA = Object.freeze({
  gitStatusKeys: allowedGitStatusKeys,
  reportKeys: allowedReportKeys,
  variableKeys: allowedVariableKeys
});
