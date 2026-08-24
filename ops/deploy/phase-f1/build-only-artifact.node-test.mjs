import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { assertBuildOnlySelectorBoundary, validateBuildOnlyArtifactEvidence } from "./build-only-artifact.mjs";
import { validateSelectorPublication } from "./candidate-selector.mjs";

const operationsCommit = "a".repeat(40);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const makeEvidence = (role) => {
  const rollback = role === "rollback";
  const manifestNames = rollback
    ? ["rollback-bcn.manifest", "rollback-release.manifest"]
    : ["built-next.manifest", "forward-release.manifest", "manifest-index.sha256", "runtime-bcn.manifest", "runtime-circle-card.manifest"];
  const manifestIdentities = Object.fromEntries(manifestNames.map((name, index) => [name, String(index + 1).repeat(64).slice(0, 64)]));
  const aggregate = manifestNames.map((name) => `${name}:${manifestIdentities[name]}\n`).join("");
  return {
    schemaVersion: "phase-f1-build-only-artifact-v1",
    role,
    applicationSha: rollback ? "5d1f81bb05a01b08e1134785c2f86b77c8969fe3" : "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e",
    operationsCommit,
    artifactPath: rollback ? "/var/www/rollbacks/5d1f81bb05a01b08e1134785c2f86b77c8969fe3" : "/var/www/releases/b43a1e4e708bc9f02ef83bd63dab1db1f366b32e",
    manifestIdentities,
    artifactIdentity: digest(Buffer.from(aggregate)),
    releaseIntegrity: "PASS",
    selectorsPublished: false,
    valueMaterialRecorded: false
  };
};

test("build-only artifact evidence is closed and selector-free", () => {
  const rollback = makeEvidence("rollback");
  const forward = makeEvidence("forward");
  assert.equal(validateBuildOnlyArtifactEvidence(rollback, { role: "rollback", operationsCommit }), rollback);
  assert.equal(validateBuildOnlyArtifactEvidence(forward, { role: "forward", operationsCommit }), forward);
  assert.throws(() => validateBuildOnlyArtifactEvidence({ ...forward, selectorsPublished: true }), /invalid or stale/u);
  assert.throws(() => validateBuildOnlyArtifactEvidence({ ...forward, artifactPath: "/tmp/alternate" }), /invalid or stale/u);
  assert.throws(() => validateBuildOnlyArtifactEvidence({ ...forward, releaseIntegrity: "NOT_EVALUATED" }), /invalid or stale/u);
});

test("candidate selector requests consume only exact current build-only evidence", () => {
  const rollback = makeEvidence("rollback");
  const forward = makeEvidence("forward");
  assert.deepEqual(validateSelectorPublication("rollback-probe", operationsCommit, rollback), {
    role: "rollback",
    selector: "/var/www/current-bcn-rollback-probe",
    target: "/var/www/rollbacks/5d1f81bb05a01b08e1134785c2f86b77c8969fe3"
  });
  assert.deepEqual(validateSelectorPublication("circle-card", operationsCommit, forward), {
    role: "forward",
    selector: "/var/www/current-circle-card",
    target: "/var/www/releases/b43a1e4e708bc9f02ef83bd63dab1db1f366b32e"
  });
  assert.throws(() => validateSelectorPublication("circle-card", operationsCommit, rollback), /exact current/u);
  assert.throws(() => validateSelectorPublication("unknown", operationsCommit, forward), /role or operations/u);
  assert.throws(() => validateSelectorPublication("circle-card", "b".repeat(40), forward), /exact current/u);
});

test("build-only completion rejects every selector object including a broken link", () => {
  const absent = Object.assign(new Error("absent"), { code: "ENOENT" });
  assert.equal(assertBuildOnlySelectorBoundary(["/one", "/two"], () => { throw absent; }), true);
  assert.throws(() => assertBuildOnlySelectorBoundary(["/var/www/current-circle-card"], () => ({ isSymbolicLink: () => true })), /found a selector object/u);
});
