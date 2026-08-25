import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { assertBuildOnlySelectorBoundary, validateBuildOnlyArtifactEvidence } from "./build-only-artifact.mjs";
import { validateSelectorPublication } from "./candidate-selector.mjs";

const operationsCommit = "a".repeat(40), digest = value => createHash("sha256").update(value).digest("hex");
const contracts = {
  "rollback-reference": { sha: "5d1f81bb05a01b08e1134785c2f86b77c8969fe3", path: "/var/www/rollbacks/5d1f81bb05a01b08e1134785c2f86b77c8969fe3", names: ["rollback-bcn.manifest", "rollback-release.manifest"], brand: "bcn", origin: "https://thebusinesscircle.net" },
  bcn: { sha: "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e", path: "/var/www/releases/b43a1e4e708bc9f02ef83bd63dab1db1f366b32e/.runtime/bcn", names: ["runtime-bcn.manifest", "forward-release.manifest"], brand: "bcn", origin: "https://thebusinesscircle.net" },
  "circle-card": { sha: "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e", path: "/var/www/releases/b43a1e4e708bc9f02ef83bd63dab1db1f366b32e/.runtime/circle-card", names: ["runtime-circle-card.manifest", "forward-release.manifest"], brand: "circle-card", origin: "https://circlecard.co.uk" }
};
const makeEvidence = role => {
  const contract = contracts[role], manifestIdentities = Object.fromEntries(contract.names.map((name, index) => [name, String(index + 1).repeat(64).slice(0, 64)]));
  const releaseIntegrityIdentity = "f".repeat(64);
  const aggregate = contract.names.map(name => `${name}:${manifestIdentities[name]}\n`).join("") + `release-integrity:${releaseIntegrityIdentity}\n`;
  return { schemaVersion: "phase-f1-build-only-artifact-v2", buildRole: role, applicationSha: contract.sha, operationsCommit, artifactPath: contract.path, appBrand: contract.brand, publicOrigin: contract.origin, manifestIdentities, releaseIntegrityIdentity, artifactIdentity: digest(Buffer.from(aggregate)), releaseIntegrity: "PASS", selectorsPublished: false, valueMaterialRecorded: false };
};

test("build-only artifact evidence binds each closed role and fixed identity", () => {
  for (const role of Object.keys(contracts)) assert.equal(validateBuildOnlyArtifactEvidence(makeEvidence(role), { role, operationsCommit }).buildRole, role);
  const circle = makeEvidence("circle-card");
  assert.throws(() => validateBuildOnlyArtifactEvidence({ ...circle, appBrand: "bcn" }), /invalid or stale/u);
  assert.throws(() => validateBuildOnlyArtifactEvidence({ ...circle, artifactPath: contracts.bcn.path }), /invalid or stale/u);
  assert.throws(() => validateBuildOnlyArtifactEvidence({ ...circle, selectorsPublished: true }), /invalid or stale/u);
});

test("candidate selector consumes role evidence while targeting the shared immutable release root", () => {
  const rollback = makeEvidence("rollback-reference"), circle = makeEvidence("circle-card");
  assert.equal(validateSelectorPublication("rollback-probe", operationsCommit, rollback).role, "rollback-reference");
  const contract = validateSelectorPublication("circle-card", operationsCommit, circle);
  assert.equal(contract.target, "/var/www/releases/b43a1e4e708bc9f02ef83bd63dab1db1f366b32e");
  assert.equal(contract.evidencePath, circle.artifactPath);
  assert.throws(() => validateSelectorPublication("circle-card", operationsCommit, makeEvidence("bcn")), /exact current/u);
});

test("build-only completion rejects every selector object including a broken link", () => {
  const absent = Object.assign(new Error("absent"), { code: "ENOENT" });
  assert.equal(assertBuildOnlySelectorBoundary(["/one", "/two"], () => { throw absent; }), true);
  assert.throws(() => assertBuildOnlySelectorBoundary(["/var/www/current-circle-card"], () => ({ isSymbolicLink: () => true })), /found a selector object/u);
});
