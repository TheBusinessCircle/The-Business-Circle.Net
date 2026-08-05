import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const EXPECTED_PM2_APPLICATION = "businesscircle";
export const SAFE_PM2_OUTPUT_KEYS = Object.freeze(["name", "pid", "status"]);

export class SafePm2ReportError extends Error {
  constructor(code) {
    super(code);
    this.name = "SafePm2ReportError";
    this.code = code;
  }
}

function exactOutputKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SafePm2ReportError("PM2_REPORT_SCHEMA_ERROR");
  }
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...SAFE_PM2_OUTPUT_KEYS].sort())) {
    throw new SafePm2ReportError("PM2_REPORT_SCHEMA_ERROR");
  }
}

export function validateSafePm2Output(value) {
  exactOutputKeys(value);
  if (
    value.name !== EXPECTED_PM2_APPLICATION ||
    !Number.isSafeInteger(value.pid) ||
    value.pid <= 0 ||
    !["online", "stopped", "errored", "launching", "stopping"].includes(
      value.status
    )
  ) {
    throw new SafePm2ReportError("PM2_REPORT_SCHEMA_ERROR");
  }
  return value;
}

export function normalizePm2Input(input) {
  let records;
  try {
    records = JSON.parse(input);
  } catch {
    throw new SafePm2ReportError("PM2_REPORT_PARSE_ERROR");
  }
  if (!Array.isArray(records)) {
    throw new SafePm2ReportError("PM2_REPORT_SCHEMA_ERROR");
  }
  const matches = records.filter(
    (record) => record && record.name === EXPECTED_PM2_APPLICATION
  );
  if (matches.length !== 1) {
    throw new SafePm2ReportError(
      matches.length ? "PM2_REPORT_AMBIGUOUS" : "PM2_REPORT_MISSING"
    );
  }
  const selected = matches[0];
  const normalized = {
    name: EXPECTED_PM2_APPLICATION,
    pid: selected.pid,
    status: selected.pm2_env?.status
  };
  records = null;
  return validateSafePm2Output(normalized);
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  let input = Buffer.concat(chunks).toString("utf8");
  try {
    const report = normalizePm2Input(input);
    input = "";
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } catch (error) {
    input = "";
    const code =
      error instanceof SafePm2ReportError
        ? error.code
        : "PM2_REPORT_INTERNAL_ERROR";
    process.stderr.write(
      `${code}\texpected=${EXPECTED_PM2_APPLICATION}\n`
    );
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
