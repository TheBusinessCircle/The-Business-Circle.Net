import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FORWARD_APPLICATION_SHA, ROLLBACK_APPLICATION_SHA } from "./application-identities.mjs";
import { validateReleaseEvidence } from "./validate-release-gates.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
function protectedBody(path, operational) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || (operational && (stats.uid !== 0 || (stats.mode & 0o077)))) throw new Error(`Unsafe artifact identity input: ${path}`);
  return readFileSync(path);
}

export function createArtifactIdentity({ applicationRole, applicationSha, operationsIdentity, operationsPackIdentityPath, buildIdPath, sourceTreeIdentityPath, contentManifestPath, environmentReadinessPath, databaseIdentityPath, storageManifestPath, systemdUnitPath, rehearsalEvidenceIdentity }, { operational = false } = {}) {
  const expectedSha = applicationRole === "rollback-bcn" ? ROLLBACK_APPLICATION_SHA : new Set(["forward-bcn", "forward-circle-card"]).has(applicationRole) ? FORWARD_APPLICATION_SHA : null;
  if (!expectedSha || applicationSha !== expectedSha || !/^[0-9a-f]{40}$/u.test(operationsIdentity || "") || !/^[0-9a-f]{64}$/u.test(rehearsalEvidenceIdentity || "")) throw new Error("Artifact role or immutable identity is invalid.");
  const buildId = protectedBody(buildIdPath, operational).toString("utf8");
  if (!buildId.trim()) throw new Error("Artifact BUILD_ID is absent.");
  return {
    format: "phase-f1-artifact-identity-v1",
    applicationRole,
    applicationSha,
    operationsIdentity,
    operationsPackIdentityHash: sha(protectedBody(operationsPackIdentityPath, operational)),
    buildId,
    sourceTreeIdentity: sha(protectedBody(sourceTreeIdentityPath, operational)),
    artifactDigest: sha(protectedBody(contentManifestPath, operational)),
    environmentReadinessHash: sha(protectedBody(environmentReadinessPath, operational)),
    databaseIdentityHash: sha(protectedBody(databaseIdentityPath, operational)),
    storageManifestIdentity: sha(protectedBody(storageManifestPath, operational)),
    systemdUnitIdentity: sha(protectedBody(systemdUnitPath, operational)),
    rehearsalEvidenceIdentity
  };
}

export function writeArtifactIdentity(path, identity) {
  if (existsSync(path)) throw new Error("Artifact identity already exists.");
  const temporary = `${path}.${process.pid}.tmp`, fd = openSync(temporary, "wx", 0o600);
  try { writeFileSync(fd, `${JSON.stringify(identity, null, 2)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, path);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [role, stateRootArg, artifactRootArg, operationsIdentity] = process.argv.slice(2);
  const stateRoot = resolve(stateRootArg || ""), artifactRoot = resolve(artifactRootArg || "");
  const rollback = role === "rollback-bcn", circle = role === "forward-circle-card";
  const applicationRole = role;
  const applicationSha = rollback ? ROLLBACK_APPLICATION_SHA : FORWARD_APPLICATION_SHA;
  const releaseRoot = rollback ? `/var/www/rollbacks/${ROLLBACK_APPLICATION_SHA}` : `/var/www/releases/${FORWARD_APPLICATION_SHA}`;
  const contentName = rollback ? "rollback-release.manifest" : "forward-release.manifest";
  const buildIdPath = rollback ? join(releaseRoot, ".next", "BUILD_ID") : join(releaseRoot, ".runtime", circle ? "circle-card" : "bcn", "BUILD_ID");
  const sourceTreeIdentityPath = join(stateRoot, rollback ? "rollback-application-identity.json" : "forward-application-identity.json");
  const rehearsalEvidenceIdentity = validateReleaseEvidence(stateRoot, rollback ? "rollback" : "forward", { operational: true });
  const identity = createArtifactIdentity({ applicationRole, applicationSha, operationsIdentity, operationsPackIdentityPath: "/var/lib/thebusinesscircle/approved-phase-f1-pack.json", buildIdPath, sourceTreeIdentityPath, contentManifestPath: join(artifactRoot, contentName), environmentReadinessPath: join(stateRoot, "environment-readiness.json"), databaseIdentityPath: join(stateRoot, "database-backup.evidence.json"), storageManifestPath: join(stateRoot, "artifact-storage-manifest-index.sha256"), systemdUnitPath: join(stateRoot, "systemd-unit-manifest.sha256"), rehearsalEvidenceIdentity }, { operational: true });
  const output = join(artifactRoot, `${role}.artifact.json`);
  writeArtifactIdentity(output, identity);
  process.stdout.write(sha(readFileSync(output)));
}
