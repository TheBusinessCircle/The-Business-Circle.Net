import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { verifyArtifactEnvironmentExclusion } from "./artifact-environment-exclusion.mjs";
import { validateBuildReleaseIntegrity } from "./build-release-integrity.mjs";

const authority = "a".repeat(40), digest = "b".repeat(64), other = "c".repeat(64);
const make = role => ({ schemaVersion: "phase-f1-forward-build-release-integrity-v1", buildRole: role, sourceApplicationSha: "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e", operationsCommit: authority,
  appBrand: role === "bcn" ? "bcn" : "circle-card", publicOrigin: role === "bcn" ? "https://thebusinesscircle.net" : "https://circlecard.co.uk",
  artifactPath: `/var/www/releases/b43a1e4e708bc9f02ef83bd63dab1db1f366b32e/.runtime/${role}`, artifactIdentity: digest,
  runtimeManifestIdentity: digest, crossRoleArtifactIdentity: other, releaseManifestIdentity: "d".repeat(64), buildRoleIdentity: "e".repeat(64),
  environmentExclusion: "PASS", releaseIntegrity: "PASS", selectorIndependent: true, valueMaterialRecorded: false });

test("release integrity distinguishes BCN and Circle Card identity", () => {
  assert.equal(validateBuildReleaseIntegrity(make("bcn"), { role: "bcn", operationsCommit: authority }).appBrand, "bcn");
  assert.equal(validateBuildReleaseIntegrity(make("circle-card"), { role: "circle-card" }).publicOrigin, "https://circlecard.co.uk");
  assert.throws(() => validateBuildReleaseIntegrity({ ...make("circle-card"), appBrand: "bcn" }), /invalid/u);
  assert.throws(() => validateBuildReleaseIntegrity({ ...make("circle-card"), crossRoleArtifactIdentity: digest }), /invalid/u);
  assert.throws(() => validateBuildReleaseIntegrity(make("bcn"), { role: "circle-card" }), /invalid/u);
});

test("artifact scanner rejects dotenv names and protected value bytes", t => {
  const root = mkdtempSync(join(tmpdir(), "phase-f1-artifact-exclusion-")); t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "server")); writeFileSync(join(root, "server", "safe.js"), "safe");
  assert.equal(verifyArtifactEnvironmentExclusion("bcn", root, { protectedValues: [Buffer.from("sensitive-value")] }).prohibitedMaterial, false);
  writeFileSync(join(root, ".env.production"), "x");
  assert.throws(() => verifyArtifactEnvironmentExclusion("bcn", root, { protectedValues: [] }), /prohibited environment/u);
  rmSync(join(root, ".env.production")); writeFileSync(join(root, "server", "bad.js"), "prefix-sensitive-value-suffix");
  assert.throws(() => verifyArtifactEnvironmentExclusion("bcn", root, { protectedValues: [Buffer.from("sensitive-value")] }), /protected value material/u);
});
