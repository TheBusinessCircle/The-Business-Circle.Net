import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { consumeBuildAttempt, createBuildAttempt, finishBuildAttempt, inspectBuildAttempt } from "./build-state.mjs";
import {
  APPROVED_TARGET_PLATFORM,
  evaluateOfflineCache,
  packageIntegrityContract,
  packagePlatformApplicable,
  validateFailedCachePreparationLog,
  validateSealedNotReadyRecoveryContract
} from "./offline-npm-cache.mjs";

const roots = [];
const temporaryRoot = () => { const root = mkdtempSync(join(tmpdir(), "phase-f1-build-state-")); roots.push(root); return root; };
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const applicationSha = "a".repeat(40), operationsCommit = "b".repeat(40);

describe("Phase F1 operations-bound build-attempt handoff", () => {
  it("publishes, inspects, consumes and finishes one protected JSON authority", () => {
    const root = temporaryRoot(), workspace = join(root, "builds", `rollback-${applicationSha}-fixture`), evidence = join(root, "rollback-build-attempt.json");
    mkdirSync(workspace, { recursive: true });
    const identity = { role: "rollback", applicationSha, operationsCommit };
    const created = createBuildAttempt(evidence, { ...identity, workspace, attemptId: "c".repeat(24) });
    assert.deepEqual(inspectBuildAttempt(evidence, identity), created);
    assert.equal(consumeBuildAttempt(evidence, identity).status, "consumed");
    assert.equal(finishBuildAttempt(evidence, "complete", operationsCommit).status, "complete");
    assert.throws(() => consumeBuildAttempt(evidence, identity), /stale|reused/u);
  });

  it("rejects stale identities, unexpected paths, symlinks and hard links", () => {
    const root = temporaryRoot(), workspace = join(root, "builds", `rollback-${applicationSha}-fixture`), evidence = join(root, "attempt.json");
    mkdirSync(workspace, { recursive: true });
    const identity = { role: "rollback", applicationSha, operationsCommit };
    createBuildAttempt(evidence, { ...identity, workspace, attemptId: "d".repeat(24) });
    assert.throws(() => inspectBuildAttempt(evidence, { ...identity, operationsCommit: "e".repeat(40) }), /another identity/u);
    const linked = join(root, "linked.json"); linkSync(evidence, linked);
    assert.throws(() => inspectBuildAttempt(evidence, identity), /unsafe/iu);
    rmSync(linked);
    if (process.platform !== "win32") {
      const target = join(root, "target.json"), symbolic = join(root, "symbolic.json"); writeFileSync(target, readFileSync(evidence)); symlinkSync(target, symbolic);
      assert.throws(() => inspectBuildAttempt(symbolic, identity), /unsafe/iu);
    }
    const record = JSON.parse(readFileSync(evidence, "utf8")); record.path = resolve(root, "arbitrary"); writeFileSync(evidence, `${JSON.stringify(record)}\n`);
    assert.throws(() => inspectBuildAttempt(evidence, identity), /invalid build-attempt/iu);
  });
});

function cacheFixture() {
  const root = temporaryRoot(), cache = join(root, "cache"), lockfile = join(root, "package-lock.json"), body = Buffer.from("synthetic registry tarball");
  const digest = createHash("sha512").update(body).digest(), integrity = `sha512-${digest.toString("base64")}`, hex = digest.toString("hex");
  const content = join(cache, "_cacache", "content-v2", "sha512", hex.slice(0, 2), hex.slice(2, 4), hex.slice(4));
  mkdirSync(dirname(content), { recursive: true }); writeFileSync(content, body);
  writeFileSync(lockfile, `${JSON.stringify({ lockfileVersion: 3, packages: { "": {}, "node_modules/fixture": { resolved: "https://registry.npmjs.org/fixture/-/fixture-1.0.0.tgz", integrity } } })}\n`);
  return { cache, lockfile, content };
}

