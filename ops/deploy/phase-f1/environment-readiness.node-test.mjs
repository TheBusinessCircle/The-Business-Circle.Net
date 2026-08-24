import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import {
  ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA,
  CHAINED_ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA,
  CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD,
  ENVIRONMENT_READINESS_SCHEMA,
  IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD,
  IDENTITY_ONLY_READINESS_DELTA,
  READINESS_CARRY_FORWARD_IMMEDIATE_PREDECESSOR,
  READINESS_CARRY_FORWARD_CHAIN_SOURCE,
  READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT,
  classifyEnvironmentReadinessDelta,
  createChainedEnvironmentReadinessCarryForwardArtifacts,
  createEnvironmentReadinessCarryForwardArtifacts,
  createEnvironmentReadiness,
  environmentReadinessCarryForwardReportPath,
  environmentReadinessExchangeSlotPath,
  preservedEnvironmentReadinessPath,
  publishCarriedForwardEnvironmentReadiness,
  publishChainedCarriedForwardEnvironmentReadiness,
  publishEnvironmentReadiness,
  validateChainedEnvironmentReadinessCarryForwardReport,
  validateEnvironmentReadinessCarryForwardReport,
  validateEnvironmentReadinessRecord,
  verifyCrossUserIsolation,
  verifyEnvironmentReadiness,
  verifyProtectedAuthorityLineage,
  resolveProtectedAuthorityLineage
} from "./environment-readiness.mjs";
import {
  validateProtectedEnvironmentSchema,
  validateRuntimeIdentityPolicy
} from "./validate-environment.mjs";

