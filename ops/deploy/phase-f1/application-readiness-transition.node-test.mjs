import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  FORWARD_APPLICATION_SHA,
  HISTORICAL_PRODUCTION_SHA,
  PREVIOUS_ROLLBACK_APPLICATION_SHA,
  PREVIOUS_ROLLBACK_TRANSITION_BLOB,
  ROLLBACK_APPLICATION_SHA,
  ROLLBACK_APPLICATION_TRANSITION_FILE,
  ROLLBACK_PACKAGE_BLOB,
  ROLLBACK_PACKAGE_LOCK_BLOB,
  ROLLBACK_TRANSITION_BLOB,
  verifyReviewedRollbackApplicationTransition
} from "./application-identities.mjs";
import {
  createEnvironmentApplicationTransitionArtifacts,
  ENVIRONMENT_APPLICATION_TRANSITION_DELTA,
  TRANSITION_SOURCE_OPERATIONS_COMMIT as ENVIRONMENT_SOURCE,
  validateEnvironmentApplicationTransitionReport
} from "./environment-application-readiness-transition.mjs";
import {
  classifyEnvironmentReadinessDelta
} from "./environment-readiness.mjs";
import {
  validateSealedReadyCacheState
} from "./offline-npm-cache.mjs";
import {
  createOfflineCacheApplicationTransitionArtifacts,
  createOfflineCacheApplicationTransitionRecord,
  OFFLINE_CACHE_APPLICATION_TRANSITION_DELTA,
  TRANSITION_SOURCE_OPERATIONS_COMMIT as CACHE_SOURCE,
  validateOfflineCacheApplicationTransitionReport
} from "./offline-npm-cache-application-transition.mjs";

const targetOperationsCommit = "a".repeat(40);
const sha256 = value => createHash("sha256").update(value).digest("hex");

function environmentSource() {
  return {
    schemaVersion: "phase-f1-environment-readiness-v1",
    authority: "protected-environment-only",
    ready: true,
    operationsCommit: ENVIRONMENT_SOURCE,
    forwardApplicationSha: FORWARD_APPLICATION_SHA,
    rollbackApplicationSha: PREVIOUS_ROLLBACK_APPLICATION_SHA,
    historicalProductionSha: HISTORICAL_PRODUCTION_SHA,
    validations: {
      bcnProtectedEnvironment: "PASSED",
      buildProtectedEnvironment: "PASSED",
      circleCardProtectedEnvironment: "PASSED",
      crossEnvironmentContract: "PASSED",
      crossUserIsolation: "PASSED",
      releaseIntegrity: "NOT_EVALUATED"
    },
    valuesRecorded: false
  };
}

function cacheSource() {
  return {
    schemaVersion: "phase-f1-offline-npm-cache-readiness-v2",
    operationsCommit: CACHE_SOURCE,
    applicationSha: PREVIOUS_ROLLBACK_APPLICATION_SHA,
    cacheRoot: "/var/cache/thebusinesscircle/phase-f1/npm-offline-v1",
    nodeVersion: "v22.22.2",
    npmVersion: "10.9.7",
    lockfileSha256: "1".repeat(64),
    targetOs: "linux",
    targetCpu: "x64",
    targetLibc: "glibc",
    totalLockfileIntegrityCount: 5,
    requiredTargetIntegrityCount: 4,
    presentRequiredTargetIntegrityCount: 4,
    missingRequiredTargetIntegrityCount: 0,
    optionalInapplicableIntegrityCount: 1,
    cacheInventorySha256: "2".repeat(64),
    cacheFileCount: 8,
    offlineResolutionVerified: true,
    ready: true,
    valueMaterialRecorded: false
  };
}

function evidence(record) {
  const bytes = Buffer.from(`${JSON.stringify(record, null, 2)}\n`);
  return { bytes, record, identity: sha256(bytes) };
}

const previousFontFixture = [
  "const sora = `@font-face{src:url(phase-e3-sora.woff2) format('woff2')}`;",
  "const jakarta = `@font-face{src:url(phase-e3-jakarta.woff2) format('woff2')}`;",
  ""
].join("\n");
const currentFontFixture = previousFontFixture
  .replace("src:url(phase-e3-sora.woff2) format('woff2')",
    "src:url(https://fonts.gstatic.com/s/sora/phase-e3-sora.woff2) format('woff2')")
  .replace("src:url(phase-e3-jakarta.woff2) format('woff2')",
    "src:url(https://fonts.gstatic.com/s/plusjakartasans/phase-e3-jakarta.woff2) format('woff2')");

