import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, chownSync, closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";
import { resolveProtectedAuthorityLineage } from "./environment-readiness.mjs";

export const AUTH_ROOT = "/var/lib/thebusinesscircle/build/git-auth";
export const PRIVATE_KEY = `${AUTH_ROOT}/github-deploy-key`;
export const PUBLIC_KEY = `${PRIVATE_KEY}.pub`;
export const READINESS = "/var/lib/thebusinesscircle/deployment-state/git-auth-readiness.json";
export const REPOSITORY = "TheBusinessCircle/The-Business-Circle.Net";
export const FORMAT = "phase-f1-git-auth-readiness-v1";
export const GIT_AUTH_READINESS_CARRY_FORWARD_FORMAT =
  "phase-f1-git-auth-readiness-carry-forward-report-v1";
export const IDENTITY_ONLY_GIT_AUTH_READINESS_CARRY_FORWARD =
  "IDENTITY_ONLY_GIT_AUTH_READINESS_CARRY_FORWARD";
export const IDENTITY_ONLY_GIT_AUTH_DELTA = "IDENTITY_ONLY";
export const STATE_ROOT = "/var/lib/thebusinesscircle/deployment-state";
const sha = value => createHash("sha256").update(value).digest("hex");

function exactKeys(value, expected, label) {
  if (!value || Array.isArray(value) || typeof value !== "object" ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} has unknown or missing fields.`);
  }
}

function validateOperationsCommit(value) {
  if (!/^[0-9a-f]{40}$/u.test(value || "")) {
    throw new Error("Git authentication operations identity is invalid.");
  }
}

function readinessPath(stateRoot) {
  return join(resolve(stateRoot), "git-auth-readiness.json");
}

export function preservedGitAuthReadinessPath(stateRoot, operationsCommit) {
  validateOperationsCommit(operationsCommit);
  return join(resolve(stateRoot), `git-auth-readiness-preserved-${operationsCommit}.json`);
}

export function gitAuthReadinessExchangeSlotPath(stateRoot, operationsCommit) {
  validateOperationsCommit(operationsCommit);
  return join(resolve(stateRoot), `.git-auth-readiness.exchange-${operationsCommit}.json`);
}

export function gitAuthReadinessCarryForwardReportPath(stateRoot, operationsCommit) {
  validateOperationsCommit(operationsCommit);
  return join(resolve(stateRoot), `git-auth-readiness-carry-forward-${operationsCommit}.json`);
}

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

function assertProtectedEvidence(path, label) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
      stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o600 ||
      realpathSync(path) !== path) {
    throw new Error(`Unsafe ${label}.`);
  }
}

function readReadinessEvidence(path, operational) {
  if (operational) assertProtectedEvidence(path, "Git authentication readiness evidence");
  const bytes = readFileSync(path);
  let record;
  try { record = JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error("Git authentication readiness evidence is not valid JSON."); }
  return { bytes, record, identity: sha(bytes) };
}

export function classifyGitAuthReadinessDelta(source, candidate) {
  const sourceSemantics = { ...source }, candidateSemantics = { ...candidate };
  delete sourceSemantics.operationsCommit;
  delete candidateSemantics.operationsCommit;
  return JSON.stringify(sourceSemantics) === JSON.stringify(candidateSemantics) &&
    source.operationsCommit !== candidate.operationsCommit
    ? IDENTITY_ONLY_GIT_AUTH_DELTA
    : "UNEXPECTED";
}

export function validateGitAuthReadinessCarryForwardReport(report, expected = report) {
  exactKeys(report, [
    "schemaVersion", "carryForward", "semanticDelta", "sourceOperationsCommit",
    "operationsCommit", "lineage", "sourceReadinessSha256",
    "carriedForwardReadinessSha256", "sourcePreserved", "valueMaterialRecorded"
  ], "Git-auth readiness carry-forward report");
  validateOperationsCommit(report.sourceOperationsCommit);
  validateOperationsCommit(report.operationsCommit);
  if (report.schemaVersion !== GIT_AUTH_READINESS_CARRY_FORWARD_FORMAT ||
      report.carryForward !== IDENTITY_ONLY_GIT_AUTH_READINESS_CARRY_FORWARD ||
      report.semanticDelta !== IDENTITY_ONLY_GIT_AUTH_DELTA ||
      !Array.isArray(report.lineage) || report.lineage.length < 2 ||
      report.lineage[0] !== report.sourceOperationsCommit ||
      report.lineage.at(-1) !== report.operationsCommit ||
      new Set(report.lineage).size !== report.lineage.length ||
      report.lineage.some(commit => !/^[0-9a-f]{40}$/u.test(commit)) ||
      !/^[0-9a-f]{64}$/u.test(report.sourceReadinessSha256 || "") ||
      !/^[0-9a-f]{64}$/u.test(report.carriedForwardReadinessSha256 || "") ||
      report.sourcePreserved !== true || report.valueMaterialRecorded !== false ||
      JSON.stringify(report) !== JSON.stringify(expected)) {
    throw new Error("Git-auth readiness carry-forward report is invalid.");
  }
  return report;
}

export function createGitAuthReadinessCarryForwardArtifacts(
  source,
  operationsCommit,
  lineage,
  publicKeySha256
) {
  validateOperationsCommit(operationsCommit);
  validateReadiness(source.record, source.record.operationsCommit, publicKeySha256);
  const sourceIndex = lineage.indexOf(source.record.operationsCommit);
  if (sourceIndex < 0 || lineage.at(-1) !== operationsCommit ||
      source.record.operationsCommit === operationsCommit) {
    throw new Error("Git-auth readiness source authority is not in the trusted lineage.");
  }
  const trustedSuffix = lineage.slice(sourceIndex);
  const candidate = { ...source.record, operationsCommit };
  validateReadiness(candidate, operationsCommit, publicKeySha256);
  if (classifyGitAuthReadinessDelta(source.record, candidate) !==
      IDENTITY_ONLY_GIT_AUTH_DELTA) {
    throw new Error("Git-auth readiness carry-forward changed authentication semantics.");
  }
  const readinessPayload = Buffer.from(`${JSON.stringify(candidate)}\n`);
  const readinessIdentity = sha(readinessPayload);
  const report = {
    schemaVersion: GIT_AUTH_READINESS_CARRY_FORWARD_FORMAT,
    carryForward: IDENTITY_ONLY_GIT_AUTH_READINESS_CARRY_FORWARD,
    semanticDelta: IDENTITY_ONLY_GIT_AUTH_DELTA,
    sourceOperationsCommit: source.record.operationsCommit,
    operationsCommit,
    lineage: trustedSuffix,
    sourceReadinessSha256: source.identity,
    carriedForwardReadinessSha256: readinessIdentity,
    sourcePreserved: true,
    valueMaterialRecorded: false
  };
  validateGitAuthReadinessCarryForwardReport(report);
  return {
    readinessPayload,
    readinessIdentity,
    report,
    reportPayload: Buffer.from(`${JSON.stringify(report)}\n`)
  };
}

function assertCarryForwardProductionContext(operationsCommit) {
  const packRoot = `/opt/thebusinesscircle/deployment-packs/${operationsCommit}`;
  const expectedUtility = `${packRoot}/git-authentication.mjs`;
  if (fileURLToPath(import.meta.url) !== expectedUtility ||
      realpathSync(expectedUtility) !== expectedUtility) {
    throw new Error("Git-auth readiness carry-forward must run from the authoritative installed pack.");
  }
  const lineage = resolveProtectedAuthorityLineage(operationsCommit);
  const trust = spawnSync("/usr/bin/node", [
    `${packRoot}/git-transport-trust.mjs`, "verify", packRoot
  ], {
    env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" },
    stdio: "ignore"
  });
  if (trust.error || trust.signal || trust.status !== 0) {
    throw new Error("Current pinned Git transport trust verification failed.");
  }
  return lineage;
}

function exchangeGitAuthReadiness(paths, identities, operationsCommit) {
  const helper = `/opt/thebusinesscircle/deployment-packs/${operationsCommit}/atomic-identity-exchange.py`;
  const result = spawnSync("/usr/bin/python3", [
    helper, "git-auth-readiness-exchange",
    "--authority", paths.authority,
    "--exchange-slot", paths.slot,
    "--preserved-history", paths.preserved,
    "--pre-authority-sha256", identities.source,
    "--pre-slot-sha256", identities.candidate,
    "--preserved-history-sha256", identities.source,
    "--post-authority-sha256", identities.candidate,
    "--post-slot-sha256", identities.source,
    "--expected-parent", paths.stateRoot,
    "--expected-size", String(identities.size)
  ], {
    env: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" },
    stdio: "ignore"
  });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error("Atomic Git-auth readiness exchange failed.");
  }
}

export function publishCarriedForwardGitAuthReadiness(options, dependencies = {}) {
  exactKeys(options, ["sourceReadinessSha256", "operationsCommit", "carryForward"],
    "Git-auth readiness carry-forward invocation");
  validateOperationsCommit(options.operationsCommit);
  if (!/^[0-9a-f]{64}$/u.test(options.sourceReadinessSha256 || "") ||
      options.carryForward !== IDENTITY_ONLY_GIT_AUTH_READINESS_CARRY_FORWARD) {
    throw new Error("Git-auth readiness carry-forward invocation is invalid.");
  }
  const operational = dependencies.operational !== false;
  const root = operational ? STATE_ROOT : resolve(dependencies.stateRoot);
  if (operational && (dependencies.stateRoot && resolve(dependencies.stateRoot) !== STATE_ROOT ||
      realpathSync(STATE_ROOT) !== STATE_ROOT)) {
    throw new Error("Git-auth readiness state root is unsafe.");
  }
  const paths = {
    stateRoot: root,
    authority: readinessPath(root)
  };
  const readEvidence = dependencies.readEvidence ?? readReadinessEvidence;
  const source = readEvidence(paths.authority, operational);
  if (source.identity !== options.sourceReadinessSha256) {
    throw new Error("Source Git-auth readiness identity differs.");
  }
  const material = (dependencies.verifyMaterial ?? verifyAuthMaterial)();
  validateReadiness(source.record, source.record.operationsCommit, material.publicKeySha256);
  const lineage = (dependencies.assertProductionContext ??
    assertCarryForwardProductionContext)(options.operationsCommit);
  paths.preserved = preservedGitAuthReadinessPath(root, source.record.operationsCommit);
  paths.slot = gitAuthReadinessExchangeSlotPath(root, options.operationsCommit);
  paths.report = gitAuthReadinessCarryForwardReportPath(root, options.operationsCommit);
  for (const target of [paths.preserved, paths.slot, paths.report]) {
    if ((dependencies.exists ?? existsSync)(target)) {
      throw new Error("Git-auth readiness carry-forward target already exists.");
    }
  }
  const artifacts = createGitAuthReadinessCarryForwardArtifacts(
    source, options.operationsCommit, lineage, material.publicKeySha256
  );
  const publish = dependencies.publish ?? publishNoReplaceSet;
  publish([
    { target: paths.preserved, payload: source.bytes, mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {}) },
    { target: paths.slot, payload: artifacts.readinessPayload, mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {}) },
    { target: paths.report, payload: artifacts.reportPayload, mode: 0o600,
      ...(operational ? { uid: 0, gid: 0 } : {}) }
  ], {
    enforceMetadata: operational,
    fsyncDirectories: operational,
    verifySet() {
      const unchanged = readEvidence(paths.authority, operational);
      const preserved = readEvidence(paths.preserved, operational);
      const candidate = readEvidence(paths.slot, operational);
      if (unchanged.identity !== source.identity || preserved.identity !== source.identity ||
          candidate.identity !== artifacts.readinessIdentity ||
          classifyGitAuthReadinessDelta(source.record, candidate.record) !==
            IDENTITY_ONLY_GIT_AUTH_DELTA) {
        throw new Error("Git-auth readiness carry-forward publication differs.");
      }
      let report;
      try { report = JSON.parse(readFileSync(paths.report, "utf8")); }
      catch { throw new Error("Git-auth readiness carry-forward report is not valid JSON."); }
      validateGitAuthReadinessCarryForwardReport(report, artifacts.report);
      (dependencies.verifyMaterial ?? verifyAuthMaterial)();
      (dependencies.exchange ?? exchangeGitAuthReadiness)(paths, {
        source: source.identity,
        candidate: artifacts.readinessIdentity,
        size: source.bytes.length
      }, options.operationsCommit);
      const current = readEvidence(paths.authority, operational);
      const oldSlot = readEvidence(paths.slot, operational);
      validateReadiness(current.record, options.operationsCommit, material.publicKeySha256);
      if (current.identity !== artifacts.readinessIdentity ||
          oldSlot.identity !== source.identity) {
        throw new Error("Carried-forward Git-auth readiness verification failed.");
      }
      (dependencies.verifyMaterial ?? verifyAuthMaterial)();
    }
  });
  return {
    ...paths,
    sourceOperationsCommit: source.record.operationsCommit,
    sourceReadinessIdentity: source.identity,
    carriedForwardReadinessIdentity: artifacts.readinessIdentity,
    semanticDelta: IDENTITY_ONLY_GIT_AUTH_DELTA,
    lineage: artifacts.report.lineage
  };
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
  if (command === "carry-forward") {
    if (process.getuid?.() !== 0) throw new Error("Git-auth readiness carry-forward requires Linux root.");
    const [sourceReadinessSha256, targetOperationsCommit, carryForward, ...rest] =
      [operationsCommit, ...extras];
    if (rest.length || !sourceReadinessSha256 || !targetOperationsCommit || !carryForward) {
      throw new Error("Usage: git-authentication.mjs carry-forward <source-readiness-sha256> <operations-commit> <carry-forward>");
    }
    const result = publishCarriedForwardGitAuthReadiness({
      sourceReadinessSha256,
      operationsCommit: targetOperationsCommit,
      carryForward
    });
    process.stdout.write(`Git authentication readiness identity-only carried forward source=${result.sourceReadinessIdentity} current=${result.carriedForwardReadinessIdentity} values-recorded=false\n`);
  } else {
  if (extras.length) throw new Error("Unexpected Git authentication arguments.");
  if (command === "verify-material" && !operationsCommit) { verifyAuthMaterial(); process.stdout.write("GIT_AUTH_MATERIAL_PRESENT\n"); }
  else if (command === "verify-ready" && operationsCommit) { process.stdout.write(`${verifyReadiness(operationsCommit)}\n`); }
  else if (command === "publish-ready" && operationsCommit) { publishReadiness(operationsCommit); process.stdout.write("GIT_AUTH_READY\n"); }
  else if (command === "public-key" && !operationsCommit) { verifyAuthMaterial(); process.stdout.write(readFileSync(PUBLIC_KEY, "utf8")); }
  else if (command === "recover-partial" && !operationsCommit) { const result = recoverPartialAuthMaterial(); process.stdout.write(`PRIVATE_KEY_BYTE_IDENTITY_PRESERVED=${result.privateKeyByteIdentityPreserved ? "PASS" : "FAIL"} KEYPAIR_MATCH=${result.keypairMatch ? "PASS" : "FAIL"}\n`); }
  else throw new Error("Usage: git-authentication.mjs <verify-material|recover-partial|verify-ready|publish-ready|public-key> [operations-commit]");
  }
}
