import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  BCN_ONLY_KEYS,
  BUILD_ENV_KEYS,
  CIRCLE_CARD_ONLY_KEYS,
  CIRCLE_LIFECYCLE_KEYS,
  DELIBERATELY_UNSUPPORTED_KEYS,
  REQUIRED_BCN_KEYS,
  REQUIRED_SHARED_KEYS, REQUIRED_CIRCLE_KEYS,
  RUNTIME_VALUES,
  SHARED_KEYS,
  TOOLING_ONLY_KEYS
} = require("./environment-groups.cjs");

const jsonMode = process.argv[2] === "--json";
const files = process.argv.slice(jsonMode ? 3 : 2);
if (!files.length) {
  console.error("Usage: node report-environment.mjs [--json] <env-file> [env-file ...]");
  process.exit(1);
}

function keyOccurrences(source) {
  const counts = new Map();
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}

function placeholder(value) {
  const normalized = value.trim().toLowerCase();
  return /^(?:changeme|change-me|placeholder|todo|replace-with(?:[-_].+)?|your_real_.+)$/.test(normalized) ||
    /^<[^>]+>$/.test(normalized);
}

const parsedFiles = files.map((file) => {
  const source = readFileSync(file, "utf8");
  let values;
  try {
    values = parseEnv(source);
  } catch {
    console.error(`${file}\tFILE_PARSE_ERROR`);
    process.exit(2);
  }
  return { file, values, occurrences: keyOccurrences(source) };
});

const classifications = new Map();
for (const key of SHARED_KEYS) classifications.set(key, "shared");
for (const key of BCN_ONLY_KEYS) classifications.set(key, "bcn-only");
for (const key of TOOLING_ONLY_KEYS) classifications.set(key, "tooling-only-not-runtime");
for (const key of CIRCLE_CARD_ONLY_KEYS) classifications.set(key, "circle-card-only");
for (const key of CIRCLE_LIFECYCLE_KEYS) classifications.set(key, "circle-and-bcn-lifecycle");
for (const key of BUILD_ENV_KEYS) {
  if (!classifications.has(key)) classifications.set(key, "build-only");
}
for (const key of DELIBERATELY_UNSUPPORTED_KEYS) classifications.set(key, "deliberately-unsupported");
for (const key of new Set(Object.values(RUNTIME_VALUES).flatMap((values) => Object.keys(values)))) {
  classifications.set(key, "runtime-fixed");
}

const sourceKeys = new Set(parsedFiles.flatMap(({ values }) => Object.keys(values)));
const keys = [...new Set([...classifications.keys(), ...sourceKeys])].sort();
const variables = keys.map((key) => {
  const present = parsedFiles.filter(({ values }) => Object.hasOwn(values, key));
  const values = present.map(({ values }) => values[key]);
  const duplicate = parsedFiles.some(({ occurrences }) => (occurrences.get(key) ?? 0) > 1);
  const conflict = new Set(values).size > 1;
  const hasPlaceholder = values.some(placeholder);
  const empty = present.length > 0 && values.every((value) => value === "");
  const required = REQUIRED_SHARED_KEYS.includes(key) || REQUIRED_BCN_KEYS.includes(key) || REQUIRED_CIRCLE_KEYS.includes(key);
  const classification = classifications.get(key) ?? "unknown";
  const status = classification === "unknown"
    ? "UNKNOWN_SOURCE_NAME"
    : classification === "runtime-fixed"
      ? present.length ? "IGNORED_RUNTIME_FIXED" : "absent"
      : classification === "deliberately-unsupported"
        ? present.length ? "UNSUPPORTED_PRESENT" : "absent"
    : duplicate
      ? "DUPLICATE"
      : conflict
        ? "CONFLICT"
        : hasPlaceholder
          ? "PLACEHOLDER"
          : empty
            ? required ? "EMPTY_REQUIRED" : "empty"
            : !present.length
              ? required ? "ABSENT_REQUIRED" : "absent"
              : "present";
  return { name: key, classification, status, locations: present.map(({ file }) => file) };
});
const blockingStatuses = new Set([
  "UNKNOWN_SOURCE_NAME", "DUPLICATE", "CONFLICT", "PLACEHOLDER", "EMPTY_REQUIRED", "ABSENT_REQUIRED"
]);
const report = { ready: variables.every(({ status }) => !blockingStatuses.has(status)), variables };
if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("Environment report (names and status only; values are never printed)");
  for (const item of variables) {
    console.log(`${item.name}\t${item.classification}\t${item.status}\t${item.locations.join(",") || "-"}`);
  }
  console.log(`MACHINE_READINESS\t${report.ready ? "READY" : "BLOCKED"}`);
}
