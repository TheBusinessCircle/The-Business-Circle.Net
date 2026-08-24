import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";

const FORWARD_SHA = "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e";
const ROLLBACK_SHA = "5d1f81bb05a01b08e1134785c2f86b77c8969fe3";
const STATE_ROOT = "/var/lib/thebusinesscircle/deployment-state";
const ARTIFACT_ROOT = `/var/lib/thebusinesscircle/artifacts/${FORWARD_SHA}-${ROLLBACK_SHA}`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const BUILD_FORBIDDEN_SELECTORS = Object.freeze([
  "/var/www/current-bcn",
  "/var/www/current-bcn-rollback-probe",
  "/var/www/current-circle-card"
]);

const CONTRACTS = Object.freeze({
  rollback: Object.freeze({
    applicationSha: ROLLBACK_SHA,
    artifactPath: `/var/www/rollbacks/${ROLLBACK_SHA}`,
    manifestNames: Object.freeze(["rollback-bcn.manifest", "rollback-release.manifest"])
  }),
  forward: Object.freeze({
    applicationSha: FORWARD_SHA,
    artifactPath: `/var/www/releases/${FORWARD_SHA}`,
    manifestNames: Object.freeze([
      "built-next.manifest", "forward-release.manifest", "manifest-index.sha256",
      "runtime-bcn.manifest", "runtime-circle-card.manifest"
    ])
  })
});

function protectedFile(path, operational) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
      (operational && (stats.uid !== 0 || (stats.mode & 0o777) !== 0o600))) {
    throw new Error(`Unsafe build-only artifact evidence input: ${path}`);
  }
  return readFileSync(path);
}

export function assertBuildOnlySelectorBoundary(paths = BUILD_FORBIDDEN_SELECTORS, lstat = lstatSync) {
  for (const path of paths) {
    try {
      lstat(path);
      throw new Error(`Build-only artifact publication found a selector object: ${path}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return true;
}

export function validateBuildOnlyArtifactEvidence(record, expected = {}) {
  const keys = [
    "applicationSha", "artifactIdentity", "artifactPath", "manifestIdentities",
    "operationsCommit", "releaseIntegrity", "role", "schemaVersion",
    "selectorsPublished", "valueMaterialRecorded"
  ];
  const contract = CONTRACTS[record?.role];
  if (!contract || JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(keys) ||
      record.schemaVersion !== "phase-f1-build-only-artifact-v1" ||
      record.applicationSha !== contract.applicationSha ||
      record.artifactPath !== contract.artifactPath ||
      !/^[0-9a-f]{40}$/u.test(record.operationsCommit || "") ||
      !/^[0-9a-f]{64}$/u.test(record.artifactIdentity || "") ||
      record.releaseIntegrity !== "PASS" || record.selectorsPublished !== false ||
      record.valueMaterialRecorded !== false ||
      JSON.stringify(Object.keys(record.manifestIdentities || {}).sort()) !==
        JSON.stringify([...contract.manifestNames].sort()) ||
      Object.values(record.manifestIdentities || {}).some((value) => !/^[0-9a-f]{64}$/u.test(value)) ||
      (expected.role && record.role !== expected.role) ||
      (expected.operationsCommit && record.operationsCommit !== expected.operationsCommit)) {
    throw new Error("Build-only artifact evidence is invalid or stale.");
  }
  const aggregate = contract.manifestNames.map((name) => `${name}:${record.manifestIdentities[name]}\n`).join("");
  if (sha256(Buffer.from(aggregate)) !== record.artifactIdentity) {
    throw new Error("Build-only artifact aggregate identity differs.");
  }
  return record;
}

export function createBuildOnlyArtifactEvidence(role, operationsCommit, options = {}) {
  const contract = CONTRACTS[role];
  if (!contract || !/^[0-9a-f]{40}$/u.test(operationsCommit || "")) {
    throw new Error("Build-only artifact role or operations commit is invalid.");
  }
  assertBuildOnlySelectorBoundary(options.selectorPaths, options.lstat);
  const artifactRoot = resolve(options.artifactRoot ?? ARTIFACT_ROOT);
  const artifactPath = resolve(options.artifactPath ?? contract.artifactPath);
  if (artifactPath !== contract.artifactPath || !existsSync(artifactPath) ||
      realpathSync(artifactPath) !== artifactPath) {
    throw new Error("Build-only artifact path is absent, linked, or non-canonical.");
  }
  const artifactStats = lstatSync(artifactPath);
  if (!artifactStats.isDirectory() || artifactStats.isSymbolicLink()) {
    throw new Error("Build-only artifact root is unsafe.");
  }
  const manifestIdentities = Object.fromEntries(contract.manifestNames.map((name) => [
    name, sha256(protectedFile(join(artifactRoot, name), options.operational === true))
  ]));
  const aggregate = contract.manifestNames.map((name) => `${name}:${manifestIdentities[name]}\n`).join("");
  return validateBuildOnlyArtifactEvidence({
    schemaVersion: "phase-f1-build-only-artifact-v1",
    role,
    applicationSha: contract.applicationSha,
    operationsCommit,
    artifactPath,
    manifestIdentities,
    artifactIdentity: sha256(Buffer.from(aggregate)),
    releaseIntegrity: "PASS",
    selectorsPublished: false,
    valueMaterialRecorded: false
  }, { role, operationsCommit });
}

export function publishBuildOnlyArtifactEvidence(role, operationsCommit, options = {}) {
  const stateRoot = resolve(options.stateRoot ?? STATE_ROOT);
  const record = createBuildOnlyArtifactEvidence(role, operationsCommit, options);
  const target = join(stateRoot, `${role}-build-only-artifact.json`);
  publishNoReplaceSet([{
    target,
    payload: Buffer.from(`${JSON.stringify(record, null, 2)}\n`),
    mode: 0o600,
    uid: 0,
    gid: 0
  }], { enforceMetadata: options.operational === true, fsyncDirectories: true });
  return { record, target, evidenceIdentity: sha256(readFileSync(target)) };
}

export function verifyBuildOnlyArtifactEvidence(role, operationsCommit, options = {}) {
  const stateRoot = resolve(options.stateRoot ?? STATE_ROOT);
  const record = JSON.parse(protectedFile(join(stateRoot, `${role}-build-only-artifact.json`), options.operational === true));
  return validateBuildOnlyArtifactEvidence(record, { role, operationsCommit });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, role, operationsCommit, ...extras] = process.argv.slice(2);
  if (command !== "publish" || extras.length || !role || !operationsCommit) {
    throw new Error("Usage: build-only-artifact.mjs publish <rollback|forward> <operations-commit>");
  }
  const result = publishBuildOnlyArtifactEvidence(role, operationsCommit, { operational: true });
  process.stdout.write(`BUILD_ONLY_ARTIFACT_PUBLISHED role=${role} evidence=${result.evidenceIdentity} selectors-published=false values-recorded=false\n`);
}
