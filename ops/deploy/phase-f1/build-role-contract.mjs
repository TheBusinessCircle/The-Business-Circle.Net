import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";

export const FORWARD_APPLICATION_SHA = "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e";
export const BUILD_ROLE_SCHEMA = "phase-f1-forward-build-role-v1";
export const BUILD_ROLE_FILE = ".phase-f1-build-role.json";

export const FORWARD_BUILD_ROLES = Object.freeze({
  bcn: Object.freeze({
    role: "bcn",
    appBrand: "bcn",
    publicOrigin: "https://thebusinesscircle.net",
    authOrigin: "https://thebusinesscircle.net",
    runtimeEnvironmentAuthority: "/etc/thebusinesscircle/bcn/runtime.env.json",
    runtimeRelativePath: ".runtime/bcn"
  }),
  "circle-card": Object.freeze({
    role: "circle-card",
    appBrand: "circle-card",
    publicOrigin: "https://circlecard.co.uk",
    authOrigin: "https://circlecard.co.uk",
    runtimeEnvironmentAuthority: "/etc/thebusinesscircle/circle-card/runtime.env.json",
    runtimeRelativePath: ".runtime/circle-card"
  })
});

const sha256 = value => createHash("sha256").update(value).digest("hex");

function exactKeys(value, expected, label) {
  if (!value || Array.isArray(value) || typeof value !== "object" ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} has unknown or missing fields.`);
  }
}

function validateOperationsCommit(value) {
  if (!/^[0-9a-f]{40}$/u.test(value || "")) throw new Error("Build-role operations identity is invalid.");
}

export function forwardBuildRole(role) {
  const contract = FORWARD_BUILD_ROLES[role];
  if (!contract) throw new Error("Forward build role must be exactly bcn or circle-card.");
  return contract;
}

export function createForwardBuildRoleRecord(role, operationsCommit, buildId) {
  const contract = forwardBuildRole(role);
  validateOperationsCommit(operationsCommit);
  const bytes = Buffer.isBuffer(buildId) ? buildId : Buffer.from(buildId || "");
  if (!bytes.length || !bytes.toString("utf8").trim()) throw new Error("Forward build BUILD_ID is absent.");
  return validateForwardBuildRoleRecord({
    schemaVersion: BUILD_ROLE_SCHEMA,
    buildRole: contract.role,
    sourceApplicationSha: FORWARD_APPLICATION_SHA,
    operationsCommit,
    appBrand: contract.appBrand,
    publicOrigin: contract.publicOrigin,
    authOrigin: contract.authOrigin,
    runtimeEnvironmentAuthority: contract.runtimeEnvironmentAuthority,
    buildIdSha256: sha256(bytes),
    independentBuildInvocation: true,
    bcnBuildOutputReused: false,
    selectorsRequired: false,
    valueMaterialRecorded: false
  }, { role, operationsCommit, buildIdSha256: sha256(bytes) });
}

export function validateForwardBuildRoleRecord(record, expected = {}) {
  const keys = [
    "appBrand", "authOrigin", "bcnBuildOutputReused", "buildIdSha256", "buildRole",
    "independentBuildInvocation", "operationsCommit", "publicOrigin",
    "runtimeEnvironmentAuthority", "schemaVersion", "selectorsRequired",
    "sourceApplicationSha", "valueMaterialRecorded"
  ];
  exactKeys(record, keys, "Forward build-role record");
  const contract = FORWARD_BUILD_ROLES[record.buildRole];
  if (!contract || record.schemaVersion !== BUILD_ROLE_SCHEMA ||
      record.sourceApplicationSha !== FORWARD_APPLICATION_SHA ||
      !/^[0-9a-f]{40}$/u.test(record.operationsCommit || "") ||
      record.appBrand !== contract.appBrand || record.publicOrigin !== contract.publicOrigin ||
      record.authOrigin !== contract.authOrigin ||
      record.runtimeEnvironmentAuthority !== contract.runtimeEnvironmentAuthority ||
      !/^[0-9a-f]{64}$/u.test(record.buildIdSha256 || "") ||
      record.independentBuildInvocation !== true || record.bcnBuildOutputReused !== false ||
      record.selectorsRequired !== false || record.valueMaterialRecorded !== false ||
      (expected.role && record.buildRole !== expected.role) ||
      (expected.operationsCommit && record.operationsCommit !== expected.operationsCommit) ||
      (expected.buildIdSha256 && record.buildIdSha256 !== expected.buildIdSha256)) {
    throw new Error("Forward build-role record is invalid or belongs to another role.");
  }
  return record;
}

function approvedRuntimeRoot(role, runtimeRoot, publication) {
  const contract = forwardBuildRole(role);
  const root = resolve(runtimeRoot);
  const finalRoot = `/var/www/releases/${FORWARD_APPLICATION_SHA}/${contract.runtimeRelativePath}`;
  if (!publication) return root === finalRoot;
  const escapedRole = role.replace("-", "\\-");
  return new RegExp(`^/var/www/releases/\\.${FORWARD_APPLICATION_SHA}\\.promotion\\.[0-9a-f]{16}/\\.runtime/${escapedRole}$`, "u").test(root);
}

function safeRuntimeRoot(role, runtimeRoot, { operational, publication }) {
  const root = resolve(runtimeRoot);
  if (!existsSync(root) || realpathSync(root) !== root) throw new Error("Build-role runtime root is absent or noncanonical.");
  const stats = lstatSync(root);
  if (!stats.isDirectory() || stats.isSymbolicLink() ||
      (operational && (!approvedRuntimeRoot(role, root, publication) || stats.uid !== 0 || stats.gid !== 0))) {
    throw new Error("Build-role runtime root is unsafe or outside the fixed release contract.");
  }
  return root;
}

export function publishForwardBuildRoleRecord(role, runtimeRoot, operationsCommit, options = {}) {
  const operational = options.operational === true;
  const root = safeRuntimeRoot(role, runtimeRoot, { operational, publication: true });
  const buildIdPath = join(root, "BUILD_ID");
  const buildIdStats = lstatSync(buildIdPath);
  if (!buildIdStats.isFile() || buildIdStats.isSymbolicLink() || buildIdStats.nlink !== 1) {
    throw new Error("Forward build BUILD_ID metadata is unsafe.");
  }
  const record = createForwardBuildRoleRecord(role, operationsCommit, readFileSync(buildIdPath));
  const target = join(root, BUILD_ROLE_FILE);
  publishNoReplaceSet([{ target, payload: Buffer.from(`${JSON.stringify(record, null, 2)}\n`), mode: 0o444, uid: 0, gid: 0 }], {
    enforceMetadata: operational,
    fsyncDirectories: true
  });
  return { record, target, identity: sha256(readFileSync(target)) };
}

export function verifyForwardBuildRoleRecord(role, runtimeRoot, operationsCommit, options = {}) {
  const operational = options.operational === true;
  const root = safeRuntimeRoot(role, runtimeRoot, { operational, publication: false });
  const buildId = readFileSync(join(root, "BUILD_ID"));
  const target = join(root, BUILD_ROLE_FILE);
  const stats = lstatSync(target);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
      (operational && (stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o444 || realpathSync(target) !== target))) {
    throw new Error("Forward build-role evidence metadata is unsafe.");
  }
  const bytes = readFileSync(target);
  let record;
  try { record = JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error("Forward build-role evidence is not valid JSON."); }
  validateForwardBuildRoleRecord(record, { role, operationsCommit, buildIdSha256: sha256(buildId) });
  return { record, target, identity: sha256(bytes) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, role, runtimeRoot, operationsCommit, ...extras] = process.argv.slice(2);
  if (extras.length || !role || !runtimeRoot || !operationsCommit || !new Set(["publish", "verify"]).has(command)) {
    throw new Error("Usage: build-role-contract.mjs <publish|verify> <bcn|circle-card> <fixed-runtime-root> <operations-commit>");
  }
  const result = command === "publish"
    ? publishForwardBuildRoleRecord(role, runtimeRoot, operationsCommit, { operational: true })
    : verifyForwardBuildRoleRecord(role, runtimeRoot, operationsCommit, { operational: true });
  process.stdout.write(`BUILD_ROLE_CONTRACT_${command === "publish" ? "PUBLISHED" : "VERIFIED"} role=${role} identity=${result.identity} values-recorded=false\n`);
}