const OPERATIONS_COMMIT = "a".repeat(40);
const OTHER_OPERATIONS_COMMIT = "b".repeat(40);
const CARRY_FORWARD_OPERATIONS_COMMIT = "c".repeat(40);
const CHAINED_OPERATIONS_COMMIT = "d".repeat(40);
const INTERMEDIATE_OPERATIONS_COMMIT = "1".repeat(40);
const TRUSTED_LINEAGE = Object.freeze([
  READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT,
  READINESS_CARRY_FORWARD_IMMEDIATE_PREDECESSOR,
  READINESS_CARRY_FORWARD_CHAIN_SOURCE,
  INTERMEDIATE_OPERATIONS_COMMIT,
  CHAINED_OPERATIONS_COMMIT
]);
const roots = [];
function temporaryRoot() {
  const root = mkdtempSync(join(tmpdir(), "phase-f1-environment-readiness-"));
  roots.push(root);
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function testDependencies(overrides = {}) {
  return {
    operational: false,
    validateSchema() {},
    verifyIsolation() {},
    publish(entries, options) {
      return publishNoReplaceSet(entries, {
        ...options,
        enforceMetadata: false,
        fsyncDirectories: false
      });
    },
    ...overrides
  };
}

function readinessBytes(operationsCommit) {
  return Buffer.from(`${JSON.stringify(createEnvironmentReadiness(operationsCommit), null, 2)}\n`);
}

function readinessIdentity(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function carryForwardOptions(overrides = {}) {
  const bytes = readinessBytes(READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT);
  return {
    priorOperationsCommit: READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT,
    priorReadinessSha256: readinessIdentity(bytes),
    immediatePredecessorOperationsCommit:
      READINESS_CARRY_FORWARD_IMMEDIATE_PREDECESSOR,
    operationsCommit: CARRY_FORWARD_OPERATIONS_COMMIT,
    carryForward: IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD,
    ...overrides
  };
}

function priorCarryForwardReportEvidence() {
  const sourceBytes = readinessBytes(
    READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT
  );
  const source = {
    bytes: sourceBytes,
    record: JSON.parse(sourceBytes),
    identity: readinessIdentity(sourceBytes)
  };
  const artifacts = createEnvironmentReadinessCarryForwardArtifacts(
    source,
    carryForwardOptions({
      operationsCommit: READINESS_CARRY_FORWARD_CHAIN_SOURCE
    })
  );
  return {
    bytes: artifacts.reportPayload,
    record: artifacts.report,
    identity: readinessIdentity(artifacts.reportPayload)
  };
}

function writeOriginalReadinessEvidence(root) {
  writeFileSync(
    preservedEnvironmentReadinessPath(
      root,
      READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT
    ),
    readinessBytes(READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT),
    { flag: "wx", mode: 0o600 }
  );
}

function chainedCarryForwardOptions(overrides = {}) {
  const sourceBytes = readinessBytes(READINESS_CARRY_FORWARD_CHAIN_SOURCE);
  return {
    sourceOperationsCommit: READINESS_CARRY_FORWARD_CHAIN_SOURCE,
    sourceReadinessSha256: readinessIdentity(sourceBytes),
    operationsCommit: CHAINED_OPERATIONS_COMMIT,
    carryForward: CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD,
    ...overrides
  };
}

function chainedInvocationOptions(overrides = {}) {
  const { sourceOperationsCommit, ...options } =
    chainedCarryForwardOptions(overrides);
  return options;
}

function syntheticExchange(paths) {
  const authority = readFileSync(paths.authority);
  const slot = readFileSync(paths.slot);
  writeFileSync(paths.authority, slot);
  writeFileSync(paths.slot, authority);
}

describe("Phase F1 environment-only readiness", () => {
  it("publishes readiness without requiring a release or creating artifacts", () => {
    const root = temporaryRoot();
    const releaseRoot = join(root, "releases");
    const artifactRoot = join(root, "artifacts");
    const target = publishEnvironmentReadiness(root, OPERATIONS_COMMIT, testDependencies());
    const record = JSON.parse(readFileSync(target, "utf8"));
    assert.equal(record.schemaVersion, ENVIRONMENT_READINESS_SCHEMA);
    assert.equal(record.operationsCommit, OPERATIONS_COMMIT);
    assert.equal(record.validations.releaseIntegrity, "NOT_EVALUATED");
    assert.equal(record.valuesRecorded, false);
    assert.equal(existsSync(releaseRoot), false);
    assert.equal(existsSync(artifactRoot), false);
    assert.equal(verifyEnvironmentReadiness(root, OPERATIONS_COMMIT, testDependencies()), true);
  });

  it("fails closed on stale operations identity and changed application identity", () => {
    const record = createEnvironmentReadiness(OPERATIONS_COMMIT);
    assert.throws(
      () => validateEnvironmentReadinessRecord(record, OTHER_OPERATIONS_COMMIT),
      /identity or validation state/u
    );
    assert.throws(
      () => validateEnvironmentReadinessRecord({ ...record, forwardApplicationSha: "c".repeat(40) }, OPERATIONS_COMMIT),
      /identity or validation state/u
    );
  });

  it("rejects overclaiming release integrity, unknown fields and unsupported modes", () => {
    const record = createEnvironmentReadiness(OPERATIONS_COMMIT);
    assert.throws(
      () => validateEnvironmentReadinessRecord({
        ...record,
        validations: { ...record.validations, releaseIntegrity: "PASSED" }
      }, OPERATIONS_COMMIT),
      /identity or validation state/u
    );
    assert.throws(
      () => validateEnvironmentReadinessRecord({ ...record, skipIntegrity: true }, OPERATIONS_COMMIT),
      /unknown or missing fields/u
    );
  });

  it("uses atomic no-replace publication and preserves an existing target", () => {
    const root = temporaryRoot();
    const target = join(root, "environment-readiness.json");
    writeFileSync(target, "EXISTING_READINESS_EVIDENCE\n", { flag: "wx" });
    assert.throws(
      () => publishEnvironmentReadiness(root, OPERATIONS_COMMIT, testDependencies()),
      (error) => error?.code === "EEXIST"
    );
    assert.equal(readFileSync(target, "utf8"), "EXISTING_READINESS_EVIDENCE\n");
  });

  it("does not publish when schema, required-name, shared, Redis or Resend checks fail", () => {
    for (const failure of [
      "BCN protected environment missing",
      "Circle Card protected environment missing",
      "build protected environment missing",
      "schema invalid",
      "required name absent",
      "shared equality failure",
      "Redis incomplete or conflicting",
      "Circle Card Resend identity reused",
      "protected metadata unsafe"
    ]) {
      const root = temporaryRoot();
      assert.throws(
        () => publishEnvironmentReadiness(root, OPERATIONS_COMMIT, testDependencies({
          validateSchema() { throw new Error(failure); }
        })),
        new RegExp(failure.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u")
      );
      assert.equal(existsSync(join(root, "environment-readiness.json")), false);
    }
  });

  it("does not publish when cross-user isolation fails", () => {
    const root = temporaryRoot();
    assert.throws(
      () => publishEnvironmentReadiness(root, OPERATIONS_COMMIT, testDependencies({
        verifyIsolation() { throw new Error("cross-user isolation failed"); }
      })),
      /cross-user isolation failed/u
    );
    assert.equal(existsSync(join(root, "environment-readiness.json")), false);
  });

  it("requires exact cross-user read and denial outcomes", () => {
    let invocation = 0;
    const expectedStatuses = [0, 1, 0, 1, 0, 1, 1];
    assert.equal(verifyCrossUserIsolation(() => ({ status: expectedStatuses[invocation++] })), true);
    for (const failedIndex of expectedStatuses.keys()) {
      invocation = 0;
      assert.throws(
        () => verifyCrossUserIsolation(() => {
          const index = invocation++;
          return { status: index === failedIndex ? (expectedStatuses[index] === 0 ? 1 : 0) : expectedStatuses[index] };
        }),
        /cross-user isolation failed/u
      );
    }
  });

  it("keeps environment contract validation independent of application releases", () => {
    const loaded = [];
    assert.throws(
      () => validateProtectedEnvironmentSchema((scope) => {
        loaded.push(scope);
        if (scope === "build") throw new Error("synthetic build environment unavailable");
        return {};
      }),
      /synthetic build environment unavailable/u
    );
    assert.deepEqual(loaded, ["bcn", "circle-card", "build"]);
  });

  it("fails closed on runtime identity or Circle Card automation drift", () => {
    assert.throws(
      () => validateRuntimeIdentityPolicy({
        bcn: {},
        "circle-card": { BCN_COMMUNITY_AUTOMATION_ENABLED: "true" }
      }),
      /runtime identity policy differs/u
    );
  });

  it("enforces protected metadata on Linux root", {
    skip: process.platform === "win32" || process.getuid?.() !== 0
  }, () => {
    const root = temporaryRoot();
    chmodSync(root, 0o700);
    const dependencies = {
      validateSchema() {},
      verifyIsolation() {}
    };
    const target = publishEnvironmentReadiness(root, OPERATIONS_COMMIT, dependencies);
    assert.equal(verifyEnvironmentReadiness(root, OPERATIONS_COMMIT, dependencies), true);
    chmodSync(target, 0o640);
    assert.throws(
      () => verifyEnvironmentReadiness(root, OPERATIONS_COMMIT, dependencies),
      /metadata is unsafe/u
    );
    chmodSync(target, 0o600);
    const alias = join(root, "readiness-hard-link.json");
    linkSync(target, alias);
    assert.throws(
      () => verifyEnvironmentReadiness(root, OPERATIONS_COMMIT, dependencies),
      /metadata is unsafe/u
    );
  });

  it("rejects unsupported CLI validation modes on Linux root", {
    skip: process.platform === "win32" || process.getuid?.() !== 0
  }, () => {
    const root = temporaryRoot();
    chmodSync(root, 0o700);
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL("environment-readiness.mjs", import.meta.url)),
      "skip-integrity",
      root,
      OPERATIONS_COMMIT
    ], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Usage: environment-readiness/u);
  });
});

