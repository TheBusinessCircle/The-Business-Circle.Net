import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const APPROVED_CACHE_ROOT = "/var/cache/thebusinesscircle/phase-f1/npm-offline-v1";
export const APPROVED_NPM_CLI = "/usr/lib/node_modules/npm/bin/npm-cli.js";
export const INSTALL_ARGUMENTS = Object.freeze([
  "ci", "--include=dev", "--offline", "--no-audit", "--no-fund"
]);
export const BUILD_ARGUMENTS = Object.freeze(["run", "build"]);

const INSTALL_INPUT = Object.freeze(["ci", "--offline", "--no-audit", "--no-fund"]);
const REJECTED_POLICY_NAMES = Object.freeze([
  "NPM_CONFIG_PRODUCTION", "NPM_CONFIG_OMIT", "NPM_CONFIG_INCLUDE",
  "npm_config_production", "npm_config_omit", "npm_config_include"
]);

function sameArguments(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function createRollbackFixtureNpmInvocation(arguments_, environment) {
  if (!Array.isArray(arguments_) || !environment || typeof environment !== "object") {
    throw new Error("Rollback fixture npm invocation is invalid.");
  }
  for (const name of REJECTED_POLICY_NAMES) {
    if (Object.hasOwn(environment, name)) {
      throw new Error("Caller-controlled npm dependency inclusion policy is forbidden.");
    }
  }
  if (environment.NPM_CONFIG_CACHE !== APPROVED_CACHE_ROOT ||
      environment.NPM_CONFIG_OFFLINE !== "true") {
    throw new Error("Rollback fixture npm must use the fixed READY offline cache.");
  }
  if (sameArguments(arguments_, INSTALL_INPUT)) {
    return {
      phase: "DEPENDENCY_INSTALL",
      executable: "/usr/bin/node",
      arguments: [APPROVED_NPM_CLI, ...INSTALL_ARGUMENTS],
      includeDevDependencies: true,
      offline: true,
      registryFallback: false
    };
  }
  if (sameArguments(arguments_, BUILD_ARGUMENTS)) {
    if (environment.NODE_ENV !== "production") {
      throw new Error("Rollback fixture application build requires production NODE_ENV.");
    }
    return {
      phase: "APPLICATION_BUILD",
      executable: "/usr/bin/node",
      arguments: [APPROVED_NPM_CLI, ...BUILD_ARGUMENTS],
      includeDevDependencies: false,
      offline: true,
      registryFallback: false
    };
  }
  throw new Error("Rollback fixture npm command is not approved.");
}

export function runRollbackFixtureNpm(arguments_, environment = process.env, dependencies = {}) {
  const invocation = createRollbackFixtureNpmInvocation(arguments_, environment);
  const result = (dependencies.spawn ?? spawnSync)(
    invocation.executable,
    invocation.arguments,
    { env: environment, stdio: "inherit" }
  );
  if (result.error || result.signal || result.status !== 0) {
    throw new Error(`${invocation.phase} npm command failed closed.`);
  }
  return invocation;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runRollbackFixtureNpm(process.argv.slice(2));
}
