import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";

export const AUTH_ROOT = "/var/lib/thebusinesscircle/build/git-auth";
export const PRIVATE_KEY = `${AUTH_ROOT}/github-deploy-key`;
export const PUBLIC_KEY = `${PRIVATE_KEY}.pub`;
export const READINESS = "/var/lib/thebusinesscircle/deployment-state/git-auth-readiness.json";
export const REPOSITORY = "TheBusinessCircle/The-Business-Circle.Net";
export const FORMAT = "phase-f1-git-auth-readiness-v1";
const sha = value => createHash("sha256").update(value).digest("hex");

function userTest(user, predicate, path) {
  try { execFileSync("/usr/bin/sudo", ["-u", user, "/usr/bin/test", predicate, path], { stdio: "ignore" }); return true; }
  catch { return false; }
}

export function validateAuthContract(contract, { enforceMetadata = true } = {}) {
  if (contract.rootCanonical !== true || contract.rootDirectory !== true || contract.rootSymlink !== false ||
      contract.privateCanonical !== true || contract.privateRegular !== true || contract.privateSymlink !== false || contract.privateLinks !== 1 ||
      contract.publicCanonical !== true || contract.publicRegular !== true || contract.publicSymlink !== false || contract.publicLinks !== 1 ||
      !/^ssh-ed25519 [A-Za-z0-9+/]+={0,2} phase-f1-github-deploy-key\n$/u.test(contract.publicContent) ||
      contract.derivedPublic !== contract.publicContent.trim().split(/\s+/u).slice(0, 2).join(" ") ||
      (enforceMetadata && (contract.rootUid !== 0 || contract.rootGid !== contract.buildGid || contract.rootMode !== 0o710 || contract.privateUid !== 0 || contract.privateGid !== contract.buildGid || contract.privateMode !== 0o440 || contract.publicUid !== 0 || contract.publicGid !== 0 || contract.publicMode !== 0o444)) ||
      contract.buildReadable !== true || contract.buildWritable !== false || contract.bcnReadable !== false || contract.circleReadable !== false || contract.runtimeWritable !== false) {
    throw new Error("Approved Git authentication material contract is invalid.");
  }
  return contract;
}

export function verifyAuthMaterial({ enforceMetadata = true } = {}) {
  const rootStats = lstatSync(AUTH_ROOT), privateStats = lstatSync(PRIVATE_KEY), publicStats = lstatSync(PUBLIC_KEY);
  const buildGid = enforceMetadata ? Number(execFileSync("/usr/bin/id", ["-g", "phase-f1-build"], { encoding: "utf8" }).trim()) : 1;
  const publicContent = readFileSync(PUBLIC_KEY, "utf8");
  const derivedPublic = execFileSync("/usr/bin/ssh-keygen", ["-y", "-f", PRIVATE_KEY], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).trim();
  validateAuthContract({
    rootCanonical: realpathSync(AUTH_ROOT) === AUTH_ROOT, rootDirectory: rootStats.isDirectory(), rootSymlink: rootStats.isSymbolicLink(), rootUid: rootStats.uid, rootGid: rootStats.gid, rootMode: rootStats.mode & 0o777, buildGid,
    privateCanonical: realpathSync(PRIVATE_KEY) === PRIVATE_KEY, privateRegular: privateStats.isFile(), privateSymlink: privateStats.isSymbolicLink(), privateLinks: privateStats.nlink, privateUid: privateStats.uid, privateGid: privateStats.gid, privateMode: privateStats.mode & 0o777,
    publicCanonical: realpathSync(PUBLIC_KEY) === PUBLIC_KEY, publicRegular: publicStats.isFile(), publicSymlink: publicStats.isSymbolicLink(), publicLinks: publicStats.nlink, publicUid: publicStats.uid, publicGid: publicStats.gid, publicMode: publicStats.mode & 0o777,
    publicContent, derivedPublic,
    buildReadable: enforceMetadata ? userTest("phase-f1-build", "-r", PRIVATE_KEY) : true,
    buildWritable: enforceMetadata ? userTest("phase-f1-build", "-w", PRIVATE_KEY) : false,
    bcnReadable: enforceMetadata ? userTest("bcn-app", "-r", PRIVATE_KEY) : false,
    circleReadable: enforceMetadata ? userTest("circle-card-app", "-r", PRIVATE_KEY) : false,
    runtimeWritable: enforceMetadata ? (userTest("bcn-app", "-w", AUTH_ROOT) || userTest("circle-card-app", "-w", AUTH_ROOT)) : false
  }, { enforceMetadata });
  return { publicKeySha256: sha(publicContent), privateKey: PRIVATE_KEY };
}

export function validateReadiness(record, operationsCommit, publicKeySha256) {
  if (record?.schemaVersion !== FORMAT || record.operationsCommit !== operationsCommit || record.repository !== REPOSITORY ||
      record.host !== "github.com" || record.authentication !== "REPOSITORY_SCOPED_DEPLOY_KEY" || record.publicKeySha256 !== publicKeySha256 ||
      record.material !== "PRESENT" || record.githubAuthorization !== "VERIFIED" || record.ready !== true || record.valueMaterialRecorded !== false ||
      Object.keys(record).sort().join(",") !== "authentication,githubAuthorization,host,material,operationsCommit,publicKeySha256,ready,repository,schemaVersion,valueMaterialRecorded") {
    throw new Error("Git authentication readiness is invalid.");
  }
  return record;
}

export function verifyReadiness(operationsCommit) {
  const material = verifyAuthMaterial();
  const stats = lstatSync(READINESS);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 || stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o600 || realpathSync(READINESS) !== READINESS) throw new Error("Unsafe Git authentication readiness evidence.");
  validateReadiness(JSON.parse(readFileSync(READINESS, "utf8")), operationsCommit, material.publicKeySha256);
  return material.privateKey;
}

export function publishReadiness(operationsCommit) {
  if (!/^[0-9a-f]{40}$/u.test(operationsCommit)) throw new Error("Exact operations commit required.");
  const material = verifyAuthMaterial();
  const record = { schemaVersion: FORMAT, operationsCommit, repository: REPOSITORY, host: "github.com", authentication: "REPOSITORY_SCOPED_DEPLOY_KEY", publicKeySha256: material.publicKeySha256, material: "PRESENT", githubAuthorization: "VERIFIED", ready: true, valueMaterialRecorded: false };
  validateReadiness(record, operationsCommit, material.publicKeySha256);
  publishNoReplaceSet([{ target: READINESS, payload: `${JSON.stringify(record)}\n`, mode: 0o600, uid: 0, gid: 0 }]);
  verifyReadiness(operationsCommit);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, operationsCommit, ...extras] = process.argv.slice(2);
  if (extras.length) throw new Error("Unexpected Git authentication arguments.");
  if (command === "verify-material" && !operationsCommit) { verifyAuthMaterial(); process.stdout.write("GIT_AUTH_MATERIAL_PRESENT\n"); }
  else if (command === "verify-ready" && operationsCommit) { process.stdout.write(`${verifyReadiness(operationsCommit)}\n`); }
  else if (command === "publish-ready" && operationsCommit) { publishReadiness(operationsCommit); process.stdout.write("GIT_AUTH_READY\n"); }
  else if (command === "public-key" && !operationsCommit) { verifyAuthMaterial(); process.stdout.write(readFileSync(PUBLIC_KEY, "utf8")); }
  else throw new Error("Usage: git-authentication.mjs <verify-material|verify-ready|publish-ready|public-key> [operations-commit]");
}
