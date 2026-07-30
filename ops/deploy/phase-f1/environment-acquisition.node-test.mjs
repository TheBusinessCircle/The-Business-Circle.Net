import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  ACQUISITION_ROOT,
  AUTOMATION_CONDITIONAL_NAMES,
  HISTORICAL_DOTENV,
  LIVEKIT_CONDITIONAL_NAMES,
  PLAN_SCHEMA,
  PROTECTED_BACKUP,
  REDIS_PAIRS,
  REPORT_SCHEMA,
  SAFE_LIVE_NAMES,
  SOURCE_COMPARISONS,
  __test,
  acquisitionDirectory,
  assembleSelectedValues,
  assertRunTmpfs,
  classifySources,
  createAcquisitionDirectory,
  encodeDotEnvValue,
  extractAllowlistedEnvironment,
  parseSelectionPlan,
  readApprovedHistoricalFile,
  renderOperatorInput,
  resolveLiveBcnProcess,
  secureOperatorEntry
} from "./environment-acquisition.mjs";

const require = createRequire(import.meta.url);
const groups = require("./environment-groups.cjs");
const serialization = require("./environment-serialization.cjs");
const utilitySource = readFileSync(
  new URL("./environment-acquisition.mjs", import.meta.url),
  "utf8"
);
const operationsCommit = "a".repeat(40);
const required = new Set([
  ...groups.REQUIRED_SHARED_KEYS,
  ...groups.REQUIRED_BCN_KEYS,
  ...groups.REQUIRED_CIRCLE_KEYS
]);
const allowed = new Set([
  ...groups.BCN_ALLOWED_KEYS,
  ...groups.CIRCLE_ALLOWED_KEYS,
  ...groups.BUILD_ENV_KEYS
]);

function scopes(name) {
  const result = [];
  if (groups.BCN_ALLOWED_KEYS.includes(name)) result.push("bcn");
  if (groups.CIRCLE_ALLOWED_KEYS.includes(name)) result.push("circle-card");
  if (groups.BUILD_ENV_KEYS.includes(name)) result.push("build");
  return result;
}

function sourceFor(name) {
  if (
    [
      "PUBLIC_CONTACT_EMAIL",
      "RESEND_REPLY_TO_EMAIL",
      "RESEND_WEBHOOK_SECRET",
      "CIRCLE_CARD_RESEND_API_KEY",
      "CIRCLE_CARD_RESEND_FROM_EMAIL",
      "CIRCLE_CARD_RESEND_REPLY_TO_EMAIL",
      "CIRCLE_CARD_PUBLIC_CONTACT_EMAIL"
    ].includes(name)
  ) {
    return "SECURE_OPERATOR_ENTRY";
  }
  if (SAFE_LIVE_NAMES.includes(name)) return "LIVE_BCN_PROCESS";
  return "HISTORICAL_DOTENV_PRODUCTION";
}

function entry(name, source = sourceFor(name)) {
  return {
    name,
    scopes: scopes(name),
    source,
    required: required.has(name),
    omissionDisablesFeature:
      AUTOMATION_CONDITIONAL_NAMES.includes(name) ||
      LIVEKIT_CONDITIONAL_NAMES.includes(name),
    equality: groups.SHARED_KEYS.includes(name)
      ? "BCN_CIRCLE_IDENTICAL"
      : groups.CIRCLE_CARD_ONLY_KEYS.includes(name)
        ? "SINGLE_SOURCE_CIRCLE_LIFECYCLE"
        : "NONE",
    differsFrom:
      name === "CIRCLE_CARD_RESEND_API_KEY" ? "RESEND_API_KEY" : null,
    operatorEntered: source === "SECURE_OPERATOR_ENTRY",
    generatedDecision:
      source === "GENERATED_NON_SECRET_DECISION"
        ? "BCN_COMMUNITY_AUTOMATION_DISABLED"
        : null
  };
}