function reviewedTransitionGit(overrides = {}) {
  return (_root, args) => {
    const key = args.join(" ");
    const values = {
      [`rev-list --parents -n 1 ${PREVIOUS_ROLLBACK_APPLICATION_SHA}`]:
        `${PREVIOUS_ROLLBACK_APPLICATION_SHA} ${HISTORICAL_PRODUCTION_SHA}\n`,
      [`rev-list --parents -n 1 ${ROLLBACK_APPLICATION_SHA}`]:
        `${ROLLBACK_APPLICATION_SHA} ${HISTORICAL_PRODUCTION_SHA}\n`,
      [`diff --name-status --no-renames ${PREVIOUS_ROLLBACK_APPLICATION_SHA} ${ROLLBACK_APPLICATION_SHA}`]:
        `M\t${ROLLBACK_APPLICATION_TRANSITION_FILE}\n`,
      [`rev-parse ${PREVIOUS_ROLLBACK_APPLICATION_SHA}:${ROLLBACK_APPLICATION_TRANSITION_FILE}`]:
        `${PREVIOUS_ROLLBACK_TRANSITION_BLOB}\n`,
      [`rev-parse ${ROLLBACK_APPLICATION_SHA}:${ROLLBACK_APPLICATION_TRANSITION_FILE}`]:
        `${ROLLBACK_TRANSITION_BLOB}\n`,
      [`rev-parse ${PREVIOUS_ROLLBACK_APPLICATION_SHA}:package-lock.json`]:
        `${ROLLBACK_PACKAGE_LOCK_BLOB}\n`,
      [`rev-parse ${ROLLBACK_APPLICATION_SHA}:package-lock.json`]:
        `${ROLLBACK_PACKAGE_LOCK_BLOB}\n`,
      [`rev-parse ${PREVIOUS_ROLLBACK_APPLICATION_SHA}:package.json`]:
        `${ROLLBACK_PACKAGE_BLOB}\n`,
      [`rev-parse ${ROLLBACK_APPLICATION_SHA}:package.json`]: `${ROLLBACK_PACKAGE_BLOB}\n`,
      [`show ${PREVIOUS_ROLLBACK_APPLICATION_SHA}:${ROLLBACK_APPLICATION_TRANSITION_FILE}`]:
        previousFontFixture,
      [`show ${ROLLBACK_APPLICATION_SHA}:${ROLLBACK_APPLICATION_TRANSITION_FILE}`]:
        currentFontFixture,
      ...overrides
    };
    if (!(key in values)) throw new Error(`Unexpected synthetic Git call: ${key}`);
    return values[key];
  };
}

