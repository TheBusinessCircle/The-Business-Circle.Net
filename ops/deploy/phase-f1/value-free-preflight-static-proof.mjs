import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VALUE_FREE_SOURCE_PATHS = Object.freeze({
  contract: "ops/deploy/phase-f1/value-free-report-contract.mjs",
  pm2: "ops/deploy/phase-f1/preflight-pm2-report.mjs",
  preflight: "ops/deploy/phase-f1/preflight-read-only.sh",
  reporter: "ops/deploy/phase-f1/report-environment.mjs"
});

function requireSource(source, pattern, label) {
  if (!pattern.test(source)) throw new Error(`STATIC_PROOF_MISSING_${label}`);
}

function rejectSource(source, pattern, label) {
  if (pattern.test(source)) throw new Error(`STATIC_PROOF_FORBIDDEN_${label}`);
}

export function proveValueFreePreflightSources(sources) {
  const { contract, pm2, preflight, reporter } = sources;
  for (const [name, source] of Object.entries(sources)) {
    if (typeof source !== "string" || !source) {
      throw new Error(`STATIC_PROOF_SOURCE_MISSING_${name}`);
    }
  }

  requireSource(
    contract,
    /export const VALUE_INSPECTION_ALLOWLIST/u,
    "CANONICAL_ALLOWLIST"
  );
  requireSource(
    contract,
    /export function validateLegacyReportOutput/u,
    "CLOSED_OUTPUT_VALIDATOR"
  );
  requireSource(contract, /exactKeys\(/u, "EXACT_OUTPUT_KEYS");

  requireSource(
    reporter,
    /for \(const name of VALUE_INSPECTION_ALLOWLIST\)/u,
    "ALLOWLIST_PROJECTION"
  );
  requireSource(
    reporter,
    /projectAllowlistedValues\(parsed\)/u,
    "IMMEDIATE_PROJECTION"
  );
  requireSource(
    reporter,
    /validateLegacyReportOutput\(/u,
    "OUTPUT_VALIDATION"
  );
  rejectSource(reporter, /\bsourceKeys\b/u, "DYNAMIC_SOURCE_KEYS");
  rejectSource(
    reporter,
    /Object\.(?:keys|entries|values)\(parsed\)/u,
    "PARSED_NAME_ENUMERATION"
  );
  rejectSource(
    reporter,
    /unknown[^\n]*(?:values?\.|\.get\(|placeholder|conflict|empty)/iu,
    "UNKNOWN_VALUE_INSPECTION"
  );
  rejectSource(
    reporter,
    /(?:stdout|stderr|console\.(?:log|error))[^\n]*(?:source|parsed)/u,
    "RAW_DOTENV_OUTPUT"
  );

  requireSource(pm2, /SAFE_PM2_OUTPUT_KEYS/u, "SAFE_PM2_SCHEMA");
  requireSource(pm2, /validateSafePm2Output/u, "SAFE_PM2_VALIDATOR");
  requireSource(pm2, /records = null/u, "RAW_PM2_DISCARD");
  rejectSource(pm2, /pm2_env\s*(?:\.|\[)\s*(?:args|argv)/u, "PM2_ARGS");
  rejectSource(
    pm2,
    /(?:selected|record|pm2_env)\s*(?:\.|\[[^\]]+\])\s*(?:argv|cmdline|commandLine)/u,
    "ALTERNATE_ARGUMENTS"
  );
  rejectSource(
    pm2,
    /(?:stdout|stderr|console\.(?:log|error))[^\n]*(?:input|records|selected)/u,
    "RAW_PM2_OUTPUT"
  );
  rejectSource(pm2, /writeFile|appendFile|createWriteStream/u, "RAW_PM2_STORAGE");

  requireSource(
    preflight,
    /pm2 jlist \| node "\$\{PACK_DIR\}\/preflight-pm2-report\.mjs"/u,
    "PM2_PIPE"
  );
  rejectSource(preflight, /args\s*:\s*env\.args/u, "PREFLIGHT_PM2_ARGS");
  rejectSource(preflight, /JSON\.parse\(body\)/u, "INLINE_RAW_PM2_PARSER");
  return true;
}

function git(repository, args, options = {}) {
  return execFileSync("git", ["-C", repository, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
}

function committedBlob(repository, commit, path) {
  const row = git(repository, ["ls-tree", commit, "--", path]).trim();
  const match = /^(100644|100755) blob ([0-9a-f]{40,64})\t(.+)$/u.exec(row);
  if (!match || match[3] !== path) {
    throw new Error(`STATIC_PROOF_NOT_REGULAR_BLOB:${path}`);
  }
  return git(repository, ["cat-file", "blob", match[2]]);
}

export function proveValueFreePreflightCommit(root, revision) {
  const repository = realpathSync(resolve(root));
  const commit = git(repository, ["rev-parse", "--verify", `${revision}^{commit}`]).trim();
  const sources = Object.fromEntries(
    Object.entries(VALUE_FREE_SOURCE_PATHS).map(([name, path]) => [
      name,
      committedBlob(repository, commit, path)
    ])
  );
  proveValueFreePreflightSources(sources);
  return { commit, paths: VALUE_FREE_SOURCE_PATHS };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [root = process.cwd(), revision = "HEAD"] = process.argv.slice(2);
  const result = proveValueFreePreflightCommit(root, revision);
  process.stdout.write(
    `${JSON.stringify({
      schemaVersion: "phase-f1-value-free-preflight-static-proof-v1",
      commit: result.commit,
      paths: result.paths,
      result: "PASS"
    })}\n`
  );
}
