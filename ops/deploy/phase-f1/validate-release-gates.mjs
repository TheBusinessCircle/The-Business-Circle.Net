import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FORWARD_APPLICATION_SHA, HISTORICAL_PRODUCTION_SHA, ROLLBACK_APPLICATION_SHA } from "./application-identities.mjs";

const ROLLBACK_FILE_SET = [
  "docs/bcn-phase-e3-rollback-immutable-runtime-cache.md",
  "next.config.ts",
  "src/config/rollback-immutable-runtime-cache.test.ts"
];
const ROLLBACK_NETWORK_POLICY = "linux-network-namespace-no-routes-with-local-next-font-mock-v1";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const digest = (value, label) => {
  if (!/^[0-9a-f]{64}$/u.test(value || "")) throw new Error(`${label} digest is absent.`);
};
function protectedJson(path, operational) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || (operational && (stats.uid !== 0 || (stats.mode & 0o077)))) throw new Error("Unsafe release-gate evidence.");
  return JSON.parse(readFileSync(path, "utf8"));
}

function validatePerformanceEvidence(rehearsal, role) {
  if (rehearsal.os !== "Ubuntu 22.04.5 LTS" || rehearsal.node !== "v22.22.2" || rehearsal.cpuCount !== 4 || rehearsal.ramGiB !== 7.7 || rehearsal.skipped !== false) throw new Error(`${role} target rehearsal identity is absent or skipped.`);
  for (const key of ["beforeRuntimeManifestSha256", "afterRuntimeManifestSha256"]) digest(rehearsal[key], `${role} ${key}`);
  if (rehearsal.beforeRuntimeManifestSha256 !== rehearsal.afterRuntimeManifestSha256 || rehearsal.immutableMutationCount !== 0 || rehearsal.eaccesCount !== 0 || rehearsal.image5xx !== 0 || rehearsal.crashes !== 0 || rehearsal.ooms !== 0 || rehearsal.systemdRestarts !== 0 || rehearsal.authenticatedRevalidationPassed !== true || rehearsal.operatorHeadroomApproved !== true) throw new Error(`${role} immutable/image-load hard stop triggered.`);
  for (const phase of ["cold", "sequential", "burst", "sustained"]) {
    const metrics = rehearsal.imageLoad?.[phase];
    for (const name of ["requests", "concurrency", "successes", "errors", "p50Ms", "p95Ms", "applicationCpuPercent", "systemCpuPercent", "processRssBytes", "availableMemoryBytes"]) if (!Number.isFinite(metrics?.[name])) throw new Error(`Missing ${role} ${phase} metric ${name}.`);
  }
  for (const key of ["revalidatePathPassed", "revalidateTagPassed", "unstableCachePassed", "upstreamBehaviorApproved", "latencyApproved", "cpuHeadroomApproved", "rssGrowthApproved"]) if (rehearsal[key] !== true) throw new Error(`${role} rehearsal approval missing: ${key}`);
}

