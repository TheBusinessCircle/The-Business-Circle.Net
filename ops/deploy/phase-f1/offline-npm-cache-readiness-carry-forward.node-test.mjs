import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  IDENTITY_ONLY_READY_CARRY_FORWARD,
  IDENTITY_ONLY_READY_DELTA,
  READY_CARRY_FORWARD_SCHEMA,
  classifyOfflineCacheReadinessDelta,
  createOfflineCacheReadinessCarryForwardArtifacts,
  offlineCacheReadinessCarryForwardReportPath,
  offlineCacheReadinessExchangeSlotPath,
  preservedOfflineCacheReadinessPath,
  publishCarriedForwardOfflineCacheReadiness,
  validateOfflineCacheReadiness,
  validateOfflineCacheReadinessCarryForwardReport
} from "./offline-npm-cache.mjs";

const SOURCE_COMMIT = "a".repeat(40);
const TARGET_COMMIT = "b".repeat(40);
const INTERMEDIATE_COMMIT = "c".repeat(40);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const readiness = (operationsCommit = SOURCE_COMMIT, overrides = {}) => ({
  schemaVersion: "phase-f1-offline-npm-cache-readiness-v2",
  operationsCommit,
  applicationSha: "8db8236c16ebb5a02ec5b90f7e5308008cff7086",
  cacheRoot: "/var/cache/thebusinesscircle/phase-f1/npm-offline-v1",
  nodeVersion: "v22.22.2",
  npmVersion: "10.9.7",
  lockfileSha256: "d".repeat(64),
  targetOs: "linux",
  targetCpu: "x64",
  targetLibc: "glibc",
  totalLockfileIntegrityCount: 12,
  requiredTargetIntegrityCount: 9,
  presentRequiredTargetIntegrityCount: 9,
  missingRequiredTargetIntegrityCount: 0,
  optionalInapplicableIntegrityCount: 3,
  cacheInventorySha256: "e".repeat(64),
  cacheFileCount: 20,
  offlineResolutionVerified: true,
  ready: true,
  valueMaterialRecorded: false,
  ...overrides
});

const evidence = (record) => {
  const bytes = Buffer.from(`${JSON.stringify(record, null, 2)}\n`);
  return { record, bytes, identity: sha256(bytes) };
};

function temporaryState() {
  return mkdtempSync(join(process.cwd(), ".offline-cache-ready-carry-forward-test-"));
}

function syntheticExchange(paths) {
  const source = readFileSync(paths.authority);
  const candidate = readFileSync(paths.slot);
  writeFileSync(paths.authority, candidate);
  writeFileSync(paths.slot, source);
}

function testDependencies(root, sourceRecord, overrides = {}) {
  return {
    operational: false,
    stateRoot: root,
    assertProductionContext() {
      return [SOURCE_COMMIT, INTERMEDIATE_COMMIT, TARGET_COMMIT];
    },
    validateOperationalState() { return true; },
    createReadinessRecord(operationsCommit) {
      return readiness(operationsCommit, {
        cacheInventorySha256: sourceRecord.cacheInventorySha256,
        lockfileSha256: sourceRecord.lockfileSha256
      });
    },
    exchange: syntheticExchange,
    ...overrides
  };
}

