import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HISTORICAL_PRODUCTION_SHA, ROLLBACK_APPLICATION_SHA } from "./application-identities.mjs";
export const ROLLBACK_COMMIT_FILE_SET = [
  "docs/bcn-phase-e3-rollback-immutable-runtime-cache.md",
  "next.config.ts",
  "src/config/rollback-immutable-runtime-cache.test.ts"
];
export const requiredRollbackEvidence = [
  "operationsIdentity", "rollbackCommitStructureEvidence", "rollbackPostBuildCommitEvidence", "rollbackCandidateProvenance",
  "rollbackArtifactManifest", "rollbackLinuxNextStartEvidence", "rollbackUbuntuImmutabilityEvidence",
  "rollbackImageLoadEvidence", "storageManifestIndex", "databaseIdentityEvidence",
  "bcnEnvironmentReadiness", "systemdUnitManifest", "privateSmokeEvidence"
];
const sha = (value) => createHash("sha256").update(value).digest("hex");
function safeEvidence(path) { const s = lstatSync(path); if (!s.isFile() || s.isSymbolicLink() || s.nlink !== 1 || s.uid !== 0 || (s.mode & 0o077)) throw new Error(`Unsafe rollback evidence: ${path}`); return sha(readFileSync(path)); }
export function createRollbackProof(path, identity, evidencePaths, { operational = false } = {}) {
  if (existsSync(path) || identity.rollbackApplicationSha !== ROLLBACK_APPLICATION_SHA || identity.historicalParentSha !== HISTORICAL_PRODUCTION_SHA || JSON.stringify(identity.commitFileSet) !== JSON.stringify(ROLLBACK_COMMIT_FILE_SET)) throw new Error("Exclusive proof path and exact rollback identity required.");
  for (const name of requiredRollbackEvidence) if (!evidencePaths[name]) throw new Error(`Missing rollback evidence: ${name}`);
  const evidence = Object.fromEntries(requiredRollbackEvidence.map((name) => [name, { path: evidencePaths[name], sha256: operational ? safeEvidence(evidencePaths[name]) : sha(readFileSync(evidencePaths[name])) }]));
  const payload = { ...identity, evidence }; const body = JSON.stringify({ payload, sha256: sha(JSON.stringify(payload)) }, null, 2) + "\n";
  const temp = `${path}.${process.pid}.tmp`, fd = openSync(temp, "wx", 0o600); try { writeFileSync(fd, body); fsyncSync(fd); } finally { closeSync(fd); } renameSync(temp, path);
  return body;
}
export function verifyRollbackProof(path, identity, { operational = false } = {}) {
  if (identity.rollbackApplicationSha !== ROLLBACK_APPLICATION_SHA || identity.historicalParentSha !== HISTORICAL_PRODUCTION_SHA || JSON.stringify(identity.commitFileSet) !== JSON.stringify(ROLLBACK_COMMIT_FILE_SET)) throw new Error("Exact approved rollback identity is required for proof verification.");
  if (operational) safeEvidence(path); const proof = JSON.parse(readFileSync(path, "utf8"));
  if (proof.payload.rollbackApplicationSha !== identity.rollbackApplicationSha || proof.payload.historicalParentSha !== identity.historicalParentSha || JSON.stringify(proof.payload.commitFileSet) !== JSON.stringify(identity.commitFileSet) || sha(JSON.stringify(proof.payload)) !== proof.sha256) throw new Error("Rollback proof identity mismatch.");
  for (const name of requiredRollbackEvidence) { const item = proof.payload.evidence[name]; if (!item) throw new Error(`Rollback proof evidence missing: ${name}`); const current = operational ? safeEvidence(item.path) : sha(readFileSync(item.path)); if (current !== item.sha256) throw new Error(`Rollback evidence changed: ${name}`); }
  return proof.payload;
}
if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [command, path, rollbackApplicationSha, historicalParentSha, privateSmokePath] = process.argv.slice(2);
  const identity = { rollbackApplicationSha, historicalParentSha, commitFileSet: ROLLBACK_COMMIT_FILE_SET };
  if (command === "create") {
    const root = dirname(path); createRollbackProof(path, identity, {
      operationsIdentity: "/var/lib/thebusinesscircle/approved-phase-f1-pack.json",
      rollbackCommitStructureEvidence: `${root}/rollback-application-identity.json`,
      rollbackPostBuildCommitEvidence: `${root}/rollback-application-identity.post-build.json`,
      rollbackCandidateProvenance: `${root}/rollback-production-fixture-provenance.json`,
      rollbackArtifactManifest: `/var/lib/thebusinesscircle/artifacts/2c83694de301b0244c5586c1598aceb10fa2214b-5d1f81bb05a01b08e1134785c2f86b77c8969fe3/rollback-bcn.artifact.json`,
      rollbackLinuxNextStartEvidence: `${root}/rollback-linux-next-start-evidence.json`,
      rollbackUbuntuImmutabilityEvidence: `${root}/rollback-ubuntu-rehearsal-evidence.json`,
      rollbackImageLoadEvidence: `${root}/rollback-image-load-evidence.json`,
      storageManifestIndex: `${root}/storage-proof-index.sha256`,
      databaseIdentityEvidence: `${root}/database-backup.evidence.json`,
      bcnEnvironmentReadiness: `${root}/environment-readiness.json`,
      systemdUnitManifest: `${root}/systemd-unit-manifest.sha256`,
      privateSmokeEvidence: privateSmokePath || `${root}/rollback-private-smoke.evidence`
    }, { operational: true });
  } else if (command === "verify") verifyRollbackProof(path, identity, { operational: true });
  else throw new Error("Usage: rollback-proof.mjs <create|verify> <path> <rollback-sha> <historical-parent-sha> [private-smoke]");
}
