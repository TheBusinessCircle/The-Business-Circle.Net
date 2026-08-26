import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyOfflineCacheForForwardBuild, OFFLINE_CACHE_ROOT } from "./offline-npm-cache.mjs";
import { verifyTrustedNpmConfiguration, NPM_CONFIG_FILENAMES } from "./npm-configuration.mjs";

export const OFFLINE_INSTALL_SCHEMA = "phase-f1-forward-offline-npm-install-v1";
export const OFFLINE_NPM_ARGUMENTS = Object.freeze([
  "ci", "--include=dev", "--offline", "--no-audit", "--no-fund"
]);
const AUTHORITY_PATH = "/var/lib/thebusinesscircle/approved-phase-f1-pack.json";
const PACK_ROOT = dirname(fileURLToPath(import.meta.url));
const NPM_CONFIG_ROOT = join(PACK_ROOT, "npm-config");
const USER_CONFIG = join(NPM_CONFIG_ROOT, NPM_CONFIG_FILENAMES.user);
const GLOBAL_CONFIG = join(NPM_CONFIG_ROOT, NPM_CONFIG_FILENAMES.global);
const sha256 = value => createHash("sha256").update(value).digest("hex");

function validateOperationsCommit(value) {
  if (!/^[0-9a-f]{40}$/u.test(value || "")) throw new Error("Offline install operations identity is invalid.");
}

export function createOfflineNpmInstallInvocation(workspace, operationsCommit) {
  validateOperationsCommit(operationsCommit);
  const canonical = String(workspace).replaceAll("\\", "/");
  if (!/^\/var\/www\/builds\/forward-b43a1e4e708bc9f02ef83bd63dab1db1f366b32e-[^/]+$/u.test(canonical)) {
    throw new Error("Offline install requires the fixed forward checkout path.");
  }
  return {
    executable: "/usr/bin/sudo",
    arguments: [
      "-u", "phase-f1-build", "/usr/bin/env", "-i",
      "HOME=/var/lib/thebusinesscircle/build",
      "USER=phase-f1-build",
      "LOGNAME=phase-f1-build",
      "PATH=/usr/local/bin:/usr/bin:/bin",
      "LANG=C.UTF-8",
      `NPM_CONFIG_USERCONFIG=${USER_CONFIG}`,
      `NPM_CONFIG_GLOBALCONFIG=${GLOBAL_CONFIG}`,
      `NPM_CONFIG_CACHE=${OFFLINE_CACHE_ROOT}`,
      "NPM_CONFIG_OFFLINE=true",
      "NPM_CONFIG_INCLUDE=dev",
      "NPM_CONFIG_AUDIT=false",
      "NPM_CONFIG_FUND=false",
      "NPM_CONFIG_UPDATE_NOTIFIER=false",
      "NPM_CONFIG_LOGS_DIR=/var/lib/thebusinesscircle/build/npm-logs",
      "NEXT_TELEMETRY_DISABLED=1",
      "/usr/bin/npm", "--prefix", canonical, ...OFFLINE_NPM_ARGUMENTS
    ],
    environment: { HOME: "/root", PATH: "/usr/local/bin:/usr/bin:/bin" },
    cacheRoot: OFFLINE_CACHE_ROOT,
    offline: true,
    registryFallback: false,
    operationsCommit
  };
}

function assertProductionContext(operationsCommit) {
  const packRoot = `/opt/thebusinesscircle/deployment-packs/${operationsCommit}`;
  const expected = `${packRoot}/offline-npm-install.mjs`;
  if (fileURLToPath(import.meta.url) !== expected || realpathSync(expected) !== expected) {
    throw new Error("Offline install must run from the current installed operations pack.");
  }
  const authority = JSON.parse(readFileSync(AUTHORITY_PATH, "utf8"));
  if (authority.operationsCommit !== operationsCommit) throw new Error("Offline install operations authority is stale.");
  return packRoot;
}

export function installForwardDependenciesOffline(workspace, operationsCommit, dependencies = {}) {
  validateOperationsCommit(operationsCommit);
  const operational = dependencies.operational !== false;
  const canonical = dependencies.canonicalWorkspace ?? (operational ? realpathSync(resolve(workspace)) : String(workspace).replaceAll("\\", "/"));
  if (operational) (dependencies.assertProductionContext ?? assertProductionContext)(operationsCommit);
  if (dependencies.verifyNpmConfiguration) dependencies.verifyNpmConfiguration();
  else verifyTrustedNpmConfiguration(NPM_CONFIG_ROOT, { operational });
  const readiness = (dependencies.verifyCache ?? verifyOfflineCacheForForwardBuild)(canonical, operationsCommit);
  if (readiness.cacheRoot !== OFFLINE_CACHE_ROOT || readiness.ready !== true ||
      readiness.missingRequiredTargetIntegrityCount !== 0) {
    throw new Error("Fixed READY offline cache verification failed.");
  }
  const readLockfile = dependencies.readLockfile ?? (() => readFileSync(join(canonical, "package-lock.json")));
  const before = sha256(readLockfile());
  const invocation = createOfflineNpmInstallInvocation(canonical, operationsCommit);
  const result = (dependencies.spawn ?? spawnSync)(invocation.executable, invocation.arguments, {
    env: invocation.environment,
    stdio: operational ? "inherit" : "ignore"
  });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error("Offline npm ci failed closed; registry fallback was not attempted.");
  }
  const after = sha256(readLockfile());
  if (after !== before) throw new Error("Offline npm ci changed the committed lockfile.");
  return {
    schemaVersion: OFFLINE_INSTALL_SCHEMA,
    applicationSha: readiness.applicationSha,
    operationsCommit,
    cacheRoot: OFFLINE_CACHE_ROOT,
    lockfileSha256: before,
    offline: true,
    registryFallback: false,
    lockfileChanged: false,
    valueMaterialRecorded: false
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, workspace, operationsCommit, ...extras] = process.argv.slice(2);
  if (command !== "install" || extras.length || !workspace || !operationsCommit) {
    throw new Error("Usage: offline-npm-install.mjs install <approved-forward-workspace> <operations-commit>");
  }
  const record = installForwardDependenciesOffline(workspace, operationsCommit);
  process.stdout.write(`OFFLINE_NPM_INSTALL_COMPLETE cache=${record.cacheRoot} registry-fallback=false lockfile-changed=false values-recorded=false\n`);
}
