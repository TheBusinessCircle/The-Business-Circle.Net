import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  analyseEnvironmentSources,
  APPROVED_HISTORICAL_SOURCES,
  parseApprovedSource,
  PROHIBITED_BACKUP_PATH,
  readApprovedHistoricalSources,
  renderLegacyReportText,
  validateHistoricalSourcePaths
} from "./report-environment.mjs";
import {
  GIT_STATUS_SCHEMA,
  summarizeGitStatus
} from "./preflight-git-status-report.mjs";
import {
  PROTECTED_BACKUP_DENIAL_CODE,
  PROTECTED_BACKUP_SOURCE_ID,
  isProtectedBackupSelector
} from "./protected-source-policy.mjs";
import {
  EXPECTED_PM2_APPLICATION,
  normalizePm2Input,
  validateSafePm2Output
} from "./preflight-pm2-report.mjs";
import {
  VALUE_FREE_REPORT_SCHEMA,
  VALUE_INSPECTION_ALLOWLIST,
  validateGitStatusReportOutput,
  validateLegacyReportOutput
} from "./value-free-report-contract.mjs";
import {
  VALUE_FREE_SOURCE_PATHS,
  proveValueFreePreflightCommit,
  proveValueFreePreflightSources
} from "./value-free-preflight-static-proof.mjs";

const packRoot = fileURLToPath(new URL(".", import.meta.url));
const roots = [];
const syntheticSecret = "SYNTHETIC_VALUE_DO_NOT_REPORT_4f7b";
const syntheticArgument = "SYNTHETIC_ARGUMENT_DO_NOT_REPORT_91ac";
const historicalDotenv = "HISTORICAL_DOTENV";
const historicalProduction = "HISTORICAL_DOTENV_PRODUCTION";

