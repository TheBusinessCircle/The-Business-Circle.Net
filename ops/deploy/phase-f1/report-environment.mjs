import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { parseEnv } from "node:util";
import {
  RECOGNIZED_EXCLUDED_NAMES,
  RECOGNIZED_SOURCE_NAMES,
  REQUIRED_LEGACY_REPORT_NAMES,
  VALUE_INSPECTION_ALLOWLIST,
  isRecognizedExcludedName,
  isValueInspectableName,
  sourceClassification,
  validateLegacyReportOutput
} from "./value-free-report-contract.mjs";

export const APPROVED_HISTORICAL_SOURCE_PATHS = Object.freeze([
  "/var/www/The-Business-Circle.Net/.env",
  "/var/www/The-Business-Circle.Net/.env.production"
]);
export const PROHIBITED_BACKUP_PATH =
  "/var/www/The-Business-Circle.Net/.env.backup-20260720-164833";

const requiredNames = new Set(REQUIRED_LEGACY_REPORT_NAMES);
const recognizedNames = new Set(RECOGNIZED_SOURCE_NAMES);

function compareNames(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function namesOnlyOccurrences(source) {
  const counts = new Map();
  for (const rawLine of source.split(/\r?\n/u)) {
    if (/^\s*(?:#|$)/u.test(rawLine)) continue;
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/u.exec(
      rawLine
    );
    if (match) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}

function placeholder(value) {
  const normalized = value.trim().toLowerCase();
  return (
    /^(?:changeme|change-me|placeholder|todo|replace-with(?:[-_].+)?|your_real_.+)$/u.test(
      normalized
    ) || /^<[^>]+>$/u.test(normalized)
  );
}

function projectAllowlistedValues(parsed) {
  const projected = new Map();
  for (const name of VALUE_INSPECTION_ALLOWLIST) {
    if (Object.hasOwn(parsed, name)) projected.set(name, parsed[name]);
  }
  return projected;
}

function parseSource({ sourceId, source }) {
  if (typeof sourceId !== "string" || typeof source !== "string") {
    throw new Error("LEGACY_SOURCE_INPUT_ERROR");
  }
  let parsed;
  try {
    parsed = parseEnv(source);
  } catch {
    throw new Error(`LEGACY_SOURCE_PARSE_ERROR:${sourceId}`);
  }
  const values = projectAllowlistedValues(parsed);
  parsed = null;
  return {
    sourceId,
    values,
    occurrences: namesOnlyOccurrences(source)
  };
}

function inspectableVariable(name, parsedSources) {
  const present = parsedSources.filter(({ values }) => values.has(name));
  const selectedValues = present.map(({ values }) => values.get(name));
  const duplicate = parsedSources.some(
    ({ occurrences }) => (occurrences.get(name) ?? 0) > 1
  );
  const conflict = new Set(selectedValues).size > 1;
  const hasPlaceholder = selectedValues.some(placeholder);
  const empty =
    present.length > 0 && selectedValues.every((value) => value === "");
  const required = requiredNames.has(name);
  const status = duplicate
    ? "DUPLICATE"
    : conflict
      ? "CONFLICT"
      : hasPlaceholder
        ? "PLACEHOLDER"
        : empty
          ? required
            ? "EMPTY_REQUIRED"
            : "empty"
          : !present.length
            ? required
              ? "ABSENT_REQUIRED"
              : "absent"
            : "present";
  return {
    name,
    classification: sourceClassification(name),
    status,
    locations: present.map(({ sourceId }) => sourceId)
  };
}

function excludedVariable(name, parsedSources) {
  const present = parsedSources.filter(
    ({ occurrences }) => (occurrences.get(name) ?? 0) > 0
  );
  const duplicate = parsedSources.some(
    ({ occurrences }) => (occurrences.get(name) ?? 0) > 1
  );
  return {
    name,
    classification: sourceClassification(name),
    status: duplicate
      ? "DUPLICATE_NAME_ONLY"
      : present.length
        ? "PRESENT_NAME_ONLY"
        : "absent",
    locations: present.map(({ sourceId }) => sourceId)
  };
}

export function analyseEnvironmentSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error("LEGACY_SOURCE_INPUT_ERROR");
  }
  const parsedSources = sources.map(parseSource);
  const unknownNames = new Set();
  for (const { occurrences } of parsedSources) {
    for (const name of occurrences.keys()) {
      if (!recognizedNames.has(name)) unknownNames.add(name);
    }
  }
  const variables = [
    ...VALUE_INSPECTION_ALLOWLIST.map((name) =>
      inspectableVariable(name, parsedSources)
    ),
    ...RECOGNIZED_EXCLUDED_NAMES.map((name) =>
      excludedVariable(name, parsedSources)
    )
  ].sort((left, right) => compareNames(left.name, right.name));
  const reviewStatuses = new Set([
    "CONFLICT",
    "DUPLICATE",
    "DUPLICATE_NAME_ONLY",
    "PLACEHOLDER"
  ]);
  return validateLegacyReportOutput({
    authority: "legacy-source-names-only",
    authoritativeForMachineReadiness: false,
    reviewRequired:
      unknownNames.size > 0 ||
      variables.some(({ status }) => reviewStatuses.has(status)),
    unknownSourceNameCount: unknownNames.size,
    variables
  });
}

export function renderLegacyReportText(report) {
  validateLegacyReportOutput(report);
  const lines = [
    "Legacy source report (allowlisted values inspected internally; excluded and unknown values are never inspected; values are never printed; not authoritative for machine readiness)"
  ];
  for (const item of report.variables) {
    lines.push(
      `${item.name}\t${item.classification}\t${item.status}\t${
        item.locations.join(",") || "-"
      }`
    );
  }
  lines.push(`UNKNOWN_SOURCE_NAME_COUNT\t${report.unknownSourceNameCount}`);
  lines.push(
    `LEGACY_SOURCE_REPORT\t${
      report.reviewRequired ? "REVIEW_REQUIRED" : "CATALOGUED"
    }`
  );
  return `${lines.join("\n")}\n`;
}

export function validateHistoricalSourcePaths(files) {
  if (
    !Array.isArray(files) ||
    files.length !== APPROVED_HISTORICAL_SOURCE_PATHS.length ||
    files.some((file, index) => file !== APPROVED_HISTORICAL_SOURCE_PATHS[index]) ||
    files.includes(PROHIBITED_BACKUP_PATH)
  ) {
    throw new Error("LEGACY_SOURCE_PATH_ERROR");
  }
  for (const file of files) {
    if (!isAbsolute(file) || resolve(file) !== file) {
      throw new Error("LEGACY_SOURCE_PATH_ERROR");
    }
    const stats = lstatSync(file);
    if (!stats.isFile() || stats.isSymbolicLink() || realpathSync(file) !== file) {
      throw new Error("LEGACY_SOURCE_PATH_ERROR");
    }
  }
  return files;
}

async function main() {
  const jsonMode = process.argv[2] === "--json";
  const files = process.argv.slice(jsonMode ? 3 : 2);
  try {
    validateHistoricalSourcePaths(files);
    const report = analyseEnvironmentSources(
      files.map((file) => ({ sourceId: file, source: readFileSync(file, "utf8") }))
    );
    process.stdout.write(
      jsonMode ? `${JSON.stringify(report, null, 2)}\n` : renderLegacyReportText(report)
    );
  } catch (error) {
    const code =
      error instanceof Error && /^LEGACY_SOURCE_[A-Z_]+(?::|$)/u.test(error.message)
        ? error.message.split(":", 1)[0]
        : "LEGACY_SOURCE_INTERNAL_ERROR";
    process.stderr.write(`${code}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  await main();
}

export { isRecognizedExcludedName, isValueInspectableName };