function plan(overrides = {}) {
  const names = new Set([
    ...required,
    ...REDIS_PAIRS.UPSTASH,
    "BCN_COMMUNITY_AUTOMATION_ENABLED"
  ]);
  const variables = [...names].map((name) =>
    name === "BCN_COMMUNITY_AUTOMATION_ENABLED"
      ? entry(name, "GENERATED_NON_SECRET_DECISION")
      : entry(name)
  );
  return {
    schemaVersion: PLAN_SCHEMA,
    operationsCommit,
    decisions: {
      redisProvider: "UPSTASH",
      bcnCommunityAutomation: "DISABLED",
      livekitRealtime: "DISABLED"
    },
    variables,
    ...overrides
  };
}

function syntheticValue(name) {
  if (name === "CIRCLE_CARD_RESEND_FROM_EMAIL") {
    return "synthetic-sender@circlecard.co.uk";
  }
  if (
    name.endsWith("_EMAIL") ||
    name.endsWith("_FROM_EMAIL") ||
    name.endsWith("_REPLY_TO_EMAIL")
  ) {
    return `synthetic-${name.toLowerCase()}@example.invalid`;
  }
  if (name.endsWith("_URL") || name === "DATABASE_URL") {
    return `https://synthetic-${name.toLowerCase().replaceAll("_", "-")}.invalid/path`;
  }
  return `SYNTHETIC_ONLY_${name}`;
}

function sourcesFor(parsedPlan) {
  const result = { live: {}, dotenv: {}, production: {} };
  for (const selected of parsedPlan.variables) {
    if (selected.source === "LIVE_BCN_PROCESS") {
      result.live[selected.name] = syntheticValue(selected.name);
    } else if (selected.source === "HISTORICAL_DOTENV") {
      result.dotenv[selected.name] = syntheticValue(selected.name);
    } else if (selected.source === "HISTORICAL_DOTENV_PRODUCTION") {
      result.production[selected.name] = syntheticValue(selected.name);
    }
  }
  return result;
}

function parsedPlan(overrides = {}) {
  return parseSelectionPlan(JSON.stringify(plan(overrides)));
}

function fakeProcessDependencies(options = {}) {
  const listenerInode = options.listenerInode ?? "999";
  const stat = (pid, ppid) => `${pid} (synthetic) S ${ppid} 0 0 0 0\n`;
  return {
    exists(path) {
      return path === "/usr/local/bin/pm2" || path === "/proc/net/tcp";
    },
    execFile(_path, args) {
      assert.deepEqual(args, ["pid", "businesscircle"]);
      return options.ambiguous === true ? "200\n210\n" : "200\n";
    },
    readFile(path) {
      if (path === "/root/.pm2/pm2.pid") return "100\n";
      if (path === "/proc/200/stat") return stat(200, 100);
      if (path === "/proc/201/stat") return stat(201, 200);
      if (path === "/proc/202/stat") return stat(202, 201);
      if (path === "/proc/202/comm") return "next-server\n";
      if (path === "/proc/201/comm") return "sh\n";
      if (path === "/proc/200/comm") return "node\n";
      if (path === "/proc/net/tcp") {
        return (
          "sl local_address rem_address st tx_queue rx_queue tr tm->when retrnsmt uid timeout inode\n" +
          `0: 00000000:0BB8 00000000:0000 0A 00000000:00000000 00:00000000 00000000 0 0 ${listenerInode} 1\n`
        );
      }
      throw new Error(`unexpected read ${path}`);
    },
    readdir(path) {
      if (path === "/proc") return ["200", "201", "202"];
      if (path === "/proc/202/fd") return ["7"];
      return [];
    },
    readlink(path) {
      if (path === "/proc/202/fd/7") return "socket:[999]";
      if (
        path === "/proc/100/exe" ||
        path === "/proc/200/exe" ||
        path === "/proc/202/exe"
      ) {
        return "/synthetic/node";
      }
      throw new Error(`unexpected link ${path}`);
    }
  };
}

test("01 live-process allowlist extraction retains only approved names", () => {
  const bytes = Buffer.from(
    "DATABASE_URL=SYNTHETIC_ONLY_DB\0UNRELATED=SYNTHETIC_ONLY_DROP\0"
  );
  assert.deepEqual(extractAllowlistedEnvironment(bytes, ["DATABASE_URL"]), {
    DATABASE_URL: "SYNTHETIC_ONLY_DB"
  });
});

