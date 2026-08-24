import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  chownSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { APPLICATION_IDENTITIES, ROLLBACK_APPLICATION_SHA } from "./application-identities.mjs";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import {
  RETIREMENT_REPORT_SCHEMA,
  STALE_ROLLBACK_EVIDENCE_RETIREMENT,
  retireStaleRollbackEvidence
} from "./rollback-evidence-retirement.mjs";

const roots = [];
const sourceOperationsCommit = "a".repeat(40);
const currentOperationsCommit = "b".repeat(40);
const attemptId = "c".repeat(24);
const sha256 = value => createHash("sha256").update(value).digest("hex");

function applicationRecord() {
  const expected = APPLICATION_IDENTITIES.rollback;
  return {
    role: "rollback",
    applicationSha: ROLLBACK_APPLICATION_SHA,
    parentSha: expected.parentSha,
    reviewBaseSha: expected.reviewBaseSha ?? expected.parentSha,
    candidateFileSet: expected.files.map(({ path }) => path),
    candidateRawDiffSha256: "d".repeat(64),
    fileHashes: expected.files.map(({ path }) => ({ path, sha256: "e".repeat(64) }))
  };
}

function attemptRecord(path, overrides = {}) {
  return {
    format: "phase-f1-build-attempt-v2",
    role: "rollback",
    applicationSha: ROLLBACK_APPLICATION_SHA,
    operationsCommit: sourceOperationsCommit,
    attemptId,
    status: "prepared",
    path,
    ...overrides
  };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "phase-f1-retirement-"));
  roots.push(root);
  const buildRoot = join(root, "builds");
  mkdirSync(buildRoot);
  const workspace = join(buildRoot,
    `rollback-${ROLLBACK_APPLICATION_SHA}-20260824T193303.608108763Z-85c929088bcfbc10`);
  const application = Buffer.from(`${JSON.stringify(applicationRecord(), null, 2)}\n`);
  const attempt = Buffer.from(`${JSON.stringify(attemptRecord(workspace), null, 2)}\n`);
  writeFileSync(join(root, "rollback-application-identity.json"), application, { mode: 0o600 });
  writeFileSync(join(root, "rollback-build-attempt.json"), attempt, { mode: 0o600 });
  return {
    root,
    application,
    attempt,
    options: {
      stateRoot: root,
      applicationIdentitySha256: sha256(application),
      buildAttemptSha256: sha256(attempt),
      currentOperationsCommit,
      retirement: STALE_ROLLBACK_EVIDENCE_RETIREMENT
    }
  };
}

