import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, chownSync, closeSync, fsyncSync, lstatSync, openSync, readFileSync, readdirSync, realpathSync } from "node:fs";
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

function pathIsAbsent(path) {
  try { lstatSync(path); return false; }
  catch (error) { if (error?.code === "ENOENT") return true; throw error; }
}

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
      (enforceMetadata && (contract.rootUid !== 0 || contract.rootGid !== contract.buildGid || contract.rootMode !== 0o710 || contract.privateUid !== contract.buildUid || contract.privateGid !== contract.buildGid || contract.privateMode !== 0o400 || contract.publicUid !== 0 || contract.publicGid !== 0 || contract.publicMode !== 0o444)) ||
      contract.buildReadable !== true || contract.buildWritable !== false || contract.bcnReadable !== false || contract.circleReadable !== false || contract.runtimeWritable !== false) {
    throw new Error("Approved Git authentication material contract is invalid.");
  }
  return contract;
}

export function verifyAuthMaterial({ enforceMetadata = true } = {}) {
  const rootStats = lstatSync(AUTH_ROOT), privateStats = lstatSync(PRIVATE_KEY), publicStats = lstatSync(PUBLIC_KEY);
  const buildUid = enforceMetadata ? Number(execFileSync("/usr/bin/id", ["-u", "phase-f1-build"], { encoding: "utf8" }).trim()) : 1;
  const buildGid = enforceMetadata ? Number(execFileSync("/usr/bin/id", ["-g", "phase-f1-build"], { encoding: "utf8" }).trim()) : 1;
  const publicContent = readFileSync(PUBLIC_KEY, "utf8");
  const derivedPublic = enforceMetadata ? execFileSync("/usr/bin/sudo", ["-u", "phase-f1-build", "/usr/bin/env", "-i", "HOME=/var/lib/thebusinesscircle/build", "PATH=/usr/local/bin:/usr/bin:/bin", "/usr/bin/ssh-keygen", "-y", "-f", PRIVATE_KEY], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).trim().split(/\s+/u).slice(0, 2).join(" ") : publicContent.trim().split(/\s+/u).slice(0, 2).join(" ");
  validateAuthContract({
    rootCanonical: realpathSync(AUTH_ROOT) === AUTH_ROOT, rootDirectory: rootStats.isDirectory(), rootSymlink: rootStats.isSymbolicLink(), rootUid: rootStats.uid, rootGid: rootStats.gid, rootMode: rootStats.mode & 0o777, buildUid, buildGid,
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

export function validatePartialRecoveryContract(contract) {
  if (contract.rootCanonical !== true || contract.rootDirectory !== true || contract.rootSymlink !== false || contract.rootUid !== 0 || contract.rootGid !== contract.buildGid || contract.rootMode !== 0o710 ||
      contract.entries !== "github-deploy-key,github-deploy-key.pub" || contract.privateCanonical !== true || contract.privateRegular !== true || contract.privateSymlink !== false || contract.privateLinks !== 1 || contract.privateUid !== 0 || contract.privateGid !== contract.buildGid || contract.privateMode !== 0o440 ||
      contract.publicCanonical !== true || contract.publicRegular !== true || contract.publicSymlink !== false || contract.publicLinks !== 1 || contract.publicUid !== 0 || contract.publicGid !== 0 || contract.publicMode !== 0o444 ||
      contract.readinessAbsent !== true || contract.buildsCanonical !== true || contract.buildsDirectory !== true || contract.buildsSymlink !== false || contract.buildsEmpty !== true || contract.keyUnused !== true || contract.privateEnvelope !== true) {
    throw new Error("Git authentication partial recovery state is invalid.");
  }
  return contract;
}

export function recoverPartialAuthMaterial() {
  const buildUid = Number(execFileSync("/usr/bin/id", ["-u", "phase-f1-build"], { encoding: "utf8" }).trim());
  const buildGid = Number(execFileSync("/usr/bin/id", ["-g", "phase-f1-build"], { encoding: "utf8" }).trim());
  const rootStats = lstatSync(AUTH_ROOT), privateStats = lstatSync(PRIVATE_KEY), publicStats = lstatSync(PUBLIC_KEY);
  const before = readFileSync(PRIVATE_KEY);
  const publicBefore = readFileSync(PUBLIC_KEY);
  const buildsStats = lstatSync("/var/www/builds");
  const fuser = spawnSync("/usr/bin/fuser", ["-s", PRIVATE_KEY], { stdio: "ignore" });
  validatePartialRecoveryContract({
    rootCanonical: realpathSync(AUTH_ROOT) === AUTH_ROOT, rootDirectory: rootStats.isDirectory(), rootSymlink: rootStats.isSymbolicLink(), rootUid: rootStats.uid, rootGid: rootStats.gid, rootMode: rootStats.mode & 0o777, buildGid,
    entries: readdirSync(AUTH_ROOT).sort().join(","),
    privateCanonical: realpathSync(PRIVATE_KEY) === PRIVATE_KEY, privateRegular: privateStats.isFile(), privateSymlink: privateStats.isSymbolicLink(), privateLinks: privateStats.nlink, privateUid: privateStats.uid, privateGid: privateStats.gid, privateMode: privateStats.mode & 0o777,
    publicCanonical: realpathSync(PUBLIC_KEY) === PUBLIC_KEY, publicRegular: publicStats.isFile(), publicSymlink: publicStats.isSymbolicLink(), publicLinks: publicStats.nlink, publicUid: publicStats.uid, publicGid: publicStats.gid, publicMode: publicStats.mode & 0o777,
    readinessAbsent: pathIsAbsent(READINESS), buildsCanonical: realpathSync("/var/www/builds") === "/var/www/builds", buildsDirectory: buildsStats.isDirectory(), buildsSymlink: buildsStats.isSymbolicLink(), buildsEmpty: readdirSync("/var/www/builds").length === 0, keyUnused: fuser.status === 1,
    privateEnvelope: before.length >= 100 && before.length <= 4096 && before.subarray(0, 35).toString("ascii") === "-----BEGIN OPENSSH PRIVATE KEY-----"
  });
  chownSync(PRIVATE_KEY, buildUid, buildGid);
  chmodSync(PRIVATE_KEY, 0o400);
  const fd = openSync(PRIVATE_KEY, "r"); fsyncSync(fd); closeSync(fd);
  const directory = openSync(AUTH_ROOT, "r"); fsyncSync(directory); closeSync(directory);
  if (!readFileSync(PRIVATE_KEY).equals(before)) throw new Error("Private-key byte identity changed during metadata recovery.");
  if (!readFileSync(PUBLIC_KEY).equals(publicBefore)) throw new Error("Public-key byte identity changed during metadata recovery.");
  verifyAuthMaterial();
  return { privateKeyByteIdentityPreserved: true, keypairMatch: true };
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
  else if (command === "recover-partial" && !operationsCommit) { const result = recoverPartialAuthMaterial(); process.stdout.write(`PRIVATE_KEY_BYTE_IDENTITY_PRESERVED=${result.privateKeyByteIdentityPreserved ? "PASS" : "FAIL"} KEYPAIR_MATCH=${result.keypairMatch ? "PASS" : "FAIL"}\n`); }
  else throw new Error("Usage: git-authentication.mjs <verify-material|recover-partial|verify-ready|publish-ready|public-key> [operations-commit]");
}