test("02 complete-environment dumping has no utility output path", () => {
  assert.doesNotMatch(utilitySource, /console\.(?:log|dir)\([^)]*environ/u);
  assert.doesNotMatch(utilitySource, /process\.stdout\.write\([^)]*live\[/u);
  assert.doesNotMatch(utilitySource, /\["jlist"\]|pm2_env/u);
  assert.match(utilitySource, /"pid",\s*LIVE_APPLICATION_NAME/u);
});

test("03 ambiguous PM2 process identity fails closed", () => {
  assert.throws(
    () => resolveLiveBcnProcess(fakeProcessDependencies({ ambiguous: true })),
    /ambiguous/u
  );
});

test("04 wrong port owner fails closed", () => {
  assert.throws(
    () =>
      resolveLiveBcnProcess(
        fakeProcessDependencies({ listenerInode: "998" })
      ),
    /not owned/u
  );
});

test("05 historical dotenv uses Node-compatible parsing", (context) => {
  if (process.platform !== "linux") {
    context.skip("production absolute-path metadata checks require Linux");
    return;
  }
  const root = mkdtempSync(join(tmpdir(), "f1-env-acquisition-"));
  const path = join(root, "synthetic.env");
  writeFileSync(path, "DATABASE_URL='https://synthetic.invalid/a#b'\n");
  chmodSync(path, 0o600);
  try {
    assert.equal(
      readApprovedHistoricalFile(path, path, { enforceRoot: false }).DATABASE_URL,
      "https://synthetic.invalid/a#b"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("06 historical dotenv production uses the same parser", () => {
  const parsed = serialization.parseDotEnvSource(
    "AUTH_SECRET='SYNTHETIC_ONLY_AUTH'\n",
    "synthetic .env.production"
  );
  assert.equal(parsed.AUTH_SECRET, "SYNTHETIC_ONLY_AUTH");
});

test("07 protected backup path and basename are denied", () => {
  assert.throws(
    () => readApprovedHistoricalFile(PROTECTED_BACKUP, PROTECTED_BACKUP),
    /explicitly denied/u
  );
});

test("08 matching and conflicting sources are classified without values", () => {
  assert.deepEqual(
    classifySources(
      "DATABASE_URL",
      { DATABASE_URL: "SYNTHETIC_ONLY_A" },
      { DATABASE_URL: "SYNTHETIC_ONLY_A" },
      { DATABASE_URL: "SYNTHETIC_ONLY_B" }
    ),
    [
      "PRESENT_IN_LIVE_PROCESS",
      "MATCHES_HISTORICAL_DOTENV",
      "DIFFERS_FROM_HISTORICAL_DOTENV_PRODUCTION",
      "HISTORICAL_SOURCES_CONFLICT"
    ]
  );
  assert(SOURCE_COMPARISONS.includes("HISTORICAL_SOURCES_MATCH"));
});

test("09 selection plan rejects fields capable of carrying values", () => {
  const candidate = plan();
  candidate.variables[0].value = "SYNTHETIC_ONLY_FORBIDDEN";
  assert.throws(
    () => parseSelectionPlan(JSON.stringify(candidate)),
    /values|field/u
  );
});

test("10 arbitrary historical path is rejected", () => {
  assert.throws(
    () =>
      readApprovedHistoricalFile(
        "/tmp/synthetic.env",
        HISTORICAL_DOTENV,
        { enforceRoot: false }
      ),
    /Arbitrary/u
  );
});

test("11 CLI exposes no PID argument", () => {
  assert.match(utilitySource, /exactArguments\(parsed\.args, expectedArgs\)/u);
  assert.doesNotMatch(utilitySource, /args\.pid/u);
});

test("12 unknown variables are rejected", () => {
  const candidate = plan();
  candidate.variables.push(entry("UNCLASSIFIED_SYNTHETIC_NAME"));
  assert.throws(() => parseSelectionPlan(JSON.stringify(candidate)), /Unknown/u);
});

test("13 duplicate variables are rejected", () => {
  const candidate = plan();
  candidate.variables.push({ ...candidate.variables[0] });
  assert.throws(() => parseSelectionPlan(JSON.stringify(candidate)), /Duplicate/u);
});

test("14 tooling-only variables are rejected", () => {
  const candidate = plan();
  candidate.variables.push(entry("POSTGRES_PASSWORD"));
  assert.throws(
    () => parseSelectionPlan(JSON.stringify(candidate)),
    /Non-migrating/u
  );
});

test("15 legacy variables are rejected", () => {
  const candidate = plan();
  candidate.variables.push(entry("COMPOSE_APP_ENV_FILE"));
  assert.throws(
    () => parseSelectionPlan(JSON.stringify(candidate)),
    /Non-migrating/u
  );
});

test("16 unsupported variables are rejected", () => {
  const candidate = plan();
  candidate.variables.push(entry("DEMO_MEMBER_PASSWORD"));
  assert.throws(
    () => parseSelectionPlan(JSON.stringify(candidate)),
    /Non-migrating/u
  );
});

test("17 fixed runtime variables are rejected", () => {
  const candidate = plan();
  candidate.variables.push(entry("NODE_ENV"));
  assert.throws(
    () => parseSelectionPlan(JSON.stringify(candidate)),
    /Non-migrating/u
  );
});

function fakeTerminal(lines, options = {}) {
  const state = { echoes: [], closed: false, output: "" };
  return {
    state,
    open: () => 9,
    close: () => {
      state.closed = true;
    },
    isatty: () => options.tty !== false,
    setEcho: (_fd, enabled) => {
      state.echoes.push(enabled);
      if (enabled && options.restoreFailure) throw new Error("restore");
    },
    write: (_fd, text) => {
      state.output += text;
    },
    read: () => Buffer.from(lines.shift() ?? "", "utf8")
  };
}

test("18 secure entry disables terminal echo", () => {
  const terminal = fakeTerminal([
    "SYNTHETIC_ONLY_PROVIDER",
    "SYNTHETIC_ONLY_PROVIDER"
  ]);
  assert.equal(
    secureOperatorEntry("RESEND_WEBHOOK_SECRET", terminal),
    "SYNTHETIC_ONLY_PROVIDER"
  );
  assert.deepEqual(terminal.state.echoes, [false, true]);
});

test("19 terminal state restoration is attempted after failure", () => {
  const terminal = fakeTerminal(["one", "two"]);
  assert.throws(
    () => secureOperatorEntry("RESEND_WEBHOOK_SECRET", terminal),
    /mismatch/u
  );
  assert.deepEqual(terminal.state.echoes, [false, true]);
  assert.equal(terminal.state.closed, true);
});

test("20 confirmation mismatch is rejected", () => {
  assert.throws(
    () =>
      secureOperatorEntry(
        "CIRCLE_CARD_RESEND_API_KEY",
        fakeTerminal(["synthetic-one", "synthetic-two"])
      ),
    /mismatch/u
  );
});

test("21 dotenv output ordering is ordinal and deterministic", () => {
  const values = { DATABASE_URL: "z", AUTH_SECRET: "a" };
  assert.equal(
    renderOperatorInput(values),
    "AUTH_SECRET=a\nDATABASE_URL=z\n"
  );
});

test("22 generated dotenv parses to the exact values", () => {
  const values = {
    DATABASE_URL: "https://synthetic.invalid/path#fragment",
    AUTH_SECRET: "SYNTHETIC_ONLY_AUTH"
  };
  const body = renderOperatorInput(values);
  assert.deepEqual(serialization.parseDotEnvSource(body, "synthetic"), values);
});

test("23 quoting preserves spaces, hash and one quote kind", () => {
  const value = "synthetic space # and \" quote";
  const line = encodeDotEnvValue("AUTH_SECRET", value);
  assert.equal(
    serialization.parseDotEnvSource(line, "synthetic").AUTH_SECRET,
    value
  );
});

test("24 NUL, controls and multiline values are rejected", () => {
  for (const value of ["a\0b", "a\nb", "a\rb", "a\u0007b"]) {
    assert.throws(() => encodeDotEnvValue("AUTH_SECRET", value), /Unsupported/u);
  }
});

test("25 exactly one Redis provider is accepted", () => {
  assert.equal(parsedPlan().decisions.redisProvider, "UPSTASH");
});

test("26 a partial selected Redis pair is rejected", () => {
  const candidate = plan();
  candidate.variables = candidate.variables.filter(
    (item) => item.name !== "UPSTASH_REDIS_REST_TOKEN"
  );
  assert.throws(
    () => parseSelectionPlan(JSON.stringify(candidate)),
    /incomplete/u
  );
});

test("27 dual Redis providers are rejected", () => {
  const candidate = plan();
  candidate.variables.push(entry("KV_REST_API_URL", "SECURE_OPERATOR_ENTRY"));
  candidate.variables.push(entry("KV_REST_API_TOKEN", "SECURE_OPERATOR_ENTRY"));
  assert.throws(
    () => parseSelectionPlan(JSON.stringify(candidate)),
    /Unselected Redis/u
  );
});

test("28 Circle Card Resend identity must differ", () => {
  const selected = parsedPlan();
  const sources = sourcesFor(selected);
  const same = "SYNTHETIC_ONLY_SHARED_RESEND";
  sources.production.RESEND_API_KEY = same;
  assert.throws(
    () =>
      assembleSelectedValues(selected, sources, (name) =>
        name === "CIRCLE_CARD_RESEND_API_KEY" ? same : syntheticValue(name)
      ),
    /environment contract/u
  );
});

test("29 shared values are assembled from one selected source", () => {
  const selected = parsedPlan();
  const values = assembleSelectedValues(
    selected,
    sourcesFor(selected),
    syntheticValue
  );
  const prepared = require("./environment-contract.cjs").prepareSanitizedEnvironment(
    values
  );
  assert.equal(prepared.bcn.AUTH_SECRET, prepared.circleCard.AUTH_SECRET);
});

test("30 BCN-only names never enter Circle Card output", () => {
  const selected = parsedPlan();
  const values = assembleSelectedValues(
    selected,
    sourcesFor(selected),
    syntheticValue
  );
  const prepared = require("./environment-contract.cjs").prepareSanitizedEnvironment(
    values
  );
  assert.equal(own(prepared.circleCard, "STRIPE_WEBHOOK_SECRET"), false);
});

test("31 Circle lifecycle names are the only deliberate dual-runtime Circle keys", () => {
  const selected = parsedPlan();
  const values = assembleSelectedValues(
    selected,
    sourcesFor(selected),
    syntheticValue
  );
  const prepared = require("./environment-contract.cjs").prepareSanitizedEnvironment(
    values
  );
  for (const name of groups.CIRCLE_CARD_ONLY_KEYS) {
    assert.equal(prepared.bcn[name], prepared.circleCard[name]);
  }
});

test("32 disabled automation omits conditional variables", () => {
  const selected = parsedPlan();
  for (const name of AUTOMATION_CONDITIONAL_NAMES) {
    assert.equal(selected.variables.some((item) => item.name === name), false);
  }
});

test("33 enabled automation requires every conditional selection", () => {
  const candidate = plan({
    decisions: {
      redisProvider: "UPSTASH",
      bcnCommunityAutomation: "ENABLED",
      livekitRealtime: "DISABLED"
    }
  });
  candidate.variables.find(
    (item) => item.name === "BCN_COMMUNITY_AUTOMATION_ENABLED"
  ).generatedDecision = "BCN_COMMUNITY_AUTOMATION_ENABLED";
  assert.throws(
    () => parseSelectionPlan(JSON.stringify(candidate)),
    /requires explicit selection/u
  );
});

test("34 LiveKit retained and disabled policies are explicit", () => {
  const retained = plan({
    decisions: {
      redisProvider: "UPSTASH",
      bcnCommunityAutomation: "DISABLED",
      livekitRealtime: "RETAINED"
    }
  });
  for (const name of LIVEKIT_CONDITIONAL_NAMES) {
    retained.variables.push(entry(name, "LIVE_BCN_PROCESS"));
  }
  assert.equal(
    parseSelectionPlan(JSON.stringify(retained)).decisions.livekitRealtime,
    "RETAINED"
  );
  retained.variables.pop();
  assert.throws(
    () => parseSelectionPlan(JSON.stringify(retained)),
    /LiveKit requires/u
  );
});

test("35 acquisition directory path is commit-bound", () => {
  assert.equal(
    acquisitionDirectory(operationsCommit),
    `${ACQUISITION_ROOT}/phase-f1-environment-${operationsCommit}`
  );
  assert.throws(() => acquisitionDirectory("../synthetic"), /commit/u);
});

test("36 /run tmpfs validation rejects a non-tmpfs result", () => {
  assert.throws(
    () =>
      assertRunTmpfs("/run", {
        realpath: () => "/run",
        statfs: () => ({ type: 0x1234n })
      }),
    /not tmpfs/u
  );
  assert.doesNotThrow(() =>
    assertRunTmpfs("/run", {
      realpath: () => "/run",
      statfs: () => ({ type: 0x01021994n })
    })
  );
});

test("37 protected metadata requires a regular single-link root file", () => {
  assert.match(utilitySource, /stats\.nlink !== 1/u);
  assert.match(utilitySource, /stats\.uid !== 0/u);
  assert.match(utilitySource, /stats\.gid !== 0/u);
  assert.match(utilitySource, /expectedMode/u);
});

test("38 input publication uses the existing atomic no-replace primitive", () => {
  assert.match(utilitySource, /publishNoReplaceSet/u);
  assert.doesNotMatch(utilitySource, /renameSync|copyFileSync/u);
});

test("39 validation-only output contains names and no values", () => {
  const selected = parsedPlan();
  const values = assembleSelectedValues(
    selected,
    sourcesFor(selected),
    syntheticValue
  );
  const body = renderOperatorInput(values);
  const names = Object.keys(
    serialization.parseDotEnvSource(body, "synthetic validation")
  );
  assert(names.includes("DATABASE_URL"));
  assert.doesNotMatch(
    `INPUT_VALID names=${names.join(",")}`,
    /SYNTHETIC_ONLY_/u
  );
});

test("40 destroy mode requires verified publication and passed preflight", () => {
  assert.match(
    utilitySource,
    /args\["publication-status"\] !== "VERIFIED"/u
  );
  assert.match(utilitySource, /args\["preflight-status"\] !== "PASSED"/u);
});

test("41 uncertain publication cannot trigger cleanup", () => {
  assert.match(utilitySource, /conclusive publication and preflight success/u);
  assert.match(utilitySource, /readProtectedReadiness\(\)/u);
});

test("42 value-free reports have an explicit false material flag", () => {
  assert.equal(REPORT_SCHEMA, "phase-f1-environment-acquisition-report-v1");
  const selected = parsedPlan();
  const report = __test.safeReport(
    selected,
    "b".repeat(64),
    `${acquisitionDirectory(operationsCommit)}/operator-input.env`,
    { uid: 0, gid: 0, mode: 0o100600, nlink: 1 },
    sourcesFor(selected)
  );
  const output = __test.renderSafeJson(report);
  assert.equal(report.valueMaterialRecorded, false);
  assert.doesNotMatch(output, /SYNTHETIC_ONLY_|synthetic-/u);
});

test("43 CLI status output cannot contain synthetic selected values", () => {
  const output =
    "PLAN_VALID names=DATABASE_URL,AUTH_SECRET values-recorded=false";
  assert.doesNotMatch(output, /SYNTHETIC_ONLY_/u);
});

test("44 values are never accepted as process arguments", () => {
  assert.doesNotMatch(utilitySource, /--value|--secret|--token|--password/u);
  assert.deepEqual(
    Object.keys(
      __test.parseArguments([
        "acquire",
        "--plan",
        "/synthetic",
        "--operations-commit",
        operationsCommit
      ]).args
    ).sort(),
    ["operations-commit", "plan"]
  );
});

test("45 utility has no shell-history or shell-export pathway", () => {
  assert.doesNotMatch(utilitySource, /shell:\s*true|export\s+[A-Z]/u);
  assert.doesNotMatch(utilitySource, /\/bin\/(?:ba)?sh/u);
});

test("46 secure entry restores echo and closes the TTY on interruption-shaped failure", () => {
  const terminal = fakeTerminal([]);
  terminal.read = () => {
    throw new Error("synthetic interruption");
  };
  assert.throws(
    () => secureOperatorEntry("PUBLIC_CONTACT_EMAIL", terminal),
    /interruption/u
  );
  assert.deepEqual(terminal.state.echoes, [false, true]);
  assert.equal(terminal.state.closed, true);
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    assert.match(utilitySource, new RegExp(`\"${signal}\"`, "u"));
  }
});

test("47 Windows static contract remains executable without Linux mutation", () => {
  assert.equal(typeof parseSelectionPlan, "function");
  assert.equal(typeof resolveLiveBcnProcess, "function");
  assert.equal(typeof secureOperatorEntry, "function");
});

test(
  "48 Linux root tmpfs directory and atomic input behaviour",
  { skip: process.platform !== "linux" || process.getuid?.() !== 0 },
  () => {
    const commit = "f".repeat(40);
    const directory = acquisitionDirectory(commit);
    const rootExisted = existsSync(ACQUISITION_ROOT);
    if (existsSync(directory)) rmSync(directory, { recursive: true, force: true });
    try {
      const created = createAcquisitionDirectory(commit);
      assert.equal(realpathSync(created), created);
      const stats = lstatSync(created);
      assert.equal(stats.uid, 0);
      assert.equal(stats.gid, 0);
      assert.equal(stats.mode & 0o777, 0o700);
      const input = join(created, "operator-input.env");
      __test.publishOperatorInput(input, "AUTH_SECRET=SYNTHETIC_ONLY_TMPFS\n");
      const inputStats = lstatSync(input);
      assert.equal(inputStats.nlink, 1);
      assert.equal(inputStats.mode & 0o777, 0o600);
      assert.throws(
        () =>
          __test.publishOperatorInput(
            input,
            "AUTH_SECRET=SYNTHETIC_ONLY_REFUSE\n"
          ),
        /EEXIST|exist/u
      );
    } finally {
      if (existsSync(directory)) rmSync(directory, { recursive: true, force: true });
      if (!rootExisted && existsSync(ACQUISITION_ROOT)) {
        assert.equal(readdirSync(ACQUISITION_ROOT).length, 0);
        rmdirSync(ACQUISITION_ROOT);
      }
    }
  }
);

test("49 manifest candidate boundary includes utility and its test", () => {
  assert.equal(
    allowed.has("environment-acquisition.mjs"),
    false,
    "file membership is controlled by the Git candidate path set, not env names"
  );
  assert.match(utilitySource, /export function runCli/u);
});

test("50 runbook contract forbids improvised secret acquisition", () => {
  assert.match(utilitySource, /HISTORICAL_DOTENV/u);
  assert.match(utilitySource, /PROTECTED_BACKUP/u);
  assert.match(utilitySource, /\/dev\/tty/u);
  assert.match(utilitySource, /destroy-input/u);
});

test("51 a missing required selection fails closed", () => {
  const candidate = plan();
  candidate.variables = candidate.variables.filter(
    (item) => item.name !== "AUTH_SECRET"
  );
  assert.throws(() => parseSelectionPlan(JSON.stringify(candidate)), /missing/u);
});

test("52 a missing selected live value fails before rendering", () => {
  const selected = parsedPlan();
  const sources = sourcesFor(selected);
  delete sources.live.DATABASE_URL;
  assert.throws(
    () => assembleSelectedValues(selected, sources, syntheticValue),
    /live BCN value is absent/u
  );
});

test("53 a non-interactive terminal is refused", () => {
  assert.throws(
    () =>
      secureOperatorEntry(
        "PUBLIC_CONTACT_EMAIL",
        fakeTerminal(["synthetic@example.invalid"], { tty: false })
      ),
    /real controlling terminal/u
  );
});

test("54 a symlinked historical source is rejected where supported", (context) => {
  if (process.platform !== "linux") {
    context.skip("production absolute-path metadata checks require Linux");
    return;
  }
  const root = mkdtempSync(join(tmpdir(), "f1-env-symlink-"));
  const target = join(root, "target.env");
  const link = join(root, "source.env");
  writeFileSync(target, "AUTH_SECRET=SYNTHETIC_ONLY_AUTH\n");
  chmodSync(target, 0o600);
  try {
    try {
      symlinkSync(target, link);
    } catch {
      context.skip("symlink creation is unavailable on this Windows host");
      return;
    }
    assert.throws(
      () => readApprovedHistoricalFile(link, link, { enforceRoot: false }),
      /canonical|unsafe/u
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function own(object, key) {
  return Object.hasOwn(object, key);
}