function dependencies(extra = {}) {
  return {
    operational: false,
    resolveLineage: () => ["0".repeat(40), sourceOperationsCommit, currentOperationsCommit],
    verifyWorkspace: (_path, record) => assert.deepEqual(record, applicationRecord()),
    publish: (entries) => publishNoReplaceSet(entries, {
      enforceMetadata: false,
      fsyncDirectories: false
    }),
    fsyncDirectory() {},
    ...extra
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Phase F1 stale trusted rollback evidence retirement", () => {
  it("retires the dependent pair, preserves exact bytes, and opens canonical slots", () => {
    const value = fixture();
    const result = retireStaleRollbackEvidence(value.options, dependencies());
    assert.equal(result.canonicalSlots, "ABSENT");
    assert.equal(result.historicalPreservation, "VERIFIED");
    assert.equal(existsSync(join(value.root, "rollback-application-identity.json")), false);
    assert.equal(existsSync(join(value.root, "rollback-build-attempt.json")), false);
    assert.deepEqual(readFileSync(result.historyPaths.application), value.application);
    assert.deepEqual(readFileSync(result.historyPaths.attempt), value.attempt);
    const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
    assert.equal(report.schemaVersion, RETIREMENT_REPORT_SCHEMA);
    assert.equal(report.result, "RETIRED");
    assert.equal(report.canonicalApplicationIdentity, "ABSENT");
    assert.equal(report.canonicalBuildAttempt, "ABSENT");
    assert.equal(report.valueMaterialRecorded, false);
    assert.doesNotThrow(() => retireStaleRollbackEvidence(value.options, dependencies()));
  });

  it("recovers safely after only the application-identity canonical was removed", () => {
    const value = fixture();
    let unlinks = 0;
    assert.throws(() => retireStaleRollbackEvidence(value.options, dependencies({
      unlink(path) {
        unlinks += 1;
        if (unlinks === 2) throw new Error("synthetic interruption");
        unlinkSync(path);
      }
    })), /synthetic interruption/u);
    assert.equal(existsSync(join(value.root, "rollback-application-identity.json")), false);
    assert.equal(existsSync(join(value.root, "rollback-build-attempt.json")), true);
    const result = retireStaleRollbackEvidence(value.options, dependencies());
    assert.equal(result.canonicalSlots, "ABSENT");
    assert.deepEqual(readFileSync(result.historyPaths.application), value.application);
    assert.deepEqual(readFileSync(result.historyPaths.attempt), value.attempt);
  });

  it("rejects current authority, untrusted lineage, identity drift, and active use", () => {
    for (const mutation of [
      (value) => { value.options.currentOperationsCommit = sourceOperationsCommit; },
      (value) => { value.options.applicationIdentitySha256 = "f".repeat(64); },
      (value) => { value.options.buildAttemptSha256 = "f".repeat(64); }
    ]) {
      const value = fixture();
      mutation(value);
      assert.throws(() => retireStaleRollbackEvidence(value.options, dependencies()));
    }
    const untrusted = fixture();
    assert.throws(() => retireStaleRollbackEvidence(untrusted.options, dependencies({
      resolveLineage: () => ["0".repeat(40), currentOperationsCommit]
    })), /trusted predecessor/u);
    const active = fixture();
    assert.throws(() => retireStaleRollbackEvidence(active.options, dependencies({
      verifyWorkspace: () => { throw new Error("active workspace"); }
    })), /active workspace/u);
  });

  it("rejects unsupported records, mismatched pair verification, and arbitrary options", () => {
    const wrongCommit = fixture();
    const current = JSON.parse(wrongCommit.attempt.toString("utf8"));
    const changed = Buffer.from(`${JSON.stringify({ ...current, applicationSha: "f".repeat(40) }, null, 2)}\n`);
    writeFileSync(join(wrongCommit.root, "rollback-build-attempt.json"), changed);
    wrongCommit.options.buildAttemptSha256 = sha256(changed);
    assert.throws(() => retireStaleRollbackEvidence(wrongCommit.options, dependencies()), /unsupported/u);

    const mismatch = fixture();
    assert.throws(() => retireStaleRollbackEvidence(mismatch.options, dependencies({
      verifyWorkspace: () => { throw new Error("pair mismatch"); }
    })), /pair mismatch/u);

    const arbitrary = fixture();
    assert.throws(() => retireStaleRollbackEvidence({
      ...arbitrary.options,
      sourcePath: "/tmp/arbitrary"
    }, dependencies()), /unknown or missing/u);
  });

  it("rejects conflicting unplanned history", () => {
    const conflict = fixture();
    writeFileSync(join(conflict.root,
      `rollback-application-identity-preserved-${sourceOperationsCommit}-${attemptId}.json`),
    conflict.application, { mode: 0o600 });
    assert.throws(() => retireStaleRollbackEvidence(conflict.options, dependencies()),
      /without its protected retirement plan/u);
  });

  it("rejects symlinked canonical evidence", { skip: process.platform === "win32" }, () => {
    const linked = fixture();
    unlinkSync(join(linked.root, "rollback-application-identity.json"));
    symlinkSync(join(linked.root, "rollback-build-attempt.json"),
      join(linked.root, "rollback-application-identity.json"));
    assert.throws(() => retireStaleRollbackEvidence(linked.options, dependencies()), /metadata is unsafe/u);
  });

  it("rejects unsafe mode and hard-link ambiguity", { skip: process.platform === "win32" }, () => {
    const mode = fixture();
    chmodSync(join(mode.root, "rollback-application-identity.json"), 0o640);
    assert.throws(() => retireStaleRollbackEvidence(mode.options,
      dependencies({ enforceMetadata: true })), /metadata is unsafe/u);

    const linked = fixture();
    linkSync(join(linked.root, "rollback-build-attempt.json"), join(linked.root, "extra-link"));
    assert.throws(() => retireStaleRollbackEvidence(linked.options,
      dependencies({ enforceMetadata: true })), /metadata is unsafe/u);
  });

  it("rejects wrong protected owner", {
    skip: process.platform === "win32" || process.getuid?.() !== 0
  }, () => {
    const value = fixture();
    chownSync(join(value.root, "rollback-application-identity.json"), 65534, 65534);
    assert.throws(() => retireStaleRollbackEvidence(value.options,
      dependencies({ enforceMetadata: true })), /metadata is unsafe/u);
  });

  it("refuses a completed report if either canonical slot reappears", () => {
    const value = fixture();
    const result = retireStaleRollbackEvidence(value.options, dependencies());
    writeFileSync(join(value.root, "rollback-build-attempt.json"), value.attempt, { mode: 0o600 });
    assert.throws(() => retireStaleRollbackEvidence(value.options, dependencies()),
      /retains a canonical source/u);
    assert.equal(existsSync(result.reportPath), true);
  });
});
