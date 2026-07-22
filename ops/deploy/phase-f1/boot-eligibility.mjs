import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { FORWARD_APPLICATION_SHA, ROLLBACK_APPLICATION_SHA } from "./application-identities.mjs";
import { createReleaseManifest } from "./artifact-manifest.mjs";

const FORMAT = "phase-f1-boot-eligibility-v1";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const roles = { rollback: { sha: ROLLBACK_APPLICATION_SHA, target: `/var/www/rollbacks/${ROLLBACK_APPLICATION_SHA}` }, forward: { sha: FORWARD_APPLICATION_SHA, target: `/var/www/releases/${FORWARD_APPLICATION_SHA}` } };

function exactKeys(record) {
  const expected = ["activeBcnSelector", "applicationSha", "artifactDigest", "durableStateDigest", "eligibilityGeneration", "format", "operationsIdentity", "selectedArtifactRole"];
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(expected)) throw new Error("Boot eligibility has unknown or missing fields.");
}

export function validateBootEligibility(record, { operationsIdentity, selectorTarget, previousGeneration = 0 } = {}) {
  exactKeys(record);
  const role = roles[record.selectedArtifactRole];
  if (record.format !== FORMAT || !role || record.activeBcnSelector !== record.selectedArtifactRole || record.applicationSha !== role.sha || selectorTarget !== role.target) throw new Error("Boot eligibility selected an unapproved artifact.");
  if (record.operationsIdentity !== operationsIdentity || !/^[0-9a-f]{40}$/u.test(record.operationsIdentity)) throw new Error("Boot eligibility operations identity mismatch.");
  for (const key of ["artifactDigest", "durableStateDigest"]) if (!/^[0-9a-f]{64}$/u.test(record[key])) throw new Error(`Boot eligibility ${key} is invalid.`);
  if (!Number.isSafeInteger(record.eligibilityGeneration) || record.eligibilityGeneration <= previousGeneration) throw new Error("Boot eligibility generation is stale.");
  return record;
}

function protectedFile(path, mode) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || stats.uid !== 0 || (stats.mode & 0o777) !== mode) throw new Error("Unsafe boot eligibility object.");
}

export function publishBootEligibility({ statePath, bindingsPath, artifactIdentityPath, outputPath, operationsIdentity }, { operational = false } = {}) {
  const stateBytes = readFileSync(statePath), bindings = JSON.parse(readFileSync(bindingsPath)), artifactBytes = readFileSync(artifactIdentityPath), artifact = JSON.parse(artifactBytes);
  const selectedArtifactRole = bindings.activeBcnSelector, role = roles[selectedArtifactRole];
  if (!role || artifact.applicationSha !== role.sha || artifact.applicationRole !== `${selectedArtifactRole}-bcn` || artifact.operationsIdentity !== operationsIdentity || !/^[0-9a-f]{64}$/u.test(artifact.artifactDigest || "")) throw new Error("Artifact and selector identity mismatch.");
  const prior = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : null;
  const record = validateBootEligibility({ format: FORMAT, operationsIdentity, activeBcnSelector: selectedArtifactRole, selectedArtifactRole, applicationSha: role.sha, artifactDigest: artifact.artifactDigest, durableStateDigest: sha256(stateBytes), eligibilityGeneration: (prior?.eligibilityGeneration || 0) + 1 }, { operationsIdentity, selectorTarget: role.target, previousGeneration: prior?.eligibilityGeneration || 0 });
  const parent = dirname(outputPath);
  if (!existsSync(parent)) mkdirSync(parent, { mode: 0o755 });
  if (operational) {
    const parentStats = lstatSync(parent);
    if (!parentStats.isDirectory() || parentStats.isSymbolicLink() || parentStats.uid !== 0 || (parentStats.mode & 0o022)) throw new Error("Unsafe boot eligibility parent.");
    protectedFile(statePath, 0o600); protectedFile(bindingsPath, 0o600); protectedFile(artifactIdentityPath, 0o600);
    if (sha256(Buffer.from(createReleaseManifest(role.target))) !== artifact.artifactDigest) throw new Error("Cannot publish eligibility for a changed release.");
  }
  const temporary = join(parent, `.eligibility.${process.pid}.${Date.now()}.tmp`), fd = openSync(temporary, "wx", 0o444);
  try { writeFileSync(fd, `${JSON.stringify(record, null, 2)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, outputPath);
  if (operational) { const directoryFd = openSync(parent, "r"); try { fsyncSync(directoryFd); } finally { closeSync(directoryFd); } protectedFile(outputPath, 0o444); }
  return record;
}

export function verifyBootEligibilityFile(path, { operationsIdentity, selectorPath, operational = false } = {}) {
  if (operational) protectedFile(path, 0o444);
  const selectorTarget = realpathSync(selectorPath), record = validateBootEligibility(JSON.parse(readFileSync(path, "utf8")), { operationsIdentity, selectorTarget });
  if (sha256(Buffer.from(createReleaseManifest(selectorTarget))) !== record.artifactDigest) throw new Error("Boot eligibility release manifest is stale or tampered.");
  return record;
}

const [command, ...args] = process.argv.slice(2);
if (command === "publish") {
  const [statePath, bindingsPath, artifactIdentityPath, outputPath, operationsIdentity] = args;
  publishBootEligibility({ statePath, bindingsPath, artifactIdentityPath, outputPath, operationsIdentity }, { operational: true });
} else if (command === "verify") {
  const [path, operationsIdentity, selectorPath] = args;
  verifyBootEligibilityFile(resolve(path), { operationsIdentity, selectorPath, operational: true });
} else if (command) throw new Error("Usage: boot-eligibility.mjs <publish|verify> ...");
