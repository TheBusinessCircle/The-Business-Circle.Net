import assert from "node:assert/strict";
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
  ENVIRONMENT_READINESS_SCHEMA,
  createEnvironmentReadiness,
  publishEnvironmentReadiness,
  validateEnvironmentReadinessRecord,
  verifyCrossUserIsolation,
  verifyEnvironmentReadiness
} from "./environment-readiness.mjs";
import {
  validateProtectedEnvironmentSchema,
  validateRuntimeIdentityPolicy
} from "./validate-environment.mjs";

const OPERATIONS_COMMIT = "a".repeat(40);
const OTHER_OPERATIONS_COMMIT = "b".repeat(40);
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
