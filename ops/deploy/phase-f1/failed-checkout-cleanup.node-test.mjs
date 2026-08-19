import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { ROLLBACK_APPLICATION_SHA } from "./application-identities.mjs";
import {
  cleanupFailedCheckout,
  FAILED_CHECKOUT_CLASSIFICATION,
  validateFailedCheckoutFacts
} from "./failed-checkout-cleanup.mjs";

const operationsCommit = "a".repeat(40);
const roots = [];
const validFacts = (overrides = {}) => ({
  role: "rollback",
  applicationSha: ROLLBACK_APPLICATION_SHA,
  operationsCommit,
  basename: `rollback-${ROLLBACK_APPLICATION_SHA}-20260818T204910.906761386Z-87954e74edc35cdf`,
  canonical: true,
  parentCanonical: true,
  insideExactBuildRoot: true,
  directory: true,
  symlink: false,
  uid: 1001,
  gid: 1001,
  mode: 0o750,
  expectedUid: 1001,
  expectedGid: 1001,
  sameFilesystem: true,
  mountpoint: false,
  activeReference: false,
  selectorReference: false,
  protectedEvidence: false,
  handoffEvidence: false,
  identityEvidence: false,
  ...overrides
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Phase F1 failed checkout cleanup", () => {
  it("classifies only an exact untrusted current application attempt", () => {
    assert.equal(validateFailedCheckoutFacts(validFacts()), FAILED_CHECKOUT_CLASSIFICATION);
    for (const changed of [
      { applicationSha: "b".repeat(40) }, { operationsCommit: "bad" },
      { canonical: false }, { parentCanonical: false }, { insideExactBuildRoot: false },
      { basename: "rollback-arbitrary" }, { directory: false }, { symlink: true },
      { mode: 0o777 }, { sameFilesystem: false }, { mountpoint: true },
      { activeReference: true }, { selectorReference: true }, { protectedEvidence: true },
      { handoffEvidence: true }, { identityEvidence: true }
    ]) assert.throws(() => validateFailedCheckoutFacts(validFacts(changed)), /PARTIAL_UNTRUSTED/u);
  });

  it("removes only the revalidated exact tree and publishes value-free audit evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "phase-f1-failed-checkout-")); roots.push(root);
    const buildRoot = join(root, "builds"), stateRoot = join(root, "state");
    mkdirSync(buildRoot); mkdirSync(stateRoot);
    const workspace = join(
      buildRoot,
      `rollback-${ROLLBACK_APPLICATION_SHA}-20260818T204910.906761386Z-87954e74edc35cdf`
    );
    mkdirSync(workspace, { mode: 0o750 });
    const result = cleanupFailedCheckout(workspace, "rollback", ROLLBACK_APPLICATION_SHA, operationsCommit, {
      buildRoot, stateRoot, enforceMetadata: false, expectedUid: 0, expectedGid: 0,
      mountpoint: false, activeReference: false, selectorReference: false,
      protectedEvidence: false, handoffEvidence: false,
      identityEvidence: false, fsyncParent: false, fsyncDirectories: false
    });
    assert.equal(existsSync(workspace), false);
    const audit = JSON.parse(readFileSync(result.auditPath, "utf8"));
    assert.equal(audit.classification, FAILED_CHECKOUT_CLASSIFICATION);
    assert.equal(audit.cleanupResult, "REMOVED");
    assert.equal(audit.valueMaterialRecorded, false);
  });

  it("rejects a cleanup target outside the exact build root", () => {
    const root = mkdtempSync(join(tmpdir(), "phase-f1-failed-checkout-link-")); roots.push(root);
    const buildRoot = join(root, "builds"), stateRoot = join(root, "state"), outside = join(root, "outside");
    mkdirSync(buildRoot); mkdirSync(stateRoot); mkdirSync(outside);
    const workspace = join(
      outside,
      `rollback-${ROLLBACK_APPLICATION_SHA}-20260818T204910.906761386Z-87954e74edc35cdf`
    );
    mkdirSync(workspace, { mode: 0o750 });
    assert.throws(() => cleanupFailedCheckout(workspace, "rollback", ROLLBACK_APPLICATION_SHA, operationsCommit, {
      buildRoot, stateRoot, enforceMetadata: false, expectedUid: 0, expectedGid: 0,
      mountpoint: false, activeReference: false, selectorReference: false,
      protectedEvidence: false, handoffEvidence: false,
      identityEvidence: false, fsyncParent: false, fsyncDirectories: false
    }), /PARTIAL_UNTRUSTED/u);
    assert.equal(existsSync(workspace), true);
  });
});
