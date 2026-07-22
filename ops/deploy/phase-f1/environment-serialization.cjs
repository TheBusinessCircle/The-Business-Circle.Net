/* eslint-disable @typescript-eslint/no-require-imports -- installed Node CommonJS helper */
const { readFileSync } = require("node:fs");
const { parseEnv } = require("node:util");

function isPlaceholder(value) {
  const normalized = value.trim().toLowerCase();
  return /^(?:changeme|change-me|placeholder|todo|replace-with(?:[-_].+)?|your_real_.+)$/.test(normalized) ||
    /^<[^>]+>$/.test(normalized);
}

function parseDotEnvSource(source, label) {
  const counts = new Map();
  for (const rawLine of source.split(/\r?\n/)) {
    const match = rawLine.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([key]) => key).sort();
  if (duplicates.length) throw new Error(`Duplicate variables in ${label}: ${duplicates.join(", ")}`);
  try {
    return parseEnv(source);
  } catch {
    throw new Error(`Environment source could not be parsed safely: ${label}`);
  }
}

function readDotEnvFile(path) {
  return parseDotEnvSource(readFileSync(path, "utf8"), path);
}

function selectValue(key, sources, overrides) {
  const values = sources.flatMap((source) => Object.hasOwn(source, key) ? [source[key]] : []);
  if (Object.hasOwn(overrides, key)) {
    return overrides[key];
  }
  if (!values.length) return undefined;
  if (new Set(values).size > 1) throw new Error(`Conflicting populated source values: ${key}`);
  return values[0];
}

function buildEnvironment(keys, required, sources, overrides = {}) {
  const result = {};
  for (const key of [...new Set(keys)].sort()) {
    const selected = selectValue(key, sources, overrides);
    if (selected !== undefined && selected !== "") {
      if (isPlaceholder(selected)) throw new Error(`Placeholder value rejected: ${key}`);
      result[key] = selected;
    }
  }
  const emptyRequired = required.filter((key) => !result[key]).sort();
  return { result, emptyRequired };
}

function renderEnvironmentJson(values) {
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string" || /[\r\n\0]/.test(value)) {
      throw new Error(`Multiline, control or non-string value requires secure manual resolution: ${key}`);
    }
  }
  const ordered = Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)));
  const serialized = JSON.stringify(ordered, null, 2) + "\n";
  const roundTrip = JSON.parse(serialized);
  for (const [key, value] of Object.entries(ordered)) {
    if (roundTrip[key] !== value) throw new Error(`Generated environment did not round-trip: ${key}`);
  }
  return serialized;
}

module.exports = {
  buildEnvironment,
  isPlaceholder,
  parseDotEnvSource,
  readDotEnvFile,
  renderEnvironmentJson,
  selectValue
};