describe("Phase F1 reviewed rollback application readiness transitions", () => {
  it("approves only the exact reviewed two-line absolute font mock transition", () => {
    const review = verifyReviewedRollbackApplicationTransition(
      ".", reviewedTransitionGit()
    );
    assert.equal(review.rollbackApplicationSha, ROLLBACK_APPLICATION_SHA);
    assert.equal(review.reviewedLineChanges, 2);
    assert.equal(review.dependencyIdentityUnchanged, true);
    assert.throws(() => verifyReviewedRollbackApplicationTransition(
      ".",
      reviewedTransitionGit({
        [`diff --name-status --no-renames ${PREVIOUS_ROLLBACK_APPLICATION_SHA} ${ROLLBACK_APPLICATION_SHA}`]:
          `M\t${ROLLBACK_APPLICATION_TRANSITION_FILE}\nM\tpackage.json\n`
      })
    ), /unreviewed file/u);
  });

  it("transitions only environment authority and the reviewed rollback identity", () => {
    const source = evidence(environmentSource());
    const artifacts = createEnvironmentApplicationTransitionArtifacts(
      source,
      targetOperationsCommit,
      [ENVIRONMENT_SOURCE, targetOperationsCommit]
    );
    assert.equal(artifacts.candidate.rollbackApplicationSha, ROLLBACK_APPLICATION_SHA);
    assert.equal(artifacts.candidate.forwardApplicationSha, FORWARD_APPLICATION_SHA);
    assert.deepEqual(artifacts.candidate.validations, source.record.validations);
    assert.equal(artifacts.report.semanticDelta, ENVIRONMENT_APPLICATION_TRANSITION_DELTA);
    assert.equal(artifacts.report.protectedEnvironmentSemanticsUnchanged, true);
    validateEnvironmentApplicationTransitionReport(artifacts.report);
    assert.equal(classifyEnvironmentReadinessDelta(source.record, artifacts.candidate),
      "UNEXPECTED_SEMANTIC_DELTA");
  });

  it("rejects environment validation drift, arbitrary predecessor and unrelated rollback identity", () => {
    const changed = environmentSource();
    changed.validations.crossUserIsolation = "FAILED";
    assert.throws(() => createEnvironmentApplicationTransitionArtifacts(
      evidence(changed), targetOperationsCommit, [ENVIRONMENT_SOURCE, targetOperationsCommit]
    ), /approved application transition source/u);
    assert.throws(() => createEnvironmentApplicationTransitionArtifacts(
      evidence(environmentSource()), targetOperationsCommit,
      ["b".repeat(40), targetOperationsCommit]
    ), /lineage is not approved/u);
    const wrong = environmentSource();
    wrong.rollbackApplicationSha = "c".repeat(40);
    assert.throws(() => createEnvironmentApplicationTransitionArtifacts(
      evidence(wrong), targetOperationsCommit, [ENVIRONMENT_SOURCE, targetOperationsCommit]
    ), /approved application transition source/u);
  });

  it("transitions READY cache evidence only when every cache and lockfile semantic is unchanged", () => {
    const source = evidence(cacheSource());
    const candidate = createOfflineCacheApplicationTransitionRecord(
      source.record,
      targetOperationsCommit
    );
    const artifacts = createOfflineCacheApplicationTransitionArtifacts(
      source,
      candidate,
      targetOperationsCommit,
      [CACHE_SOURCE, targetOperationsCommit]
    );
    assert.equal(artifacts.report.semanticDelta, OFFLINE_CACHE_APPLICATION_TRANSITION_DELTA);
    assert.equal(artifacts.report.cacheContentsUnchanged, true);
    assert.equal(artifacts.report.lockfileIdentityUnchanged, true);
    assert.equal(artifacts.report.offlineResolutionPreserved, true);
    validateOfflineCacheApplicationTransitionReport(artifacts.report);
    assert.deepEqual(validateSealedReadyCacheState({
      fileCount: source.record.cacheFileCount,
      cacheInventorySha256: source.record.cacheInventorySha256
    }, {
      cacheFileCount: source.record.cacheFileCount,
      cacheInventorySha256: source.record.cacheInventorySha256
    }), {
      fileCount: source.record.cacheFileCount,
      cacheInventorySha256: source.record.cacheInventorySha256
    });
    assert.throws(() => validateSealedReadyCacheState({
      fileCount: source.record.cacheFileCount + 1,
      cacheInventorySha256: source.record.cacheInventorySha256
    }, {
      cacheFileCount: source.record.cacheFileCount,
      cacheInventorySha256: source.record.cacheInventorySha256
    }), /transition state is invalid/u);
  });

  it("fails closed on lockfile, cache, platform, count, proof or application drift", () => {
    for (const mutation of [
      { lockfileSha256: "3".repeat(64) },
      { cacheInventorySha256: "4".repeat(64) },
      { targetLibc: "musl" },
      { missingRequiredTargetIntegrityCount: 1 },
      { offlineResolutionVerified: false },
      { applicationSha: "d".repeat(40) }
    ]) {
      const source = evidence(cacheSource());
      const candidate = {
        ...source.record,
        operationsCommit: targetOperationsCommit,
        applicationSha: ROLLBACK_APPLICATION_SHA,
        ...mutation
      };
      assert.throws(() => createOfflineCacheApplicationTransitionArtifacts(
        source,
        candidate,
        targetOperationsCommit,
        [CACHE_SOURCE, targetOperationsCommit]
      ), /changed READY semantics|readiness evidence is invalid/u);
    }
  });
});