describe("Phase F1 corrected ordering source contract", () => {
  const packRoot = new URL(".", import.meta.url);
  const source = (name) => readFileSync(new URL(name, packRoot), "utf8");

  it("keeps environment-only validation release-independent", () => {
    const validation = source("validate-environments.sh");
    assert.match(validation, /environment-readiness\.mjs" publish/u);
    assert.doesNotMatch(validation, /require_release_integrity/u);
    assert.doesNotMatch(validation, /validate-environment\.mjs" (?:bcn|circle-card)/u);
  });

  it("requires readiness before build and release integrity only after artifact creation", () => {
    const build = source("build-release.sh");
    assert.ok(build.indexOf("require_environment_ready") < build.indexOf("npm ci"));
    assert.ok(build.indexOf("require_release_integrity") > build.indexOf("release-create"));
  });

  it("separates immutable artifact publication from candidate selector publication", () => {
    const build = source("build-release.sh");
    const rollback = source("prepare-rollback-artifact.sh");
    const selector = source("publish-candidate-selector.sh");
    const selectorUtility = source("candidate-selector.mjs");
    const evidence = source("build-only-artifact.mjs");
    assert.doesNotMatch(build, /PHASE_F1_CURRENT_CIRCLE|current-circle-card|\bln -s\b/u);
    assert.doesNotMatch(rollback, /current-bcn-rollback-probe|\bln -s\b/u);
    assert.match(build, /build-only-artifact\.mjs" publish forward/u);
    assert.match(rollback, /build-only-artifact\.mjs" publish rollback/u);
    assert.match(selector, /require_release_integrity/u);
    assert.match(selector, /candidate-selector\.mjs" publish/u);
    assert.match(selectorUtility, /verifyBuildOnlyArtifactEvidence/u);
    assert.match(selectorUtility, /linkSync\(temporary, selector\)/u);
    assert.doesNotMatch(selectorUtility, /process\.env/u);
    assert.match(evidence, /selectorsPublished: false/u);
    assert.match(evidence, /assertBuildOnlySelectorBoundary/u);
    assert.match(evidence, /current-bcn-rollback-probe/u);
    assert.match(evidence, /current-circle-card/u);
    assert.match(evidence, /releaseIntegrity: "PASS"/u);
    assert.match(evidence, /publishNoReplaceSet/u);
  });

  it("requires both readiness and release integrity for full preflight and every start or traffic gate", () => {
    for (const name of [
      "preflight-read-only.sh",
      "start-systemd-candidates.sh",
      "probe-rollback-candidate.sh",
      "adopt-systemd-boot-owner.sh",
      "cutover-systemd.sh",
      "finalise-systemd.sh",
      "rollback-systemd.sh",
      "record-traffic-switch.sh",
      "remove-circle-card-traffic.sh"
    ]) {
      const body = source(name);
      assert.match(body, /require_environment_ready/u, name);
      assert.match(body, /require_release_integrity/u, name);
    }
  });

  it("has no generic release-integrity bypass", () => {
    const all = ["common.sh", "validate-environments.sh", "preflight-read-only.sh"]
      .map(source)
      .join("\n");
    assert.doesNotMatch(all, /SKIP_RELEASE_INTEGRITY|skip-integrity|bypass.*integrity/iu);
  });
});

describe("Phase F1 environment-readiness identity-only carry-forward", () => {
  it("preserves schema and semantics while atomically rebinding operations identity", () => {
    const root = temporaryRoot();
    const sourceBytes = readinessBytes(
      READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT
    );
    const authority = join(root, "environment-readiness.json");
    writeFileSync(authority, sourceBytes, { flag: "wx" });
    const options = carryForwardOptions();
    const result = publishCarriedForwardEnvironmentReadiness(options, {
      ...testDependencies(),
      stateRoot: root,
      assertProductionContext() {},
      exchange: syntheticExchange
    });
    const current = JSON.parse(readFileSync(authority, "utf8"));
    assert.equal(current.schemaVersion, ENVIRONMENT_READINESS_SCHEMA);
    assert.equal(current.operationsCommit, CARRY_FORWARD_OPERATIONS_COMMIT);
    assert.equal(
      classifyEnvironmentReadinessDelta(
        JSON.parse(sourceBytes),
        current
      ),
      IDENTITY_ONLY_READINESS_DELTA
    );
    assert.deepEqual(
      readFileSync(
        preservedEnvironmentReadinessPath(
          root,
          READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT
        )
      ),
      sourceBytes
    );
    assert.deepEqual(
      readFileSync(
        environmentReadinessExchangeSlotPath(
          root,
          CARRY_FORWARD_OPERATIONS_COMMIT
        )
      ),
      sourceBytes
    );
    const report = JSON.parse(readFileSync(
      environmentReadinessCarryForwardReportPath(
        root,
        CARRY_FORWARD_OPERATIONS_COMMIT
      ),
      "utf8"
    ));
    assert.equal(report.schemaVersion, ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA);
    assert.deepEqual(report.lineage, [
      READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT,
      READINESS_CARRY_FORWARD_IMMEDIATE_PREDECESSOR,
      CARRY_FORWARD_OPERATIONS_COMMIT
    ]);
    assert.equal(report.sourceReadinessSha256, options.priorReadinessSha256);
    assert.equal(report.carryForward, IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD);
    assert.equal(report.semanticDelta, IDENTITY_ONLY_READINESS_DELTA);
    assert.equal(report.sourcePreserved, true);
    assert.equal(report.valuesRecorded, false);
    assert.equal(result.semanticDelta, IDENTITY_ONLY_READINESS_DELTA);
    assert.equal(
      verifyEnvironmentReadiness(
        root,
        CARRY_FORWARD_OPERATIONS_COMMIT,
        testDependencies()
      ),
      true
    );
  });

  it("accepts only the exact source identity, identifier, and closed lineage", () => {
    const bytes = readinessBytes(READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT);
    const source = {
      bytes,
      record: JSON.parse(bytes),
      identity: readinessIdentity(bytes)
    };
    assert.doesNotThrow(() =>
      createEnvironmentReadinessCarryForwardArtifacts(source, carryForwardOptions())
    );
    for (const options of [
      carryForwardOptions({ priorReadinessSha256: "d".repeat(64) }),
      carryForwardOptions({ priorOperationsCommit: "d".repeat(40) }),
      carryForwardOptions({ immediatePredecessorOperationsCommit: "d".repeat(40) }),
      carryForwardOptions({ operationsCommit: READINESS_CARRY_FORWARD_IMMEDIATE_PREDECESSOR }),
      carryForwardOptions({ carryForward: "ARBITRARY_REBIND" }),
      { ...carryForwardOptions(), arbitrarySourcePath: "/tmp/readiness.json" }
    ]) {
      assert.throws(
        () => createEnvironmentReadinessCarryForwardArtifacts(source, options),
        /identity|lineage|identifier|unknown or missing|must differ/u
      );
    }
  });

  it("rejects every semantic readiness mutation", () => {
    const source = createEnvironmentReadiness(
      READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT
    );
    const candidate = createEnvironmentReadiness(CARRY_FORWARD_OPERATIONS_COMMIT);
    const mutations = [
      { ...candidate, authority: "release-ready" },
      { ...candidate, ready: false },
      { ...candidate, forwardApplicationSha: "d".repeat(40) },
      { ...candidate, rollbackApplicationSha: "d".repeat(40) },
      { ...candidate, historicalProductionSha: "d".repeat(40) },
      { ...candidate, valuesRecorded: true },
      {
        ...candidate,
        validations: {
          ...candidate.validations,
          bcnProtectedEnvironment: "FAILED"
        }
      },
      {
        ...candidate,
        validations: {
          ...candidate.validations,
          circleCardProtectedEnvironment: "FAILED"
        }
      },
      {
        ...candidate,
        validations: {
          ...candidate.validations,
          buildProtectedEnvironment: "FAILED"
        }
      },
      {
        ...candidate,
        validations: {
          ...candidate.validations,
          crossEnvironmentContract: "FAILED"
        }
      },
      {
        ...candidate,
        validations: {
          ...candidate.validations,
          crossUserIsolation: "FAILED"
        }
      },
      {
        ...candidate,
        validations: {
          ...candidate.validations,
          releaseIntegrity: "PASSED"
        }
      },
      { ...candidate, selectionPlanSha256: "d".repeat(64) }
    ];
    for (const mutation of mutations) {
      assert.equal(
        classifyEnvironmentReadinessDelta(source, mutation),
        "UNEXPECTED_SEMANTIC_DELTA"
      );
    }
  });

  it("rejects tampered or value-bearing lineage reports", () => {
    const bytes = readinessBytes(READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT);
    const source = {
      bytes,
      record: JSON.parse(bytes),
      identity: readinessIdentity(bytes)
    };
    const artifacts = createEnvironmentReadinessCarryForwardArtifacts(
      source,
      carryForwardOptions()
    );
    assert.equal(
      validateEnvironmentReadinessCarryForwardReport(
        artifacts.report,
        artifacts.report
      ),
      artifacts.report
    );
    for (const report of [
      { ...artifacts.report, semanticDelta: "SEMANTIC_CHANGE" },
      { ...artifacts.report, sourcePreserved: false },
      { ...artifacts.report, lineage: [...artifacts.report.lineage].reverse() },
      { ...artifacts.report, valueHash: "d".repeat(64) }
    ]) {
      assert.throws(
        () => validateEnvironmentReadinessCarryForwardReport(
          report,
          artifacts.report
        ),
        /invalid|unknown or missing/u
      );
    }
  });

  it("fails before publication when current environment semantics or isolation differ", () => {
    for (const failure of [
      "selection plan identity changed",
      "acquisition report identity changed",
      "BCN protected environment changed",
      "Circle Card protected environment changed",
      "build protected environment changed",
      "Redis decision changed",
      "LiveKit decision changed",
      "automation decision changed",
      "Circle Card Resend separation changed",
      "sender-domain result changed",
      "shared-environment rules changed",
      "cross-user isolation changed"
    ]) {
      const root = temporaryRoot();
      writeFileSync(
        join(root, "environment-readiness.json"),
        readinessBytes(READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT),
        { flag: "wx" }
      );
      assert.throws(() => publishCarriedForwardEnvironmentReadiness(
        carryForwardOptions(),
        {
          ...testDependencies(),
          stateRoot: root,
          assertProductionContext() {},
          validateSchema() { throw new Error(failure); },
          exchange: syntheticExchange
        }
      ), new RegExp(failure, "u"));
      assert.equal(
        existsSync(environmentReadinessCarryForwardReportPath(
          root,
          CARRY_FORWARD_OPERATIONS_COMMIT
        )),
        false
      );
    }
  });

  it("rejects partial publication state and preserves existing objects", () => {
    for (const existingPath of [
      (root) => preservedEnvironmentReadinessPath(
        root,
        READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT
      ),
      (root) => environmentReadinessExchangeSlotPath(
        root,
        CARRY_FORWARD_OPERATIONS_COMMIT
      ),
      (root) => environmentReadinessCarryForwardReportPath(
        root,
        CARRY_FORWARD_OPERATIONS_COMMIT
      )
    ]) {
      const root = temporaryRoot();
      writeFileSync(
        join(root, "environment-readiness.json"),
        readinessBytes(READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT),
        { flag: "wx" }
      );
      const target = existingPath(root);
      writeFileSync(target, "EXISTING\n", { flag: "wx" });
      assert.throws(() => publishCarriedForwardEnvironmentReadiness(
        carryForwardOptions(),
        {
          ...testDependencies(),
          stateRoot: root,
          assertProductionContext() {},
          exchange: syntheticExchange
        }
      ), /target already exists/u);
      assert.equal(readFileSync(target, "utf8"), "EXISTING\n");
    }
  });

  it("rejects unsafe source metadata on Linux root", {
    skip: process.platform === "win32" || process.getuid?.() !== 0
  }, () => {
    const root = temporaryRoot();
    chmodSync(root, 0o700);
    const authority = join(root, "environment-readiness.json");
    writeFileSync(
      authority,
      readinessBytes(READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT),
      { flag: "wx", mode: 0o600 }
    );
    const dependencies = {
      stateRoot: root,
      assertProductionContext() {},
      validateSchema() {},
      verifyIsolation() {},
      exchange: syntheticExchange
    };
    chmodSync(authority, 0o640);
    assert.throws(
      () => publishCarriedForwardEnvironmentReadiness(
        carryForwardOptions(),
        dependencies
      ),
      /metadata is unsafe/u
    );
    chmodSync(authority, 0o600);
    linkSync(authority, join(root, "readiness-hard-link.json"));
    assert.throws(
      () => publishCarriedForwardEnvironmentReadiness(
        carryForwardOptions(),
        dependencies
      ),
      /metadata is unsafe/u
    );
  });

  it("exposes no generic CLI rebinding or arbitrary path interface", () => {
    const source = readFileSync(
      new URL("environment-readiness.mjs", import.meta.url),
      "utf8"
    );
    assert.match(source, /IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD/u);
    assert.doesNotMatch(source, /--source-path|--destination-path|--patch-json|--set-field/u);
  });
});

describe("Phase F1 chained environment-readiness identity-only carry-forward", () => {
  it("resolves the unique protected authority lineage without a source allowlist", () => {
    const lineage = TRUSTED_LINEAGE;
    const identityBytes = new Map(lineage.map((commit) => [
      commit,
      Buffer.from(`${JSON.stringify({ operationsCommit: commit })}\n`)
    ]));
    const predecessorBySuccessor = new Map(
      lineage.slice(1).map((commit, index) => [commit, lineage[index]])
    );
    const readIdentity = (path) => {
      let commit;
      if (path.endsWith("approved-phase-f1-pack.json") &&
          !path.includes("phase-f1-identity-history")) {
        commit = lineage.at(-1);
      } else if (path.includes("phase-f1-identity-history")) {
        commit = path.split(/[\\/]/u).at(-2);
      } else {
        const successor = path.match(/exchange-([0-9a-f]{40})\.json$/u)?.[1];
        commit = predecessorBySuccessor.get(successor);
      }
      const bytes = identityBytes.get(commit);
      return { bytes, identity: { operationsCommit: commit }, sha256: readinessIdentity(bytes) };
    };
    assert.deepEqual(resolveProtectedAuthorityLineage(CHAINED_OPERATIONS_COMMIT, {
      readIdentity,
      verifyPack() {}
    }), lineage);
    assert.throws(() => resolveProtectedAuthorityLineage(CHAINED_OPERATIONS_COMMIT, {
      readIdentity(path) {
        if (path.includes(`exchange-${CHAINED_OPERATIONS_COMMIT}`)) {
          const bytes = identityBytes.get(INTERMEDIATE_OPERATIONS_COMMIT);
          return {
            bytes: Buffer.from(bytes).fill(0, 0, 1),
            identity: { operationsCommit: INTERMEDIATE_OPERATIONS_COMMIT },
            sha256: "0".repeat(64)
          };
        }
        return readIdentity(path);
      },
      verifyPack() {}
    }), /exchange lineage differs/u);
  });

  it("accepts every protected final authority hop and rejects reversed or missing hops", () => {
    const lineage = TRUSTED_LINEAGE;
    const readIdentity = (path, commit) => {
      const bytes = Buffer.from(`${JSON.stringify({ operationsCommit: commit })}\n`);
      return { bytes, identity: { operationsCommit: commit }, sha256: readinessIdentity(bytes) };
    };
    assert.equal(verifyProtectedAuthorityLineage(lineage, {
      readIdentity,
      verifyPack() {}
    }), true);
    assert.throws(() => verifyProtectedAuthorityLineage(
      [lineage[0], lineage[2], ...lineage.slice(3)],
      {
        readIdentity(path, commit) {
          if (path.includes(".exchange-") && commit === lineage[0]) {
            throw new Error("missing intermediate authority");
          }
          return readIdentity(path, commit);
        },
        verifyPack() {}
      }
    ), /missing intermediate authority/u);
    assert.throws(() => verifyProtectedAuthorityLineage(lineage, {
      readIdentity(path, commit) {
        if (path.includes(`.exchange-${lineage.at(-1)}`)) {
          const bytes = Buffer.from(`${JSON.stringify({ operationsCommit: lineage.at(-1) })}\n`);
          return {
            bytes,
            identity: { operationsCommit: commit },
            sha256: readinessIdentity(bytes)
          };
        }
        return readIdentity(path, commit);
      },
      verifyPack() {}
    }), /exchange lineage differs/u);
  });

  it("publishes a chained identity-only candidate while preserving source and prior report", () => {
    const root = temporaryRoot();
    const sourceBytes = readinessBytes(READINESS_CARRY_FORWARD_CHAIN_SOURCE);
    const authority = join(root, "environment-readiness.json");
    const priorReport = priorCarryForwardReportEvidence();
    const priorReportPath = environmentReadinessCarryForwardReportPath(
      root,
      READINESS_CARRY_FORWARD_CHAIN_SOURCE
    );
    writeFileSync(authority, sourceBytes, { flag: "wx" });
    writeFileSync(priorReportPath, priorReport.bytes, { flag: "wx" });
    writeOriginalReadinessEvidence(root);
    const result = publishChainedCarriedForwardEnvironmentReadiness(
      chainedInvocationOptions(),
      {
        ...testDependencies(),
        stateRoot: root,
        assertProductionContext() { return TRUSTED_LINEAGE; },
        exchange: syntheticExchange
      }
    );
    const current = JSON.parse(readFileSync(authority, "utf8"));
    assert.equal(current.operationsCommit, CHAINED_OPERATIONS_COMMIT);
    assert.equal(
      classifyEnvironmentReadinessDelta(JSON.parse(sourceBytes), current),
      IDENTITY_ONLY_READINESS_DELTA
    );
    assert.deepEqual(
      readFileSync(preservedEnvironmentReadinessPath(
        root,
        READINESS_CARRY_FORWARD_CHAIN_SOURCE
      )),
      sourceBytes
    );
    assert.deepEqual(readFileSync(priorReportPath), priorReport.bytes);
    const report = JSON.parse(readFileSync(
      environmentReadinessCarryForwardReportPath(
        root,
        CHAINED_OPERATIONS_COMMIT
      ),
      "utf8"
    ));
    assert.equal(
      report.schemaVersion,
      CHAINED_ENVIRONMENT_READINESS_CARRY_FORWARD_SCHEMA
    );
    assert.deepEqual(
      report.lineage,
      TRUSTED_LINEAGE
    );
    assert.equal(report.priorCarryForwardReportSha256, priorReport.identity);
    assert.equal(report.semanticDelta, IDENTITY_ONLY_READINESS_DELTA);
    assert.equal(report.sourcePreserved, true);
    assert.equal(report.valuesRecorded, false);
    assert.equal(result.semanticDelta, IDENTITY_ONLY_READINESS_DELTA);
  });

  it("derives a later chained source authority from protected readiness evidence", () => {
    const root = temporaryRoot();
    const f041Bytes = readinessBytes(READINESS_CARRY_FORWARD_CHAIN_SOURCE);
    const f041Source = {
      bytes: f041Bytes,
      record: JSON.parse(f041Bytes),
      identity: readinessIdentity(f041Bytes)
    };
    const directReport = priorCarryForwardReportEvidence();
    const sourceLineage = TRUSTED_LINEAGE.slice(0, -1);
    const chainedSource = createChainedEnvironmentReadinessCarryForwardArtifacts(
      f041Source,
      directReport,
      chainedCarryForwardOptions({
        operationsCommit: INTERMEDIATE_OPERATIONS_COMMIT
      }),
      sourceLineage
    );
    const authority = join(root, "environment-readiness.json");
    writeFileSync(authority, chainedSource.readinessPayload, { flag: "wx" });
    writeFileSync(
      environmentReadinessCarryForwardReportPath(
        root,
        INTERMEDIATE_OPERATIONS_COMMIT
      ),
      chainedSource.reportPayload,
      { flag: "wx" }
    );
    writeOriginalReadinessEvidence(root);
    const result = publishChainedCarriedForwardEnvironmentReadiness({
      sourceReadinessSha256: chainedSource.readinessIdentity,
      operationsCommit: CHAINED_OPERATIONS_COMMIT,
      carryForward: CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD
    }, {
      ...testDependencies(),
      stateRoot: root,
      assertProductionContext() { return TRUSTED_LINEAGE; },
      exchange: syntheticExchange
    });
    assert.equal(result.lineage.at(-2), INTERMEDIATE_OPERATIONS_COMMIT);
    assert.equal(
      JSON.parse(readFileSync(authority, "utf8")).operationsCommit,
      CHAINED_OPERATIONS_COMMIT
    );
    assert.throws(() => publishChainedCarriedForwardEnvironmentReadiness({
      sourceOperationsCommit: INTERMEDIATE_OPERATIONS_COMMIT,
      sourceReadinessSha256: chainedSource.readinessIdentity,
      operationsCommit: CHAINED_OPERATIONS_COMMIT,
      carryForward: CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD
    }, testDependencies({ stateRoot: root })), /unknown or missing fields/u);
  });

  it("rejects caller lineage, paths, identifiers, source drift and semantic mutation", () => {
    const sourceBytes = readinessBytes(READINESS_CARRY_FORWARD_CHAIN_SOURCE);
    const source = {
      bytes: sourceBytes,
      record: JSON.parse(sourceBytes),
      identity: readinessIdentity(sourceBytes)
    };
    const priorReport = priorCarryForwardReportEvidence();
    const artifacts = createChainedEnvironmentReadinessCarryForwardArtifacts(
      source,
      priorReport,
      chainedCarryForwardOptions(),
      TRUSTED_LINEAGE
    );
    assert.equal(
      validateChainedEnvironmentReadinessCarryForwardReport(
        artifacts.report,
        artifacts.report
      ),
      artifacts.report
    );
    for (const options of [
      chainedCarryForwardOptions({ sourceOperationsCommit: "e".repeat(40) }),
      chainedCarryForwardOptions({ sourceReadinessSha256: "e".repeat(64) }),
      chainedCarryForwardOptions({ operationsCommit: READINESS_CARRY_FORWARD_CHAIN_SOURCE }),
      chainedCarryForwardOptions({ carryForward: "REBIND_ANY_EVIDENCE" }),
      { ...chainedCarryForwardOptions(), lineage: ["e".repeat(40)] },
      { ...chainedCarryForwardOptions(), sourcePath: "/tmp/readiness.json" },
      { ...chainedCarryForwardOptions(), outputPath: "/tmp/current.json" }
    ]) {
      assert.throws(
        () => createChainedEnvironmentReadinessCarryForwardArtifacts(
          source,
          priorReport,
          options,
          TRUSTED_LINEAGE
        ),
        /identity|lineage|identifier|unknown or missing|must differ/u
      );
    }
    const changed = {
      ...source,
      record: { ...source.record, ready: false }
    };
    assert.throws(
      () => createChainedEnvironmentReadinessCarryForwardArtifacts(
        changed,
        priorReport,
        chainedCarryForwardOptions(),
        TRUSTED_LINEAGE
      ),
      /identity or validation state/u
    );
    for (const report of [
      { ...artifacts.report, lineage: [...artifacts.report.lineage].reverse() },
      { ...artifacts.report, semanticDelta: "SEMANTIC_CHANGE" },
      { ...artifacts.report, valueHash: "e".repeat(64) }
    ]) {
      assert.throws(
        () => validateChainedEnvironmentReadinessCarryForwardReport(
          report,
          artifacts.report
        ),
        /invalid|unknown or missing/u
      );
    }
  });

  it("rejects stale, unrelated, tampered and partial chained evidence", () => {
    const sourceBytes = readinessBytes(READINESS_CARRY_FORWARD_CHAIN_SOURCE);
    const source = {
      bytes: sourceBytes,
      record: JSON.parse(sourceBytes),
      identity: readinessIdentity(sourceBytes)
    };
    const validPriorReport = priorCarryForwardReportEvidence();
    for (const priorReport of [
      {
        ...validPriorReport,
        record: { ...validPriorReport.record, operationsCommit: "e".repeat(40) }
      },
      {
        ...validPriorReport,
        record: { ...validPriorReport.record, sourcePreserved: false }
      },
      {
        ...validPriorReport,
        identity: "e".repeat(64)
      }
    ]) {
      assert.throws(
        () => createChainedEnvironmentReadinessCarryForwardArtifacts(
          source,
          priorReport,
          chainedCarryForwardOptions(),
          TRUSTED_LINEAGE
        ),
        /report|lineage|identity|invalid/u
      );
    }
    for (const existingPath of [
      (root) => preservedEnvironmentReadinessPath(
        root,
        READINESS_CARRY_FORWARD_CHAIN_SOURCE
      ),
      (root) => environmentReadinessExchangeSlotPath(
        root,
        CHAINED_OPERATIONS_COMMIT
      ),
      (root) => environmentReadinessCarryForwardReportPath(
        root,
        CHAINED_OPERATIONS_COMMIT
      )
    ]) {
      const root = temporaryRoot();
      writeFileSync(join(root, "environment-readiness.json"), sourceBytes, {
        flag: "wx"
      });
      writeFileSync(
        environmentReadinessCarryForwardReportPath(
          root,
          READINESS_CARRY_FORWARD_CHAIN_SOURCE
        ),
        validPriorReport.bytes,
        { flag: "wx" }
      );
      writeOriginalReadinessEvidence(root);
      const target = existingPath(root);
      writeFileSync(target, "EXISTING\n", { flag: "wx" });
      assert.throws(() => publishChainedCarriedForwardEnvironmentReadiness(
        chainedInvocationOptions(),
        {
          ...testDependencies(),
          stateRoot: root,
          assertProductionContext() { return TRUSTED_LINEAGE; },
          exchange: syntheticExchange
        }
      ), /target already exists/u);
      assert.equal(readFileSync(target, "utf8"), "EXISTING\n");
    }
  });

  it("requires the exact protected original readiness named by prior lineage", () => {
    const root = temporaryRoot();
    const sourceBytes = readinessBytes(READINESS_CARRY_FORWARD_CHAIN_SOURCE);
    writeFileSync(join(root, "environment-readiness.json"), sourceBytes, {
      flag: "wx"
    });
    writeFileSync(
      environmentReadinessCarryForwardReportPath(
        root,
        READINESS_CARRY_FORWARD_CHAIN_SOURCE
      ),
      priorCarryForwardReportEvidence().bytes,
      { flag: "wx" }
    );
    assert.throws(() => publishChainedCarriedForwardEnvironmentReadiness(
      chainedInvocationOptions(),
      {
        ...testDependencies(),
        stateRoot: root,
        assertProductionContext() { return TRUSTED_LINEAGE; },
        exchange: syntheticExchange
      }
    ), /ENOENT|no such file/u);
    writeFileSync(
      preservedEnvironmentReadinessPath(
        root,
        READINESS_CARRY_FORWARD_SOURCE_OPERATIONS_COMMIT
      ),
      readinessBytes("e".repeat(40)),
      { flag: "wx" }
    );
    assert.throws(() => publishChainedCarriedForwardEnvironmentReadiness(
      chainedInvocationOptions(),
      {
        ...testDependencies(),
        stateRoot: root,
        assertProductionContext() { return TRUSTED_LINEAGE; },
        exchange: syntheticExchange
      }
    ), /identity or validation state/u);
  });

  it("rejects unsafe chained source and prior-report metadata on Linux root", {
    skip: process.platform === "win32" || process.getuid?.() !== 0
  }, () => {
    for (const unsafeTarget of ["source", "report"]) {
      const root = temporaryRoot();
      chmodSync(root, 0o700);
      const authority = join(root, "environment-readiness.json");
      const priorReportPath = environmentReadinessCarryForwardReportPath(
        root,
        READINESS_CARRY_FORWARD_CHAIN_SOURCE
      );
      writeFileSync(
        authority,
        readinessBytes(READINESS_CARRY_FORWARD_CHAIN_SOURCE),
        { flag: "wx", mode: 0o600 }
      );
      writeFileSync(
        priorReportPath,
        priorCarryForwardReportEvidence().bytes,
        { flag: "wx", mode: 0o600 }
      );
      writeOriginalReadinessEvidence(root);
      chmodSync(unsafeTarget === "source" ? authority : priorReportPath, 0o640);
      assert.throws(
        () => publishChainedCarriedForwardEnvironmentReadiness(
          chainedInvocationOptions(),
          {
            stateRoot: root,
            assertProductionContext() { return TRUSTED_LINEAGE; },
            validateSchema() {},
            verifyIsolation() {},
            exchange: syntheticExchange
          }
        ),
        /metadata is unsafe/u
      );
    }
  });

  it("retains the direct predecessor mechanism and exposes no generic rebinder", () => {
    const source = readFileSync(
      new URL("environment-readiness.mjs", import.meta.url),
      "utf8"
    );
    assert.match(source, /mode === "carry-forward"/u);
    assert.match(source, /mode === "carry-forward-chained"/u);
    assert.match(
      source,
      /CHAINED_IDENTITY_ONLY_ENVIRONMENT_READINESS_CARRY_FORWARD/u
    );
    assert.doesNotMatch(
      source,
      /--lineage|--source-path|--destination-path|--patch-json|--set-field/u
    );
  });
});
