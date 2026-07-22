import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";

export function groupId(group) {
  const record = execFileSync("/usr/bin/getent", ["group", group], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
  const fields = record.split(":");
  if (fields.length < 3 || !/^\d+$/.test(fields[2])) {
    throw new Error(`Required group is unavailable: ${group}`);
  }
  return Number(fields[2]);
}

export function assertProtectedRegularFile(filePath, expectedGroup, expectedMode = 0o640) {
  const stats = lstatSync(filePath);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`Protected path must be a regular non-symlink file: ${filePath}`);
  }
  if (realpathSync(filePath) !== filePath) {
    throw new Error(`Protected path is not canonical: ${filePath}`);
  }
  if (stats.uid !== 0 || stats.gid !== groupId(expectedGroup)) {
    throw new Error(`Protected file ownership is invalid: ${filePath}`);
  }
  if ((stats.mode & 0o777) !== expectedMode) {
    throw new Error(`Protected file mode is invalid: ${filePath}`);
  }
}

export function isPlaceholder(value) {
  const normalized = value.trim().toLowerCase();
  return /^(?:changeme|change-me|placeholder|todo|replace-with(?:[-_].+)?|your_real_.+)$/.test(normalized) ||
    /^<[^>]+>$/.test(normalized);
}

export function parseEnvironmentJson(source, label = "environment") {
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${label} must be a JSON object.`);
  }

  const result = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key) || typeof value !== "string") {
      throw new Error(`${label} contains an invalid name or non-string value: ${key}`);
    }
    if (/[\r\n\0]/.test(value)) {
      throw new Error(`${label} contains a multiline/control value: ${key}`);
    }
    result[key] = value;
  }
  return result;
}

export function readEnvironmentJson(filePath, options = {}) {
  const {
    allowedKeys,
    requiredKeys = [],
    expectedGroup,
    rejectPlaceholders = true
  } = options;
  assertProtectedRegularFile(filePath, expectedGroup);
  const values = parseEnvironmentJson(readFileSync(filePath, "utf8"), filePath);
  const allowed = allowedKeys ? new Set(allowedKeys) : null;
  const extras = allowed ? Object.keys(values).filter((key) => !allowed.has(key)) : [];
  if (extras.length) {
    throw new Error(`Environment contains unapproved names: ${extras.sort().join(", ")}`);
  }
  const empty = requiredKeys.filter((key) => !values[key]);
  if (empty.length) {
    throw new Error(`Environment has empty required names: ${empty.sort().join(", ")}`);
  }
  if (rejectPlaceholders) {
    const placeholders = Object.entries(values)
      .filter(([, value]) => isPlaceholder(value))
      .map(([key]) => key);
    if (placeholders.length) {
      throw new Error(`Environment has placeholder names: ${placeholders.sort().join(", ")}`);
    }
  }
  return values;
}