export function validateReleaseEvidenceObjects(role, evidence) {
  if (role === "rollback") {
    const { identity, provenance, nextStart, rehearsal, imageLoad } = evidence;
    if (identity.applicationSha !== ROLLBACK_APPLICATION_SHA || identity.parentSha !== HISTORICAL_PRODUCTION_SHA || identity.role !== "rollback") throw new Error("Rollback commit identity is wrong.");
    if (provenance.schemaVersion !== 1 || provenance.fixtureFormatVersion !== "phase-e3-historical-bcn-next-15.5.15-v1" || provenance.historicalBaseSha !== HISTORICAL_PRODUCTION_SHA || provenance.rollbackCandidateCommitSha !== ROLLBACK_APPLICATION_SHA || provenance.rollbackCandidateParentSha !== HISTORICAL_PRODUCTION_SHA || provenance.sourceMode !== "committed-candidate" || provenance.rollbackPurpose !== "historical-bcn-immutable-runtime-rollback" || provenance.nextVersion !== "15.5.15" || provenance.syntheticBuild !== true || provenance.productionAuthorityPresent !== false || provenance.buildIdentity !== "historical-bcn" || provenance.outboundNetworkPolicy !== ROLLBACK_NETWORK_POLICY) throw new Error("Rollback committed-candidate provenance is incomplete or substituted.");
    if (JSON.stringify(provenance.candidateCommitFileSet) !== JSON.stringify(ROLLBACK_FILE_SET) || JSON.stringify(provenance.reviewedFiles?.map((entry) => entry.path)) !== JSON.stringify(ROLLBACK_FILE_SET)) throw new Error("Rollback provenance file set is wrong.");
    for (const entry of provenance.reviewedFiles) digest(entry.sha256, `rollback reviewed file ${entry.path}`);
    for (const key of ["candidateCommitDiffDigest", "reviewedFilesAggregateSha256", "nextConfigSha256", "packageJsonSha256", "packageLockJsonSha256"]) digest(provenance[key], `rollback provenance ${key}`);
    if (typeof provenance.buildId !== "string" || provenance.buildId.length === 0 || provenance.artifactManifest?.algorithm !== "sha256" || !Number.isInteger(provenance.artifactManifest.fileCount) || provenance.artifactManifest.fileCount < 1 || !Array.isArray(provenance.artifactManifest.entries) || provenance.artifactManifest.entries.length !== provenance.artifactManifest.fileCount) throw new Error("Rollback provenance BUILD_ID or artifact manifest is incomplete.");
    digest(provenance.artifactManifest.digest, "rollback artifact manifest");
    for (const entry of provenance.artifactManifest.entries) { digest(entry.sha256, `rollback artifact ${entry.path}`); if (!Number.isInteger(entry.size) || entry.size < 0) throw new Error("Rollback artifact size is invalid."); }
    for (const key of ["provenanceSha256", "testSourceSha256", "applicationIdentitySha256", "buildIdSha256"]) digest(nextStart[key], "rollback next-start " + key);
    if (nextStart.skipped !== false || nextStart.applicationSha !== ROLLBACK_APPLICATION_SHA || nextStart.realNextStartPassed !== true || nextStart.historicalHomepagePassed !== true || nextStart.loginRedirectPassed !== true || nextStart.invalidStripeSignaturePassed !== true || nextStart.imageSignaturesPassed !== true || nextStart.runtimeManifestUnchanged !== true || nextStart.publicManifestUnchanged !== true || nextStart.fetchCacheAbsent !== true || nextStart.imageCacheAbsent !== true) throw new Error("Rollback Linux next-start evidence is absent, skipped, or incomplete.");
    validatePerformanceEvidence(rehearsal, "rollback");
    if (rehearsal.applicationSha !== ROLLBACK_APPLICATION_SHA || rehearsal.historicalBehaviorPassed !== true || rehearsal.sharedStoragePassed !== true || rehearsal.privateStoragePermissionsPassed !== true) throw new Error("Rollback Ubuntu behavior/storage evidence failed.");
    if (imageLoad.skipped !== false || imageLoad.applicationSha !== ROLLBACK_APPLICATION_SHA || imageLoad.approved !== true) throw new Error("Rollback image-load evidence is absent or skipped.");
  } else if (role === "forward") {
    const { identity, phaseE2, rehearsal } = evidence;
    if (identity.applicationSha !== FORWARD_APPLICATION_SHA || identity.parentSha !== "c95b10d82d192c273812a40c2c9d1e9e73791b96" || identity.role !== "forward") throw new Error("Forward commit identity is wrong.");
    if (phaseE2.skipped !== false || phaseE2.applicationSha !== FORWARD_APPLICATION_SHA || phaseE2.isrFlushToDisk !== false || phaseE2.cacheMaxMemorySize !== 52_428_800 || phaseE2.fetchCacheAbsent !== true || phaseE2.imageCacheAbsent !== true || phaseE2.immutableManifestPassed !== true || phaseE2.authenticatedRevalidationPassed !== true || phaseE2.insightRoutesPassed !== true || phaseE2.repeatedImagesPassed !== true || phaseE2.bcnThenCirclePassed !== true || phaseE2.circleThenBcnPassed !== true || phaseE2.brandIsolationPassed !== true || phaseE2.cacheIsolationPassed !== true) throw new Error("Forward Phase E2 evidence is absent, skipped, or incomplete.");
    validatePerformanceEvidence(rehearsal, "forward");
    if (rehearsal.applicationSha !== FORWARD_APPLICATION_SHA || rehearsal.dualBrandIsolationPassed !== true || rehearsal.sessionIsolationPassed !== true || rehearsal.ownerRouteIsolationPassed !== true) throw new Error("Forward Ubuntu dual-runtime evidence failed.");
  } else throw new Error("Release-gate role must be forward or rollback.");
  return true;
}

export function validateReleaseEvidence(stateRoot, role, { operational = false } = {}) {
  const root = resolve(stateRoot);
  const names = role === "rollback" ? {
    identity: "rollback-application-identity.json",
    provenance: "rollback-production-fixture-provenance.json",
    nextStart: "rollback-linux-next-start-evidence.json",
    rehearsal: "rollback-ubuntu-rehearsal-evidence.json",
    imageLoad: "rollback-image-load-evidence.json"
  } : {
    identity: "forward-application-identity.json",
    phaseE2: "forward-phase-e2-evidence.json",
    rehearsal: "forward-ubuntu-rehearsal-evidence.json"
  };
  const evidence = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, protectedJson(resolve(root, name), operational)]));
  validateReleaseEvidenceObjects(role, evidence);
  return sha(Buffer.concat(Object.values(names).sort().map((name) => readFileSync(resolve(root, name)))));
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [stateRoot, role] = process.argv.slice(2);
  if (!stateRoot || !role) throw new Error("Usage: validate-release-gates.mjs <state-root> <forward|rollback>");
  process.stdout.write(`Release gate passed; evidenceSha256=${validateReleaseEvidence(stateRoot, role, { operational: true })}`);
}