function temporaryRoot(prefix = "phase-f1-value-free-") {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function source(sourceId, body) {
  return { sourceId, source: body };
}

function variable(report, name) {
  return report.variables.find((item) => item.name === name);
}

function pm2Record(overrides = {}) {
  return {
    name: EXPECTED_PM2_APPLICATION,
    pid: 42420,
    pm2_env: { status: "online" },
    ...overrides
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("value-free historical environment reporting", () => {
  it("never expands the value-inspection allowlist with unknown names", () => {
    const before = [...VALUE_INSPECTION_ALLOWLIST];
    const report = analyseEnvironmentSources([
      source(historicalDotenv, `PHASE_F1_UNKNOWN=${syntheticSecret}\n`),
      source(historicalProduction, "PHASE_F1_UNKNOWN=\n")
    ]);
    assert.deepEqual(VALUE_INSPECTION_ALLOWLIST, before);
    assert.equal(report.unknownSourceNameCount, 1);
    assert.equal(variable(report, "PHASE_F1_UNKNOWN"), undefined);
    assert.equal(JSON.stringify(report).includes(syntheticSecret), false);
  });

  it("does not classify unknown values as empty, placeholder or conflicting", () => {
    const report = analyseEnvironmentSources([
      source(historicalDotenv, "UNKNOWN_ONE=placeholder\nUNKNOWN_TWO=\n"),
      source(historicalProduction, "UNKNOWN_ONE=different-synthetic\n")
    ]);
    const output = renderLegacyReportText(report);
    assert.equal(report.unknownSourceNameCount, 2);
    assert.doesNotMatch(output, /UNKNOWN_ONE|UNKNOWN_TWO/u);
    assert.doesNotMatch(output, /PHASE_F1_UNKNOWN/u);
  });

  it("classifies allowlisted conflict, match and absence correctly", () => {
    const conflict = analyseEnvironmentSources([
      source(historicalDotenv, "DATABASE_URL=synthetic-database-a\n"),
      source(historicalProduction, "DATABASE_URL=synthetic-database-b\n")
    ]);
    assert.equal(variable(conflict, "DATABASE_URL").status, "CONFLICT");
    const match = analyseEnvironmentSources([
      source(historicalDotenv, "DATABASE_URL=synthetic-database-same\n"),
      source(historicalProduction, "DATABASE_URL=synthetic-database-same\n")
    ]);
    assert.equal(variable(match, "DATABASE_URL").status, "present");
    const absent = analyseEnvironmentSources([
      source(historicalDotenv, "PHASE_F1_UNKNOWN=synthetic-only\n")
    ]);
    assert.equal(variable(absent, "DATABASE_URL").status, "ABSENT_REQUIRED");
  });

  it("reports tooling, legacy, unsupported and fixed names by name only", () => {
    const report = analyseEnvironmentSources([
      source(
        historicalDotenv,
        [
          `POSTGRES_PASSWORD=${syntheticSecret}`,
          "COMPOSE_APP_ENV_FILE=placeholder",
          "DEMO_MEMBER_PASSWORD=",
          "NODE_ENV=synthetic-development"
        ].join("\n") + "\n"
      ),
      source(
        historicalProduction,
        [
          "POSTGRES_PASSWORD=synthetic-conflict",
          "COMPOSE_APP_ENV_FILE=synthetic-conflict",
          "DEMO_MEMBER_PASSWORD=synthetic-conflict",
          "NODE_ENV=synthetic-conflict"
        ].join("\n") + "\n"
      )
    ]);
    for (const name of [
      "POSTGRES_PASSWORD",
      "COMPOSE_APP_ENV_FILE",
      "DEMO_MEMBER_PASSWORD",
      "NODE_ENV"
    ]) {
      assert.equal(variable(report, name).status, "PRESENT_NAME_ONLY");
    }
    const output = renderLegacyReportText(report);
    assert.equal(output.includes(syntheticSecret), false);
    assert.doesNotMatch(output, /placeholder|synthetic-conflict/u);
  });

  it("preserves names-only duplicate detection for excluded names", () => {
    const report = analyseEnvironmentSources([
      source(historicalDotenv, "POSTGRES_PASSWORD=one\nPOSTGRES_PASSWORD=two\n")
    ]);
    assert.equal(variable(report, "POSTGRES_PASSWORD").status, "DUPLICATE_NAME_ONLY");
  });

  it("rejects the prohibited backup path before reading it", () => {
    assert.throws(
      () => validateHistoricalSourcePaths([PROHIBITED_BACKUP_PATH]),
      (error) => error.message === PROTECTED_BACKUP_DENIAL_CODE
    );
  });

  it("uses fixed errors that cannot include raw dotenv input", () => {
    assert.throws(
      () => analyseEnvironmentSources([{ sourceId: historicalDotenv, source: null }]),
      (error) =>
        error.message === "LEGACY_SOURCE_INPUT_ERROR" &&
        !error.message.includes(syntheticSecret)
    );
  });

  it("enforces a closed output schema", () => {
    const report = analyseEnvironmentSources([
      source(historicalDotenv, "DATABASE_URL=synthetic-database\n")
    ]);
    assert.equal(validateLegacyReportOutput(report), report);
    assert.throws(
      () => validateLegacyReportOutput({ ...report, unexpected: true }),
      /unexpected field/u
    );
    assert.throws(
      () => validateLegacyReportOutput({ ...report, value: syntheticSecret }),
      /unexpected field/u
    );
    assert.throws(
      () => validateLegacyReportOutput({ ...report, args: [syntheticArgument] }),
      /unexpected field/u
    );
    assert.deepEqual(
      Object.keys(report).sort(),
      [...VALUE_FREE_REPORT_SCHEMA.reportKeys].sort()
    );
    for (const item of report.variables) {
      assert.deepEqual(
        Object.keys(item).sort(),
        [...VALUE_FREE_REPORT_SCHEMA.variableKeys].sort()
      );
    }
  });

  it("never emits synthetic values or their derived representations", () => {
    const report = analyseEnvironmentSources([
      source(historicalDotenv, `DATABASE_URL=${syntheticSecret}\nUNKNOWN=${syntheticSecret}\n`)
    ]);
    const output = renderLegacyReportText(report);
    assert.equal(output.includes(syntheticSecret), false);
    assert.equal(output.includes(Buffer.from(syntheticSecret).toString("base64")), false);
    assert.equal(output.includes(String(syntheticSecret.length)), false);
  });
});

describe("protected historical source redaction", () => {
  const protectedBasename = PROHIBITED_BACKUP_PATH.split("/").at(-1);
  const protectedTimestamp = "20260720-164833";

  it("denies the protected source with one opaque code and no reflected detail", () => {
    for (const selector of [
      PROHIBITED_BACKUP_PATH,
      `/synthetic/alternate/${protectedBasename}`
    ]) {
      let error;
      try {
        validateHistoricalSourcePaths([selector]);
      } catch (caught) {
        error = caught;
      }
      assert.equal(error?.message, PROTECTED_BACKUP_DENIAL_CODE);
      assert.equal(error.message.includes(protectedBasename), false);
      assert.equal(error.message.includes(protectedTimestamp), false);
      assert.equal(error.message.includes(".backup"), false);
    }
    assert.equal(PROTECTED_BACKUP_SOURCE_ID, "PROTECTED_BACKUP_SOURCE");
    assert.equal(isProtectedBackupSelector(PROHIBITED_BACKUP_PATH), true);
  });

  it("does not disclose existence, metadata, size or permissions", () => {
    const outcomes = [
      PROHIBITED_BACKUP_PATH,
      `/definitely-absent-synthetic-root/${protectedBasename}`
    ].map((selector) => {
      try {
        validateHistoricalSourcePaths([selector]);
      } catch (error) {
        return error.message;
      }
      return "unexpected-success";
    });
    assert.deepEqual(outcomes, [
      PROTECTED_BACKUP_DENIAL_CODE,
      PROTECTED_BACKUP_DENIAL_CODE
    ]);
    assert.doesNotMatch(outcomes.join("\n"), /exist|size|mode|permission|root/u);
  });

  it("never echoes arbitrary rejected paths or parser/read sources", () => {
    const arbitrary = "/synthetic/private/rejected-source.env";
    assert.throws(
      () => validateHistoricalSourcePaths([arbitrary]),
      (error) =>
        error.message === "LEGACY_SOURCE_PATH_DENIED" &&
        !error.message.includes(arbitrary)
    );
    assert.throws(
      () =>
        parseApprovedSource(
          source(historicalDotenv, "DATABASE_URL=synthetic\n"),
          () => {
            throw new Error(`synthetic parser failure: ${arbitrary}`);
          }
        ),
      (error) =>
        error.message === "LEGACY_SOURCE_PARSE_ERROR" &&
        !error.message.includes(historicalDotenv)
    );
    assert.throws(
      () =>
        readApprovedHistoricalSources(
          APPROVED_HISTORICAL_SOURCES.map(({ path }) => path),
          () => {
            throw new Error(`synthetic read failure: ${arbitrary}`);
          },
          () => true
        ),
      (error) =>
        error.message === "LEGACY_SOURCE_READ_ERROR" &&
        !error.message.includes(arbitrary)
    );
  });

  it("represents approved historical locations symbolically", () => {
    const report = analyseEnvironmentSources([
      source(historicalDotenv, "DATABASE_URL=synthetic-same\n"),
      source(historicalProduction, "DATABASE_URL=synthetic-same\n")
    ]);
    assert.deepEqual(variable(report, "DATABASE_URL").locations, [
      historicalDotenv,
      historicalProduction
    ]);
    const output = renderLegacyReportText(report);
    assert.match(output, /HISTORICAL_DOTENV/u);
    assert.match(output, /HISTORICAL_DOTENV_PRODUCTION/u);
    assert.doesNotMatch(output, /\/var\/www|\.env(?:\s|,|$)/u);
  });

  it("rejects protected, literal-path and arbitrary-detail schema leakage", () => {
    const report = analyseEnvironmentSources([
      source(historicalDotenv, "DATABASE_URL=synthetic\n")
    ]);
    const database = variable(report, "DATABASE_URL");
    for (const locations of [
      [PROHIBITED_BACKUP_PATH],
      [protectedBasename],
      ["/synthetic/private/source.env"]
    ]) {
      const variables = report.variables.map((item) =>
        item.name === "DATABASE_URL" ? { ...database, locations } : item
      );
      assert.throws(
        () => validateLegacyReportOutput({ ...report, variables }),
        /schema validation/u
      );
    }
    assert.throws(
      () =>
        validateGitStatusReportOutput({
          schemaVersion: GIT_STATUS_SCHEMA,
          state: "BLOCKED",
          issues: [PROTECTED_BACKUP_DENIAL_CODE],
          detail: PROHIBITED_BACKUP_PATH
        }),
      /unexpected field/u
    );
  });

  it("summarizes protected and arbitrary Git paths without reflecting them", () => {
    const protectedInput = Buffer.from(`?? ${protectedBasename}\0`, "utf8");
    const protectedReport = summarizeGitStatus(protectedInput);
    const protectedOutput = JSON.stringify(protectedReport);
    assert.deepEqual(protectedReport, {
      schemaVersion: GIT_STATUS_SCHEMA,
      state: "BLOCKED",
      issues: [PROTECTED_BACKUP_DENIAL_CODE]
    });
    for (const fragment of [
      protectedBasename,
      PROHIBITED_BACKUP_PATH,
      protectedTimestamp,
      ".backup"
    ]) {
      assert.equal(protectedOutput.includes(fragment), false);
    }

    const arbitrary = "synthetic/private/untracked.env";
    const dirtyReport = summarizeGitStatus(Buffer.from(`?? ${arbitrary}\0`));
    assert.deepEqual(dirtyReport, {
      schemaVersion: GIT_STATUS_SCHEMA,
      state: "DIRTY",
      issues: ["UNCOMMITTED_CHANGE_PRESENT"]
    });
    assert.equal(JSON.stringify(dirtyReport).includes(arbitrary), false);
    assert.deepEqual(summarizeGitStatus(Buffer.alloc(0)), {
      schemaVersion: GIT_STATUS_SCHEMA,
      state: "CLEAN",
      issues: []
    });
  });

  it("keeps protected Git-status CLI stdout and stderr opaque", () => {
    const executable = join(packRoot, "preflight-git-status-report.mjs");
    const success = spawnSync(process.execPath, [executable], {
      input: Buffer.from(`?? ${protectedBasename}\0`),
      encoding: "utf8"
    });
    assert.equal(success.status, 0);
    assert.equal(success.stderr, "");
    assert.deepEqual(JSON.parse(success.stdout), {
      schemaVersion: GIT_STATUS_SCHEMA,
      state: "BLOCKED",
      issues: [PROTECTED_BACKUP_DENIAL_CODE]
    });
    const combined = `${success.stdout}${success.stderr}`;
    assert.equal(combined.includes(protectedBasename), false);
    assert.equal(combined.includes(PROHIBITED_BACKUP_PATH), false);
    assert.equal(combined.includes(protectedTimestamp), false);

    const failure = spawnSync(process.execPath, [executable], {
      input: Buffer.from(`malformed ${PROHIBITED_BACKUP_PATH}\0`),
      encoding: "utf8"
    });
    assert.equal(failure.status, 2);
    assert.equal(failure.stdout, "");
    assert.equal(failure.stderr, "GIT_STATUS_REPORT_ERROR\n");
  });

  it("keeps CLI denial output fixed and value-free", () => {
    const executable = join(packRoot, "report-environment.mjs");
    for (const rejected of [
      PROHIBITED_BACKUP_PATH,
      `/synthetic/alternate/${protectedBasename}`,
      "/synthetic/private/rejected-source.env"
    ]) {
      const result = spawnSync(process.execPath, [executable, rejected], {
        encoding: "utf8"
      });
      assert.equal(result.status, 2);
      const output = `${result.stdout}${result.stderr}`;
      assert.equal(output.includes(rejected), false);
      assert.equal(output.includes(protectedBasename), false);
      assert.match(
        output,
        /^(?:PROTECTED_BACKUP_SOURCE_DENIED|LEGACY_SOURCE_PATH_DENIED)\n$/u
      );
    }
  });

  it("removes raw Git status paths from the committed preflight", () => {
    const preflight = readFileSync(join(packRoot, "preflight-read-only.sh"), "utf8");
    assert.match(preflight, /status --porcelain=v1 -z --untracked-files=all/u);
    assert.match(preflight, /preflight-git-status-report\.mjs/u);
    assert.doesNotMatch(preflight, /status --short(?:\s|$)/u);
    assert.doesNotMatch(preflight, /stat -c ['"]%n/u);
  });
});

describe("value-free PM2 normalization", () => {
  it("selects one online application by safe name and PID", () => {
    assert.deepEqual(normalizePm2Input(JSON.stringify([pm2Record()])), {
      name: EXPECTED_PM2_APPLICATION,
      pid: 42420,
      status: "online"
    });
  });

  it("ignores args, argv, cmdline and alternative command properties", () => {
    const normalized = normalizePm2Input(
      JSON.stringify([
        pm2Record({
          args: [syntheticArgument],
          argv: [syntheticArgument],
          cmdline: syntheticArgument,
          commandLine: syntheticArgument,
          pm2_env: {
            status: "online",
            args: [syntheticArgument],
            argv: [syntheticArgument]
          }
        })
      ])
    );
    const output = JSON.stringify(normalized);
    assert.equal(output.includes(syntheticArgument), false);
    assert.deepEqual(Object.keys(normalized).sort(), ["name", "pid", "status"]);
  });

  it("rejects ambiguous and missing applications with fixed codes", () => {
    assert.throws(
      () => normalizePm2Input(JSON.stringify([pm2Record(), pm2Record({ pid: 42421 })])),
      (error) => error.code === "PM2_REPORT_AMBIGUOUS"
    );
    assert.throws(
      () => normalizePm2Input(JSON.stringify([{ name: "synthetic-other" }])),
      (error) => error.code === "PM2_REPORT_MISSING"
    );
  });

  it("never includes raw PM2 input in parse or schema failures", () => {
    for (const raw of [
      `{${syntheticSecret}`,
      JSON.stringify([pm2Record({ pid: syntheticSecret })])
    ]) {
      assert.throws(
        () => normalizePm2Input(raw),
        (error) => !error.message.includes(syntheticSecret)
      );
    }
  });

  it("rejects unexpected, value-bearing and args output fields", () => {
    const base = { name: EXPECTED_PM2_APPLICATION, pid: 42420, status: "online" };
    for (const extra of [
      { unexpected: true },
      { value: syntheticSecret },
      { args: [syntheticArgument] }
    ]) {
      assert.throws(
        () => validateSafePm2Output({ ...base, ...extra }),
        (error) => error.code === "PM2_REPORT_SCHEMA_ERROR"
      );
    }
  });

  it("keeps CLI success and every synthetic failure value-free", () => {
    const executable = join(packRoot, "preflight-pm2-report.mjs");
    const success = spawnSync(process.execPath, [executable], {
      input: JSON.stringify([
        pm2Record({ pm2_env: { status: "online", args: [syntheticArgument] } })
      ]),
      encoding: "utf8"
    });
    assert.equal(success.status, 0);
    assert.equal(success.stdout.includes(syntheticArgument), false);
    for (const input of [
      `{${syntheticSecret}`,
      JSON.stringify([pm2Record(), pm2Record({ pid: 42421 })]),
      JSON.stringify([{ name: "synthetic-other", value: syntheticSecret }])
    ]) {
      const failure = spawnSync(process.execPath, [executable], {
        input,
        encoding: "utf8"
      });
      assert.equal(failure.status, 2);
      assert.equal(`${failure.stdout}${failure.stderr}`.includes(syntheticSecret), false);
      assert.equal(`${failure.stdout}${failure.stderr}`.includes(syntheticArgument), false);
    }
  });
});

describe("committed source proof", () => {
  function workingSources() {
    return Object.fromEntries(
      Object.entries(VALUE_FREE_SOURCE_PATHS).map(([name, path]) => [
        name,
        readFileSync(join(packRoot, path.replace("ops/deploy/phase-f1/", "")), "utf8")
      ])
    );
  }

  it("proves the working implementation has one closed value-free boundary", () => {
    assert.equal(proveValueFreePreflightSources(workingSources()), true);
  });

  it("fails if dynamic source keys, PM2 args or raw-output paths return", () => {
    const sources = workingSources();
    assert.throws(
      () =>
        proveValueFreePreflightSources({
          ...sources,
          reporter: `${sources.reporter}\nconst sourceKeys = Object.keys(parsed);`
        }),
      /DYNAMIC_SOURCE_KEYS/u
    );
    assert.throws(
      () =>
        proveValueFreePreflightSources({
          ...sources,
          pm2: `${sources.pm2}\nconst leaked = selected.pm2_env.args;`
        }),
      /PM2_ARGS/u
    );
    assert.throws(
      () =>
        proveValueFreePreflightSources({
          ...sources,
          pm2: `${sources.pm2}\nprocess.stdout.write(input);`
        }),
      /RAW_PM2_OUTPUT/u
    );
    assert.throws(
      () =>
        proveValueFreePreflightSources({
          ...sources,
          reporter: `${sources.reporter}\nthrow new Error(\`rejected: \${file}\`);`
        }),
      /REFLECTED_ERROR_DETAIL/u
    );
    assert.throws(
      () =>
        proveValueFreePreflightSources({
          ...sources,
          gitStatus: `${sources.gitStatus}\nprocess.stdout.write(paths.join("\\n"));`
        }),
      /GIT_STATUS_PATH_OUTPUT/u
    );
    assert.throws(
      () =>
        proveValueFreePreflightSources({
          ...sources,
          preflight: `${sources.preflight}\ngit status --short`
        }),
      /RAW_GIT_STATUS_PATHS/u
    );
  });

  it("proves exact committed Git blobs in an isolated synthetic repository", () => {
    const root = temporaryRoot("phase-f1-value-free-git-");
    execFileSync("git", ["init", "--quiet", root]);
    const sources = workingSources();
    for (const [name, path] of Object.entries(VALUE_FREE_SOURCE_PATHS)) {
      const target = join(root, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, sources[name]);
    }
    execFileSync("git", ["-C", root, "add", "."]);
    execFileSync("git", [
      "-C",
      root,
      "-c",
      "user.name=Phase F1 Synthetic Test",
      "-c",
      "user.email=phase-f1-synthetic@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "synthetic value-free proof"
    ]);
    const commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8"
    }).trim();
    assert.equal(proveValueFreePreflightCommit(root, commit).commit, commit);
  });
});
