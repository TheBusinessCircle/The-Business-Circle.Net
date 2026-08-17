import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { consumeBuildAttempt, createBuildAttempt, finishBuildAttempt, inspectBuildAttempt } from "./build-state.mjs";
import { evaluateOfflineCache } from "./offline-npm-cache.mjs";

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
    assert.equal(evaluateOfflineCache(fixture.cache, fixture.lockfile, { enforceMetadata: false }).packageCount, 1);
    writeFileSync(fixture.content, "changed");
    assert.throws(() => evaluateOfflineCache(fixture.cache, fixture.lockfile, { enforceMetadata: false }), /integrity/u);
    rmSync(fixture.content);
    assert.throws(() => evaluateOfflineCache(fixture.cache, fixture.lockfile, { enforceMetadata: false }), /incomplete/u);
  });

  it("rejects non-registry sources, symlinks and unsafe cache modes", () => {
    const fixture = cacheFixture();
    const lock = JSON.parse(readFileSync(fixture.lockfile, "utf8")); lock.packages["node_modules/fixture"].resolved = "https://example.invalid/package.tgz"; writeFileSync(fixture.lockfile, `${JSON.stringify(lock)}\n`);
    assert.throws(() => evaluateOfflineCache(fixture.cache, fixture.lockfile, { enforceMetadata: false }), /non-registry/u);
    const fresh = cacheFixture();
    if (process.platform !== "win32") {
      const linked = join(dirname(fresh.content), "linked-content"); symlinkSync(fresh.content, linked);
      assert.throws(() => evaluateOfflineCache(fresh.cache, fresh.lockfile, { enforceMetadata: false }), /linked|special/u);
    }
    if (process.platform !== "win32") {
      chmodSync(fresh.cache, 0o777);
      assert.throws(() => evaluateOfflineCache(fresh.cache, fresh.lockfile), /metadata|mode/u);
    }
  });
});
