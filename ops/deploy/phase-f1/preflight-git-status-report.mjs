import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROTECTED_BACKUP_DENIAL_CODE,
  isProtectedBackupSelector
} from "./protected-source-policy.mjs";
import { validateGitStatusReportOutput } from "./value-free-report-contract.mjs";

export const GIT_STATUS_SCHEMA = "phase-f1-git-status-report-v1";

function statusPaths(input) {
  if (!Buffer.isBuffer(input)) throw new Error("GIT_STATUS_INPUT_ERROR");
  const fields = input.toString("utf8").split("\0").filter(Boolean);
  const paths = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (field.length < 4 || field[2] !== " ") {
      throw new Error("GIT_STATUS_INPUT_ERROR");
    }
    const status = field.slice(0, 2);
    paths.push(field.slice(3));
    if (status.includes("R") || status.includes("C")) {
      index += 1;
      if (index >= fields.length) throw new Error("GIT_STATUS_INPUT_ERROR");
      paths.push(fields[index]);
    }
  }
  return paths;
}

export function summarizeGitStatus(input) {
  const paths = statusPaths(input);
  const protectedSourceDenied = paths.some(isProtectedBackupSelector);
  paths.fill("");
  return validateGitStatusReportOutput({
    schemaVersion: GIT_STATUS_SCHEMA,
    state: protectedSourceDenied ? "BLOCKED" : input.length ? "DIRTY" : "CLEAN",
    issues: protectedSourceDenied
      ? [PROTECTED_BACKUP_DENIAL_CODE]
      : input.length
        ? ["UNCOMMITTED_CHANGE_PRESENT"]
        : []
  });
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  let input = Buffer.concat(chunks);
  try {
    const report = summarizeGitStatus(input);
    input.fill(0);
    input = Buffer.alloc(0);
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } catch {
    input.fill(0);
    input = Buffer.alloc(0);
    process.stderr.write("GIT_STATUS_REPORT_ERROR\n");
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