describe("Phase F1 READY offline npm cache evidence carry-forward", () => {
  it("creates only an identity-only READY transition across protected lineage", () => {
    const source = evidence(readiness());
    const candidate = readiness(TARGET_COMMIT);
    const artifacts = createOfflineCacheReadinessCarryForwardArtifacts(
      source,
      candidate,
      TARGET_COMMIT,
      ["0".repeat(40), SOURCE_COMMIT, INTERMEDIATE_COMMIT, TARGET_COMMIT]
    );
    assert.equal(artifacts.report.schemaVersion, READY_CARRY_FORWARD_SCHEMA);
    assert.equal(artifacts.report.semanticDelta, IDENTITY_ONLY_READY_DELTA);
    assert.deepEqual(artifacts.report.lineage, [
      SOURCE_COMMIT,
      INTERMEDIATE_COMMIT,
      TARGET_COMMIT
    ]);
    assert.equal(artifacts.report.sourcePreserved, true);
    assert.equal(artifacts.report.cacheContentsUnchanged, true);
    assert.equal(artifacts.report.offlineResolutionPreserved, true);
    assert.equal(artifacts.readinessPayload.length, source.bytes.length);
    assert.equal(
      classifyOfflineCacheReadinessDelta(source.record, candidate),
      IDENTITY_ONLY_READY_DELTA
    );
  });

  it("rejects non-READY evidence, semantic drift, and unrelated lineage", () => {
    const source = evidence(readiness());
    const mutations = [
      { ready: false },
      { offlineResolutionVerified: false },
      { cacheInventorySha256: "f".repeat(64) },
      { lockfileSha256: "f".repeat(64) },
      { applicationSha: "f".repeat(40) },
      { cacheRoot: "/tmp/cache" },
      { nodeVersion: "v22.22.3" },
      { npmVersion: "10.9.8" },
      { targetOs: "darwin" },
      { targetCpu: "arm64" },
      { targetLibc: "musl" },
      { totalLockfileIntegrityCount: 13 },
      { requiredTargetIntegrityCount: 10, presentRequiredTargetIntegrityCount: 10 },
      { presentRequiredTargetIntegrityCount: 8 },
      { missingRequiredTargetIntegrityCount: 1 },
      { optionalInapplicableIntegrityCount: 4 },
      { cacheFileCount: 21 },
      { valueMaterialRecorded: true }
    ];
    for (const mutation of mutations) {
      const candidate = readiness(TARGET_COMMIT, mutation);
      assert.equal(
        classifyOfflineCacheReadinessDelta(source.record, candidate),
        "UNEXPECTED_SEMANTIC_DELTA"
      );
      assert.throws(() => createOfflineCacheReadinessCarryForwardArtifacts(
        source,
        candidate,
        TARGET_COMMIT,
        [SOURCE_COMMIT, TARGET_COMMIT]
      ), /invalid|READY semantics/u);
    }
    assert.throws(() => createOfflineCacheReadinessCarryForwardArtifacts(
      source,
      readiness(TARGET_COMMIT),
      TARGET_COMMIT,
      [INTERMEDIATE_COMMIT, TARGET_COMMIT]
    ), /not in the trusted lineage/u);
  });

  it("preserves source evidence and cache bytes while atomically publishing current READY", () => {
    const root = temporaryState();
    try {
      const sourceRecord = readiness();
      const source = evidence(sourceRecord);
      const authority = join(root, "offline-npm-cache-readiness.json");
      const cacheSentinel = join(root, "sealed-cache-content.bin");
      writeFileSync(authority, source.bytes, { flag: "wx" });
      writeFileSync(cacheSentinel, "immutable-cache-bytes\n", { flag: "wx" });
      const cacheIdentity = sha256(readFileSync(cacheSentinel));
      const result = publishCarriedForwardOfflineCacheReadiness({
        workspace: "/fixed/rollback-workspace",
        sourceReadinessSha256: source.identity,
        operationsCommit: TARGET_COMMIT,
        carryForward: IDENTITY_ONLY_READY_CARRY_FORWARD
      }, testDependencies(root, sourceRecord, {
        validateOperationalState() {
          assert.equal(sha256(readFileSync(cacheSentinel)), cacheIdentity);
        }
      }));
      assert.equal(JSON.parse(readFileSync(authority)).operationsCommit, TARGET_COMMIT);
      assert.deepEqual(
        readFileSync(preservedOfflineCacheReadinessPath(root, SOURCE_COMMIT)),
        source.bytes
      );
      assert.deepEqual(
        readFileSync(offlineCacheReadinessExchangeSlotPath(root, TARGET_COMMIT)),
        source.bytes
      );
      assert.equal(sha256(readFileSync(cacheSentinel)), cacheIdentity);
      const report = JSON.parse(readFileSync(
        offlineCacheReadinessCarryForwardReportPath(root, TARGET_COMMIT),
        "utf8"
      ));
      assert.equal(report.sourceReadinessSha256, source.identity);
      assert.equal(report.carriedForwardReadinessSha256,
        result.carriedForwardReadinessIdentity);
      assert.equal(validateOfflineCacheReadinessCarryForwardReport(report).sourcePreserved, true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails before publication for changed operational policy or unsafe slot state", () => {
    for (const failure of [
      "cache mutated",
      "cache unsealed",
      "build-user access changed",
      "runtime-user mutation isolation changed",
      "active writer present",
      "promotion residue present",
      "disposable node_modules residue present",
      "offline resolution invalid"
    ]) {
      const root = temporaryState();
      try {
        const sourceRecord = readiness();
        const source = evidence(sourceRecord);
        writeFileSync(join(root, "offline-npm-cache-readiness.json"), source.bytes, {
          flag: "wx"
        });
        assert.throws(() => publishCarriedForwardOfflineCacheReadiness({
          workspace: "/fixed/rollback-workspace",
          sourceReadinessSha256: source.identity,
          operationsCommit: TARGET_COMMIT,
          carryForward: IDENTITY_ONLY_READY_CARRY_FORWARD
        }, testDependencies(root, sourceRecord, {
          validateOperationalState() { throw new Error(failure); }
        })), new RegExp(failure, "u"));
        assert.equal(
          readFileSync(join(root, "offline-npm-cache-readiness.json"), "utf8"),
          source.bytes.toString("utf8")
        );
        assert.throws(() => readFileSync(
          offlineCacheReadinessCarryForwardReportPath(root, TARGET_COMMIT)
        ));
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it("rejects fabricated identities, arbitrary paths, and partial publication", () => {
    const root = temporaryState();
    try {
      const sourceRecord = readiness();
      const source = evidence(sourceRecord);
      writeFileSync(join(root, "offline-npm-cache-readiness.json"), source.bytes, {
        flag: "wx"
      });
      const base = {
        workspace: "/fixed/rollback-workspace",
        sourceReadinessSha256: source.identity,
        operationsCommit: TARGET_COMMIT,
        carryForward: IDENTITY_ONLY_READY_CARRY_FORWARD
      };
      assert.throws(() => publishCarriedForwardOfflineCacheReadiness({
        ...base,
        sourceReadinessSha256: "0".repeat(64)
      }, testDependencies(root, sourceRecord)), /identity differs/u);
      assert.throws(() => publishCarriedForwardOfflineCacheReadiness({
        ...base,
        evidencePath: "/tmp/arbitrary.json"
      }, testDependencies(root, sourceRecord)), /schema is invalid/u);
      writeFileSync(
        preservedOfflineCacheReadinessPath(root, SOURCE_COMMIT),
        "EXISTING\n",
        { flag: "wx" }
      );
      assert.throws(() => publishCarriedForwardOfflineCacheReadiness(
        base,
        testDependencies(root, sourceRecord)
      ), /target already exists/u);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("validates the closed READY and carry-forward report schemas", () => {
    const source = evidence(readiness());
    assert.equal(validateOfflineCacheReadiness(source.record, SOURCE_COMMIT).ready, true);
    const artifacts = createOfflineCacheReadinessCarryForwardArtifacts(
      source,
      readiness(TARGET_COMMIT),
      TARGET_COMMIT,
      [SOURCE_COMMIT, TARGET_COMMIT]
    );
    for (const report of [
      { ...artifacts.report, semanticDelta: "SEMANTIC_CHANGE" },
      { ...artifacts.report, lineage: [...artifacts.report.lineage].reverse() },
      { ...artifacts.report, sourcePreserved: false },
      { ...artifacts.report, cacheContentsUnchanged: false },
      { ...artifacts.report, offlineResolutionPreserved: false },
      { ...artifacts.report, cacheValueHash: "f".repeat(64) }
    ]) {
      assert.throws(
        () => validateOfflineCacheReadinessCarryForwardReport(report),
        /invalid|unknown or missing/u
      );
    }
  });
});
