import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  APPLICATION_IDENTITIES,
  ROLLBACK_APPLICATION_SHA
} from "./application-identities.mjs";
import {
  FAILED_ROLLBACK_ATTEMPT_RECOVERY,
  FAILED_ROLLBACK_CLASSIFICATION,
  recoverFailedRollbackAttempt,
  validateFailedRollbackRecoveryFacts
} from "./failed-rollback-attempt-recovery.mjs";

const operationsCommit = "a".repeat(40);
const roots = [];
const sha256 = value => createHash("sha256").update(value).digest("hex");

function applicationIdentity() {
  const expected = APPLICATION_IDENTITIES.rollback;
  return {
    role: "rollback",
    applicationSha: ROLLBACK_APPLICATION_SHA,
    parentSha: expected.parentSha,
    reviewBaseSha: expected.reviewBaseSha ?? expected.parentSha,
    candidateFileSet: expected.files.map(({ path }) => path),
    candidateRawDiffSha256: "b".repeat(64),
    fileHashes: expected.files.map(({ path }, index) => ({
      path,
      sha256: String(index + 1).repeat(64).slice(0, 64)
    }))
  };
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function fixture({ status = "failed", outside = false, sourceOperationsCommit = operationsCommit } = {}) {
  const root = mkdtempSync(join(tmpdir(), "phase-f1-failed-rollback-"));
  roots.push(root);
  const buildRoot = join(root, "builds");
  const stateRoot = join(root, "state");
  mkdirSync(buildRoot);
  mkdirSync(stateRoot);
  const workspaceName =
    `rollback-${ROLLBACK_APPLICATION_SHA}-20260826T094420.056360625Z-5d081b4f7eafbc7e`;
  const parent = outside ? join(root, "outside") : buildRoot;
  if (outside) mkdirSync(parent);
  const workspace = join(parent, workspaceName);
  mkdirSync(workspace, { mode: 0o750 });
  chmodSync(workspace, 0o750);
  mkdirSync(join(workspace, "node_modules"));
  const residue = join(
    buildRoot,
    `rollback-fixture-${ROLLBACK_APPLICATION_SHA}-${workspaceName}`
  );
  mkdirSync(residue, { mode: 0o750 });
  chmodSync(residue, 0o750);
  const application = applicationIdentity();
  const attempt = {
    format: "phase-f1-build-attempt-v2",
    role: "rollback",
    applicationSha: ROLLBACK_APPLICATION_SHA,
    operationsCommit: sourceOperationsCommit,
    path: workspace,
    attemptId: "1".repeat(24),
    status
  };
  const applicationPath = join(stateRoot, "rollback-application-identity.json");
  const attemptPath = join(stateRoot, "rollback-build-attempt.json");
  const recheckPath = join(stateRoot, "rollback-application-identity.recheck.json");
  writeJson(applicationPath, application);
  writeJson(attemptPath, attempt);
  writeJson(recheckPath, application);
  const attemptIdentity = sha256(readFileSync(attemptPath));
  return {
    root, buildRoot, stateRoot, workspace, residue, attemptIdentity,
    applicationPath, attemptPath, recheckPath
  };
}

function dependencies(overrides = {}) {
  return {
    verifyWorkspace: () => true,
    workspaceMountpoint: false,
    workspaceActiveReference: false,
    workspaceSelectorReference: false,
    fixtureMountpoint: false,
    fixtureActiveReference: false,
    fixtureSelectorReference: false,
    artifactStatePresent: false,
    candidatePortsBound: false,
    resolveLineage: () => [operationsCommit],
    activeReference: () => false,
    fsyncDirectory: () => {},
    ...overrides
  };
}

function options(value) {
  return {
    stateRoot: value.stateRoot,
    buildRoot: value.buildRoot,
    buildAttemptSha256: value.attemptIdentity,
    operationsCommit,
    recovery: FAILED_ROLLBACK_ATTEMPT_RECOVERY,
    operational: false,
    enforceMetadata: false
  };
}

const validFacts = (overrides = {}) => ({
  operationsCommit,
  attemptIdentity: "c".repeat(64),
  status: "failed",
  applicationSha: ROLLBACK_APPLICATION_SHA,
  role: "rollback",
  workspaceCanonical: true,
  workspaceParentExact: true,
  workspaceDirectory: true,
  workspaceSymlink: false,
  workspaceUid: 1001,
  workspaceGid: 1001,
  workspaceMode: 0o750,
  expectedUid: 1001,
  expectedGid: 1001,
  workspaceSameFilesystem: true,
  workspaceMountpoint: false,
  workspaceActiveReference: false,
  workspaceSelectorReference: false,
  workspaceTrackedIdentity: true,
  nodeModulesDirectory: true,
  nodeModulesSymlink: false,
  nextOutputAbsent: true,
  fixtureCanonical: true,
  fixtureParentExact: true,
  fixtureDirectory: true,
  fixtureSymlink: false,
  fixtureUid: 1001,
  fixtureGid: 1001,
  fixtureMode: 0o750,
  fixtureSameFilesystem: true,
  fixtureMountpoint: false,
  fixtureActiveReference: false,
  fixtureSelectorReference: false,
  fixtureEmpty: true,
  artifactStatePresent: false,
  candidatePortsBound: false,
  ...overrides
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Phase F1 failed current-authority rollback attempt recovery", () => {
  it("accepts only the exact failed-before-publication recovery class", () => {
    assert.equal(
      validateFailedRollbackRecoveryFacts(validFacts()),
      FAILED_ROLLBACK_CLASSIFICATION
    );
    for (const changed of [
      { status: "prepared" }, { status: "complete" },
      { applicationSha: "d".repeat(40) }, { role: "forward" },
      { workspaceCanonical: false }, { workspaceParentExact: false },
      { workspaceSymlink: true }, { workspaceSameFilesystem: false },
      { workspaceMountpoint: true }, { workspaceActiveReference: true },
      { workspaceSelectorReference: true }, { workspaceTrackedIdentity: false },
      { nodeModulesDirectory: false }, { nodeModulesSymlink: true },
      { nextOutputAbsent: false }, { fixtureCanonical: false },
      { fixtureParentExact: false }, { fixtureSymlink: true },
      { fixtureActiveReference: true }, { fixtureSelectorReference: true },
      { fixtureEmpty: false }, { artifactStatePresent: true },
      { candidatePortsBound: true }, { workspaceMode: 0o777 }, { fixtureMode: 0o777 }
    ]) {
      assert.throws(
        () => validateFailedRollbackRecoveryFacts(validFacts(changed)),
        /exact protected recovery target/u
      );
    }
  });

  it("archives byte-identical audit evidence, removes only exact disposable state and is idempotent", () => {
    const value = fixture();
    const first = recoverFailedRollbackAttempt(options(value), dependencies());
    assert.equal(first.canonicalRetryState, "READY");
    assert.equal(first.auditPreservation, "VERIFIED");
    for (const path of [
      value.workspace, value.residue, value.applicationPath, value.attemptPath, value.recheckPath
    ]) assert.equal(existsSync(path), false);
    for (const path of Object.values(first.historyPaths)) assert.equal(existsSync(path), true);
    assert.equal(sha256(readFileSync(first.historyPaths.attempt)), value.attemptIdentity);
    const second = recoverFailedRollbackAttempt(options(value), dependencies());
    assert.equal(second.reportIdentity, first.reportIdentity);
    assert.equal(second.canonicalRetryState, "READY");
  });

  it("accepts a protected predecessor attempt and rejects an unrelated source authority", () => {
    const predecessor = "b".repeat(40);
    const trusted = fixture({ sourceOperationsCommit: predecessor });
    const result = recoverFailedRollbackAttempt(options(trusted), dependencies({
      resolveLineage: () => [predecessor, operationsCommit]
    }));
    assert.equal(result.canonicalRetryState, "READY");

    const unrelated = fixture({ sourceOperationsCommit: predecessor });
    assert.throws(() => recoverFailedRollbackAttempt(options(unrelated), dependencies({
      resolveLineage: () => ["c".repeat(40), operationsCommit]
    })), /not on the protected lineage/u);
    assert.equal(existsSync(unrelated.workspace), true);
  });

  it("resumes safely after protected history publication and partial exact cleanup", () => {
    const value = fixture();
    let removals = 0;
    assert.throws(() => recoverFailedRollbackAttempt(options(value), dependencies({
      remove(path) {
        removals += 1;
        if (removals === 2) throw new Error("synthetic interruption");
        rmSync(path, { recursive: true, force: false });
      }
    })), /synthetic interruption/u);
    assert.equal(existsSync(value.workspace), false);
    assert.equal(existsSync(value.residue), true);
    assert.equal(existsSync(value.attemptPath), true);
    const resumed = recoverFailedRollbackAttempt(options(value), dependencies());
    assert.equal(resumed.canonicalRetryState, "READY");
    assert.equal(existsSync(value.residue), false);
    assert.equal(existsSync(value.attemptPath), false);
  });

  it("rejects the wrong attempt identity, successful state, arbitrary workspace and published artifact", () => {
    const wrongIdentity = fixture();
    assert.throws(() => recoverFailedRollbackAttempt({
      ...options(wrongIdentity), buildAttemptSha256: "f".repeat(64)
    }, dependencies()), /identity differs/u);

    const successful = fixture({ status: "complete" });
    assert.throws(() => recoverFailedRollbackAttempt(options(successful), dependencies()),
      /supported current-authority FAILED state/u);

    const outside = fixture({ outside: true });
    assert.throws(() => recoverFailedRollbackAttempt(options(outside), dependencies()),
      /supported current-authority FAILED state/u);

    const artifact = fixture();
    assert.throws(() => recoverFailedRollbackAttempt(options(artifact), dependencies({
      artifactStatePresent: true
    })), /exact protected recovery target/u);
    assert.equal(existsSync(artifact.workspace), true);
  });

  it("has no caller-selected cleanup, cache, selector or test-filter arguments", () => {
    const source = readFileSync(new URL("./failed-rollback-attempt-recovery.mjs", import.meta.url), "utf8");
    const wrapper = readFileSync(new URL("./recover-failed-rollback-attempt.sh", import.meta.url), "utf8");
    assert.match(wrapper, /FAILED_ATTEMPT_SHA256=\$\{1:-\}/u);
    assert.doesNotMatch(wrapper, /\$\{2:-\}|rm -rf|npm|current-bcn/u);
    assert.doesNotMatch(source, /npm-offline-v1|\/etc\/thebusinesscircle/u);
    assert.match(source, /FAILED_CURRENT_AUTHORITY_ROLLBACK_BUILD_ATTEMPT_RECOVERY/u);
  });
});
