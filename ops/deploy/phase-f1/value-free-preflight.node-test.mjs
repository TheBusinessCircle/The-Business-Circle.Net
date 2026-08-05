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
  PROHIBITED_BACKUP_PATH,
  renderLegacyReportText,
  validateHistoricalSourcePaths
} from "./report-environment.mjs";
import {
  EXPECTED_PM2_APPLICATION,
  normalizePm2Input,
  validateSafePm2Output
} from "./preflight-pm2-report.mjs";
import {
  VALUE_FREE_REPORT_SCHEMA,
  VALUE_INSPECTION_ALLOWLIST,
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
      source("synthetic-a", `PHASE_F1_UNKNOWN=${syntheticSecret}\n`),
      source("synthetic-b", "PHASE_F1_UNKNOWN=\n")
    ]);
    assert.deepEqual(VALUE_INSPECTION_ALLOWLIST, before);
    assert.equal(report.unknownSourceNameCount, 1);
    assert.equal(variable(report, "PHASE_F1_UNKNOWN"), undefined);
    assert.equal(JSON.stringify(report).includes(syntheticSecret), false);
  });

  it("does not classify unknown values as empty, placeholder or conflicting", () => {
    const report = analyseEnvironmentSources([
      source("synthetic-a", "UNKNOWN_ONE=placeholder\nUNKNOWN_TWO=\n"),
      source("synthetic-b", "UNKNOWN_ONE=different-synthetic\n")
    ]);
    const output = renderLegacyReportText(report);
    assert.equal(report.unknownSourceNameCount, 2);
    assert.doesNotMatch(output, /UNKNOWN_ONE|UNKNOWN_TWO/u);
    assert.doesNotMatch(output, /PHASE_F1_UNKNOWN/u);
  });

  it("classifies allowlisted conflict, match and absence correctly", () => {
    const conflict = analyseEnvironmentSources([
      source("synthetic-a", "DATABASE_URL=synthetic-database-a\n"),
      source("synthetic-b", "DATABASE_URL=synthetic-database-b\n")
    ]);
    assert.equal(variable(conflict, "DATABASE_URL").status, "CONFLICT");
    const match = analyseEnvironmentSources([
      source("synthetic-a", "DATABASE_URL=synthetic-database-same\n"),
      source("synthetic-b", "DATABASE_URL=synthetic-database-same\n")
    ]);
    assert.equal(variable(match, "DATABASE_URL").status, "present");
    const absent = analyseEnvironmentSources([
      source("synthetic-a", "PHASE_F1_UNKNOWN=synthetic-only\n")
    ]);
    assert.equal(variable(absent, "DATABASE_URL").status, "ABSENT_REQUIRED");
  });

  it("reports tooling, legacy, unsupported and fixed names by name only", () => {
    const report = analyseEnvironmentSources([
      source(
        "synthetic-a",
        [
          `POSTGRES_PASSWORD=${syntheticSecret}`,
          "COMPOSE_APP_ENV_FILE=placeholder",
          "DEMO_MEMBER_PASSWORD=",
          "NODE_ENV=synthetic-development"
        ].join("\n") + "\n"
      ),
      source(
        "synthetic-b",
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
      source("synthetic-a", "POSTGRES_PASSWORD=one\nPOSTGRES_PASSWORD=two\n")
    ]);
    assert.equal(variable(report, "POSTGRES_PASSWORD").status, "DUPLICATE_NAME_ONLY");
  });

  it("rejects the prohibited backup path before reading it", () => {
    assert.throws(
      () => validateHistoricalSourcePaths([PROHIBITED_BACKUP_PATH]),
      /LEGACY_SOURCE_PATH_ERROR/u
    );
  });

  it("uses fixed errors that cannot include raw dotenv input", () => {
    assert.throws(
      () => analyseEnvironmentSources([{ sourceId: "synthetic-source", source: null }]),
      (error) =>
        error.message === "LEGACY_SOURCE_INPUT_ERROR" &&
        !error.message.includes(syntheticSecret)
    );
  });

  it("enforces a closed output schema", () => {
    const report = analyseEnvironmentSources([
      source("synthetic-a", "DATABASE_URL=synthetic-database\n")
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
      source("synthetic-a", `DATABASE_URL=${syntheticSecret}\nUNKNOWN=${syntheticSecret}\n`)
    ]);
    const output = renderLegacyReportText(report);
    assert.equal(output.includes(syntheticSecret), false);
    assert.equal(output.includes(Buffer.from(syntheticSecret).toString("base64")), false);
    assert.equal(output.includes(String(syntheticSecret.length)), false);
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
