import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertRuntimeCacheExcluded, createContentManifest, verifyReleaseManifest } from "./artifact-manifest.mjs";
import { verifyArtifactEnvironmentExclusion } from "./artifact-environment-exclusion.mjs";
import { FORWARD_APPLICATION_SHA, FORWARD_BUILD_ROLES, verifyForwardBuildRoleRecord } from "./build-role-contract.mjs";

export const BUILD_RELEASE_INTEGRITY_SCHEMA = "phase-f1-forward-build-release-integrity-v1";
const RELEASE_ROOT = `/var/www/releases/${FORWARD_APPLICATION_SHA}`;
const ARTIFACT_ROOT = "/var/lib/thebusinesscircle/artifacts/b43a1e4e708bc9f02ef83bd63dab1db1f366b32e-5d1f81bb05a01b08e1134785c2f86b77c8969fe3";
const SELECTORS = Object.freeze(["/var/www/current-bcn", "/var/www/current-circle-card", "/var/www/current-bcn-rollback-probe"]);
const sha256 = value => createHash("sha256").update(value).digest("hex");

function exactKeys(value, expected) {
  if (!value || Array.isArray(value) || typeof value !== "object" ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error("Build release-integrity record has unknown or missing fields.");
  }
}

export function validateBuildReleaseIntegrity(record, expected = {}) {
  exactKeys(record, [
    "appBrand", "artifactIdentity", "artifactPath", "buildRole", "buildRoleIdentity",
    "crossRoleArtifactIdentity", "environmentExclusion", "operationsCommit", "publicOrigin",
    "releaseIntegrity", "releaseManifestIdentity", "runtimeManifestIdentity", "schemaVersion",
    "selectorIndependent", "sourceApplicationSha", "valueMaterialRecorded"
  ]);
  const contract = FORWARD_BUILD_ROLES[record.buildRole];
  if (!contract || record.schemaVersion !== BUILD_RELEASE_INTEGRITY_SCHEMA ||
      record.sourceApplicationSha !== FORWARD_APPLICATION_SHA ||
      !/^[0-9a-f]{40}$/u.test(record.operationsCommit || "") ||
      record.appBrand !== contract.appBrand || record.publicOrigin !== contract.publicOrigin ||
      record.artifactPath !== `${RELEASE_ROOT}/${contract.runtimeRelativePath}` ||
      [record.artifactIdentity, record.buildRoleIdentity, record.crossRoleArtifactIdentity,
        record.releaseManifestIdentity, record.runtimeManifestIdentity].some(value => !/^[0-9a-f]{64}$/u.test(value || "")) ||
      record.artifactIdentity !== record.runtimeManifestIdentity ||
      record.crossRoleArtifactIdentity === record.artifactIdentity ||
      record.environmentExclusion !== "PASS" || record.releaseIntegrity !== "PASS" ||
      record.selectorIndependent !== true || record.valueMaterialRecorded !== false ||
      (expected.role && record.buildRole !== expected.role) ||
      (expected.operationsCommit && record.operationsCommit !== expected.operationsCommit)) {
    throw new Error("Build release-integrity record is invalid or belongs to another role.");
  }
  return record;
}

export function verifyForwardBuildReleaseIntegrity(role, operationsCommit, options = {}) {
  const contract = FORWARD_BUILD_ROLES[role];
  if (!contract || !/^[0-9a-f]{40}$/u.test(operationsCommit || "")) throw new Error("Build release-integrity role or authority is invalid.");
  const releaseRoot = resolve(options.releaseRoot ?? RELEASE_ROOT);
  const artifactRoot = resolve(options.artifactRoot ?? ARTIFACT_ROOT);
  const runtimeRoot = resolve(options.runtimeRoot ?? join(releaseRoot, contract.runtimeRelativePath));
  const otherRole = role === "bcn" ? "circle-card" : "bcn";
  const runtimeManifestPath = join(artifactRoot, `runtime-${role}.manifest`);
  const otherManifestPath = join(artifactRoot, `runtime-${otherRole}.manifest`);
  const releaseManifestPath = join(artifactRoot, "forward-release.manifest");
  if (options.operational === true && (releaseRoot !== RELEASE_ROOT || runtimeRoot !== `${RELEASE_ROOT}/${contract.runtimeRelativePath}` ||
      realpathSync(releaseRoot) !== releaseRoot || realpathSync(runtimeRoot) !== runtimeRoot || lstatSync(runtimeRoot).isSymbolicLink())) {
    throw new Error("Build release-integrity path is outside the fixed immutable release contract.");
  }
  (options.assertRuntime ?? assertRuntimeCacheExcluded)(runtimeRoot);
  const runtimeManifest = readFileSync(runtimeManifestPath, "utf8");
  const otherManifest = readFileSync(otherManifestPath, "utf8");
  const actualRuntime = (options.createManifest ?? createContentManifest)(runtimeRoot);
  if (actualRuntime !== runtimeManifest || runtimeManifest === otherManifest) throw new Error("Role runtime manifest is stale, reused, or belongs to the other application.");
  const releaseManifest = readFileSync(releaseManifestPath, "utf8");
  (options.verifyRelease ?? verifyReleaseManifest)(releaseRoot, releaseManifest, options.releaseOptions);
  const roleResult = (options.verifyBuildRole ?? verifyForwardBuildRoleRecord)(role, runtimeRoot, operationsCommit, { operational: options.operational === true });
  (options.verifyExclusion ?? verifyArtifactEnvironmentExclusion)(role, runtimeRoot, { operational: options.operational === true });
  for (const selector of options.selectorPaths ?? SELECTORS) {
    try { lstatSync(selector); throw new Error("Build release-integrity found a selector object."); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  return validateBuildReleaseIntegrity({
    schemaVersion: BUILD_RELEASE_INTEGRITY_SCHEMA,
    buildRole: role,
    sourceApplicationSha: FORWARD_APPLICATION_SHA,
    operationsCommit,
    appBrand: contract.appBrand,
    publicOrigin: contract.publicOrigin,
    artifactPath: runtimeRoot,
    artifactIdentity: sha256(Buffer.from(runtimeManifest)),
    runtimeManifestIdentity: sha256(Buffer.from(runtimeManifest)),
    crossRoleArtifactIdentity: sha256(Buffer.from(otherManifest)),
    releaseManifestIdentity: sha256(Buffer.from(releaseManifest)),
    buildRoleIdentity: roleResult.identity,
    environmentExclusion: "PASS",
    releaseIntegrity: "PASS",
    selectorIndependent: true,
    valueMaterialRecorded: false
  }, { role, operationsCommit });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, role, operationsCommit, ...extras] = process.argv.slice(2);
  if (command !== "verify" || extras.length || !role || !operationsCommit) {
    throw new Error("Usage: build-release-integrity.mjs verify <bcn|circle-card> <operations-commit>");
  }
  const result = verifyForwardBuildReleaseIntegrity(role, operationsCommit, { operational: true });
  process.stdout.write(`BUILD_RELEASE_INTEGRITY_PASS role=${role} artifact=${result.artifactIdentity} selectors-required=false values-recorded=false\n`);
}
