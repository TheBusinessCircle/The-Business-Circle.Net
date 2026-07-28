import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readEnvironmentJson } from "./environment-file.mjs";

const require = createRequire(import.meta.url);
const {
  BCN_ALLOWED_KEYS,
  BUILD_ENV_KEYS,
  CIRCLE_ALLOWED_KEYS
} = require("./environment-groups.cjs");
const { validatePreparedEnvironmentSet } = require("./environment-contract.cjs");

export const PROTECTED_ENVIRONMENT_DEFINITIONS = Object.freeze({
  bcn: Object.freeze({
    file: "/etc/thebusinesscircle/bcn/runtime.env.json",
    group: "bcn-app",
    allowedKeys: BCN_ALLOWED_KEYS
  }),
  circleCard: Object.freeze({
    file: "/etc/thebusinesscircle/circle-card/runtime.env.json",
    group: "circle-card-app",
    allowedKeys: CIRCLE_ALLOWED_KEYS
  }),
  build: Object.freeze({
    file: "/etc/thebusinesscircle/build/build.env.json",
    group: "phase-f1-build",
    allowedKeys: BUILD_ENV_KEYS
  })
});

export function evaluateProtectedReadiness(values) {
  const issues = validatePreparedEnvironmentSet(values);
  return {
    authority: "protected-json",
    ready: issues.length === 0,
    issues
  };
}

export function readProtectedReadiness(
  definitions = PROTECTED_ENVIRONMENT_DEFINITIONS
) {
  const values = {};
  const sourceIssues = [];
  for (const [scope, definition] of Object.entries(definitions)) {
    try {
      values[scope] = readEnvironmentJson(definition.file, {
        allowedKeys: definition.allowedKeys,
        expectedGroup: definition.group,
        requiredKeys: []
      });
    } catch {
      values[scope] = {};
      sourceIssues.push({
        code: "protected-source-unavailable-or-unsafe",
        scope,
        names: []
      });
    }
  }
  const report = evaluateProtectedReadiness(values);
  return {
    ...report,
    issues: [...sourceIssues, ...report.issues]
  };
}

function safeIssue(issue) {
  const result = { code: issue.code };
  if (issue.scope) result.scope = issue.scope;
  if (issue.names) result.names = [...issue.names].sort();
  if (issue.alternatives) {
    result.alternatives = issue.alternatives.map((names) => [...names].sort());
  }
  return result;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const json = process.argv.includes("--json");
  const report = readProtectedReadiness();
  const safeReport = {
    authority: report.authority,
    ready: report.ready && report.issues.length === 0,
    issues: report.issues.map(safeIssue)
  };
  if (json) {
    process.stdout.write(`${JSON.stringify(safeReport, null, 2)}\n`);
  } else {
    process.stdout.write(
      "Authoritative protected environment report (names and status only; values are never printed)\n"
    );
    for (const issue of safeReport.issues) {
      process.stdout.write(
        `${issue.scope ?? "shared"}\t${issue.code}\t${
          issue.names?.join(",") || "provider-pair"
        }\n`
      );
    }
    process.stdout.write(
      `MACHINE_READINESS\t${safeReport.ready ? "READY" : "BLOCKED"}\n`
    );
  }
}
