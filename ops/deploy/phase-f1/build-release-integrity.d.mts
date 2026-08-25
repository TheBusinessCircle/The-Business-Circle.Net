export interface BuildReleaseIntegrityRecord {
  schemaVersion: "phase-f1-forward-build-release-integrity-v1";
  buildRole: "bcn" | "circle-card";
  sourceApplicationSha: string;
  operationsCommit: string;
  appBrand: string;
  publicOrigin: string;
  artifactPath: string;
  artifactIdentity: string;
  runtimeManifestIdentity: string;
  crossRoleArtifactIdentity: string;
  releaseManifestIdentity: string;
  buildRoleIdentity: string;
  environmentExclusion: "PASS";
  releaseIntegrity: "PASS";
  selectorIndependent: true;
  valueMaterialRecorded: false;
}
export function validateBuildReleaseIntegrity(record: unknown, expected?: object): BuildReleaseIntegrityRecord;
export function verifyForwardBuildReleaseIntegrity(role: string, operationsCommit: string, options?: object): BuildReleaseIntegrityRecord;
