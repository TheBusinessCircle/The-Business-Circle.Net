import {
  chmodSync,
  copyFileSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { dirname, basename, join } from "node:path";

function readAssignment(line: string) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  return match?.[1] ?? null;
}

export function readEnvironmentValues(content: string) {
  const values: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const key = readAssignment(line);
    if (!key || Object.hasOwn(values, key)) continue;
    const separator = line.indexOf("=");
    values[key] = line
      .slice(separator + 1)
      .trim()
      .replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_match, doubleQuoted, singleQuoted) =>
        doubleQuoted ?? singleQuoted ?? ""
      );
  }
  return values;
}

function quoteEnvironmentValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function updateEnvironmentFileContent(
  content: string,
  updates: Readonly<Record<string, string>>
) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const hadTrailingNewline = content.endsWith("\n");
  const lines = content.split(/\r?\n/);
  if (hadTrailingNewline) lines.pop();
  const written = new Set<string>();
  const nextLines: string[] = [];

  for (const line of lines) {
    const key = readAssignment(line);
    if (!key || !Object.hasOwn(updates, key)) {
      nextLines.push(line);
      continue;
    }
    if (written.has(key)) continue;
    nextLines.push(`${key}=${quoteEnvironmentValue(updates[key])}`);
    written.add(key);
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!written.has(key)) nextLines.push(`${key}=${quoteEnvironmentValue(value)}`);
  }

  return `${nextLines.join(newline)}${hadTrailingNewline ? newline : ""}`;
}

function safeChmod600(path: string) {
  try {
    chmodSync(path, 0o600);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code !== "ENOSYS" && code !== "EPERM") throw error;
  }
}

function timestampForFile(date: Date) {
  return date.toISOString().replace(/[-:.]/g, "");
}

export function updateEnvironmentFileSafely(
  environmentPath: string,
  updates: Readonly<Record<string, string>>,
  now = new Date()
) {
  const original = readFileSync(environmentPath, "utf8");
  const updated = updateEnvironmentFileContent(original, updates);
  if (updated === original) {
    safeChmod600(environmentPath);
    return { changed: false, backupPath: null as string | null };
  }

  const directory = dirname(environmentPath);
  const backupPath = join(
    directory,
    `${basename(environmentPath)}.backup-${timestampForFile(now)}`
  );
  const temporaryPath = join(
    directory,
    `.${basename(environmentPath)}.tmp-${process.pid}-${Date.now()}`
  );

  copyFileSync(environmentPath, backupPath);
  safeChmod600(backupPath);
  try {
    writeFileSync(temporaryPath, updated, { encoding: "utf8", mode: 0o600, flag: "wx" });
    safeChmod600(temporaryPath);
    renameSync(temporaryPath, environmentPath);
    safeChmod600(environmentPath);
  } catch (error) {
    try {
      unlinkSync(temporaryPath);
    } catch {
      // The temporary file may not have been created. The original and backup remain intact.
    }
    throw error;
  }

  return { changed: true, backupPath };
}