describe("Phase F1 offline npm cache readiness", () => {
  it("accepts complete exact-integrity content and rejects missing or changed content", () => {
    const fixture = cacheFixture();
    assert.equal(evaluateOfflineCache(fixture.cache, fixture.lockfile, {
      enforceMetadata: false,
      targetPlatform: APPROVED_TARGET_PLATFORM
    }).requiredTargetIntegrityCount, 1);
    writeFileSync(fixture.content, "changed");
    assert.throws(() => evaluateOfflineCache(fixture.cache, fixture.lockfile, {
      enforceMetadata: false,
      targetPlatform: APPROVED_TARGET_PLATFORM
    }), /integrity/u);
    rmSync(fixture.content);
    assert.throws(() => evaluateOfflineCache(fixture.cache, fixture.lockfile, {
      enforceMetadata: false,
      targetPlatform: APPROVED_TARGET_PLATFORM
    }), /required target-platform/u);
  });

  it("rejects non-registry sources, symlinks and unsafe cache modes", () => {
    const fixture = cacheFixture();
    const lock = JSON.parse(readFileSync(fixture.lockfile, "utf8")); lock.packages["node_modules/fixture"].resolved = "https://example.invalid/package.tgz"; writeFileSync(fixture.lockfile, `${JSON.stringify(lock)}\n`);
    assert.throws(() => evaluateOfflineCache(fixture.cache, fixture.lockfile, {
      enforceMetadata: false,
      targetPlatform: APPROVED_TARGET_PLATFORM
    }), /non-registry/u);
    const fresh = cacheFixture();
    if (process.platform !== "win32") {
      const linked = join(dirname(fresh.content), "linked-content"); symlinkSync(fresh.content, linked);
      assert.throws(() => evaluateOfflineCache(fresh.cache, fresh.lockfile, {
        enforceMetadata: false,
        targetPlatform: APPROVED_TARGET_PLATFORM
      }), /linked|special/u);
    }
    if (process.platform !== "win32") {
      chmodSync(fresh.cache, 0o777);
      assert.throws(() => evaluateOfflineCache(fresh.cache, fresh.lockfile, {
        targetPlatform: APPROVED_TARGET_PLATFORM
      }), /metadata|mode/u);
    }
  });

  it("implements npm 10.9.7 positive, negative and combined platform constraints", () => {
    const target = APPROVED_TARGET_PLATFORM;
    assert.deepEqual(packagePlatformApplicable({ os: ["linux"] }, target), { applicable: true, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ os: ["darwin", "win32"] }, target), { applicable: false, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ os: ["!linux"] }, target), { applicable: false, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ os: ["!darwin"] }, target), { applicable: true, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ cpu: ["x64"] }, target), { applicable: true, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ cpu: ["arm64"] }, target), { applicable: false, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ cpu: ["!x64"] }, target), { applicable: false, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ os: ["linux"], cpu: ["x64"] }, target), { applicable: true, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ os: ["linux"], cpu: ["arm64"] }, target), { applicable: false, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ os: ["darwin"], cpu: ["x64"] }, target), { applicable: false, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ os: ["linux", "darwin"], cpu: ["!arm64"] }, target), { applicable: true, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ libc: ["glibc"] }, target), { applicable: true, constrained: true });
    assert.deepEqual(packagePlatformApplicable({ libc: ["musl"] }, target), { applicable: false, constrained: true });
  });

  it("excludes only optional integrities proven inapplicable to Linux x64 glibc", () => {
    const integrity = (character) => `sha512-${Buffer.alloc(64, character).toString("base64")}`;
    const lockfile = {
      lockfileVersion: 3,
      packages: {
        "": {},
        "node_modules/darwin": { resolved: "https://registry.npmjs.org/darwin/-/darwin-1.0.0.tgz", integrity: integrity(1), optional: true, os: ["darwin"] },
        "node_modules/win32": { resolved: "https://registry.npmjs.org/win32/-/win32-1.0.0.tgz", integrity: integrity(2), optional: true, os: ["win32"] },
        "node_modules/arm64": { resolved: "https://registry.npmjs.org/arm64/-/arm64-1.0.0.tgz", integrity: integrity(3), optional: true, cpu: ["arm64"] },
        "node_modules/linux": { resolved: "https://registry.npmjs.org/linux/-/linux-1.0.0.tgz", integrity: integrity(4), optional: true, os: ["linux"], cpu: ["x64"] },
        "node_modules/unconstrained": { resolved: "https://registry.npmjs.org/unconstrained/-/unconstrained-1.0.0.tgz", integrity: integrity(5), optional: true },
        "node_modules/strict": { resolved: "https://registry.npmjs.org/strict/-/strict-1.0.0.tgz", integrity: integrity(6), os: ["darwin"] }
      }
    };
    const result = packageIntegrityContract(lockfile, APPROVED_TARGET_PLATFORM);
    assert.equal(result.totalLockfileIntegrityCount, 6);
    assert.equal(result.optionalInapplicableIntegrities.length, 3);
    assert.equal(result.requiredTargetIntegrities.length, 3);
    assert.ok(result.requiredTargetIntegrities.includes(integrity(4)));
    assert.ok(result.requiredTargetIntegrities.includes(integrity(5)));
    assert.ok(result.requiredTargetIntegrities.includes(integrity(6)));
  });

  it("still rejects missing optional artifacts applicable to the target", () => {
    const fixture = cacheFixture();
    const lock = JSON.parse(readFileSync(fixture.lockfile, "utf8"));
    lock.packages["node_modules/fixture"].optional = true;
    lock.packages["node_modules/fixture"].os = ["linux"];
    lock.packages["node_modules/fixture"].cpu = ["x64"];
    writeFileSync(fixture.lockfile, `${JSON.stringify(lock)}\n`);
    rmSync(fixture.content);
    assert.throws(() => evaluateOfflineCache(fixture.cache, fixture.lockfile, {
      enforceMetadata: false,
      targetPlatform: APPROVED_TARGET_PLATFORM
    }), /required target-platform/u);
  });

  it("accepts a missing optional artifact only with proven target inapplicability", () => {
    const fixture = cacheFixture();
    const lock = JSON.parse(readFileSync(fixture.lockfile, "utf8"));
    lock.packages["node_modules/fixture"].optional = true;
    lock.packages["node_modules/fixture"].os = ["darwin"];
    writeFileSync(fixture.lockfile, `${JSON.stringify(lock)}\n`);
    rmSync(fixture.content);
    const result = evaluateOfflineCache(fixture.cache, fixture.lockfile, {
      enforceMetadata: false,
      targetPlatform: APPROVED_TARGET_PLATFORM
    });
    assert.equal(result.requiredTargetIntegrityCount, 0);
    assert.equal(result.optionalInapplicableIntegrityCount, 1);
    assert.equal(result.missingRequiredTargetIntegrityCount, 0);
  });

  it("fails closed for malformed or unsupported platform metadata", () => {
    for (const entry of [
      { os: "linux" },
      { cpu: [] },
      { libc: ["glibc", "glibc"] },
      { os: ["linux x64"] },
      { cpu: [42] }
    ]) {
      assert.throws(() => packagePlatformApplicable(entry, APPROVED_TARGET_PLATFORM), /constraint/u);
    }
    assert.throws(() => packagePlatformApplicable({}, { os: "linux", cpu: "x64" }), /schema/u);
  });

  it("accepts only the complete value-free SEALED_NOT_READY recovery classification", () => {
    const approved = {
      activeWriterAbsent: true,
      authorityCurrent: true,
      cacheMetadataTrusted: true,
      nodeNpmExact: true,
      offlineResolutionPending: true,
      promotionAbsent: true,
      readinessAbsent: true,
      requiredCompleteness: true,
      runtimeMutationIsolated: true,
      valuesRecorded: false,
      workspaceClean: true
    };
    assert.equal(validateSealedNotReadyRecoveryContract(approved), "SEALED_NOT_READY_REVERIFY_APPROVED");
    for (const key of Object.keys(approved).filter((name) => name !== "valuesRecorded")) {
      assert.throws(() => validateSealedNotReadyRecoveryContract({ ...approved, [key]: false }), /precondition/u);
    }
    assert.throws(() => validateSealedNotReadyRecoveryContract({ ...approved, valuesRecorded: true }), /value-free/u);
    assert.throws(() => validateSealedNotReadyRecoveryContract({ ...approved, arbitraryPath: "/tmp/cache" }), /schema/u);
  });

  it("binds sealed-cache recovery to one trusted failed preparation and pack identity", () => {
    const commit = "a".repeat(40);
    const identity = {
      operationsCommit: commit,
      archiveSha256: "b".repeat(64),
      manifestSha256: "c".repeat(64)
    };
    const log = [
      "Operation: prepare-offline-npm-cache",
      "Forward application SHA: b43a1e4e708bc9f02ef83bd63dab1db1f366b32e",
      "Rollback application SHA: 5d1f81bb05a01b08e1134785c2f86b77c8969fe3",
      `Operations commit: ${commit}`,
      `Pack archive SHA-256: ${identity.archiveSha256}`,
      `Pack manifest SHA-256: ${identity.manifestSha256}`,
      "Error: Offline npm cache is incomplete for the approved lockfile."
    ].join("\n");
    assert.equal(validateFailedCachePreparationLog(log, identity, [commit]), commit);
    assert.throws(() => validateFailedCachePreparationLog(log, identity, ["d".repeat(40)]), /untrusted/u);
    assert.throws(() => validateFailedCachePreparationLog(`${log}\nOFFLINE_NPM_CACHE_READY`, identity, [commit]), /untrusted/u);
    assert.throws(() => validateFailedCachePreparationLog(log, { ...identity, manifestSha256: "e".repeat(64) }, [commit]), /untrusted/u);
  });
});
