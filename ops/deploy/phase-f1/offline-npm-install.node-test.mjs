import assert from "node:assert/strict";
import test from "node:test";
import { createOfflineNpmInstallInvocation, installForwardDependenciesOffline } from "./offline-npm-install.mjs";

const authority = "a".repeat(40), workspace = "/var/www/builds/forward-b43a1e4e708bc9f02ef83bd63dab1db1f366b32e-test";
test("forward install is fixed-cache, isolated, and redundantly offline", () => {
  const invocation = createOfflineNpmInstallInvocation(workspace, authority), joined = invocation.arguments.join(" ");
  assert.match(joined, /NPM_CONFIG_CACHE=\/var\/cache\/thebusinesscircle\/phase-f1\/npm-offline-v1/u);
  assert.match(joined, /NPM_CONFIG_OFFLINE=true/u); assert.match(joined, /npm --prefix .* ci --offline --no-audit --no-fund/u);
  assert.doesNotMatch(joined, /\/var\/lib\/thebusinesscircle\/build\/npm-cache/u);
  assert.doesNotMatch(joined, /NPM_CONFIG_REGISTRY|NODE_AUTH_TOKEN|NPM_TOKEN/u);
  const userConfig = invocation.arguments.find(value => value.startsWith("NPM_CONFIG_USERCONFIG="));
  const globalConfig = invocation.arguments.find(value => value.startsWith("NPM_CONFIG_GLOBALCONFIG="));
  assert.notEqual(userConfig, globalConfig);
  assert.throws(() => createOfflineNpmInstallInvocation("/tmp/forward", authority), /fixed forward/u);
});

test("a missing offline package fails closed without a second or fallback invocation", () => {
  let calls = 0;
  const dependencies = { operational: false, canonicalWorkspace: workspace, verifyNpmConfiguration: () => true,
    verifyCache: () => ({ ready: true, cacheRoot: "/var/cache/thebusinesscircle/phase-f1/npm-offline-v1", missingRequiredTargetIntegrityCount: 0, applicationSha: "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e" }),
    readLockfile: () => Buffer.from("synthetic-lockfile"), spawn: () => { calls += 1; return { status: 1, signal: null }; } };
  assert.throws(() => installForwardDependenciesOffline(workspace, authority, dependencies), /failed closed; registry fallback was not attempted/u);
  assert.equal(calls, 1);
});

test("successful offline install preserves lockfile identity", () => {
  const result = installForwardDependenciesOffline(workspace, authority, { operational: false, canonicalWorkspace: workspace, verifyNpmConfiguration: () => true,
    verifyCache: () => ({ ready: true, cacheRoot: "/var/cache/thebusinesscircle/phase-f1/npm-offline-v1", missingRequiredTargetIntegrityCount: 0, applicationSha: "b43a1e4e708bc9f02ef83bd63dab1db1f366b32e" }),
    readLockfile: () => Buffer.from("synthetic-lockfile"), spawn: () => ({ status: 0, signal: null }) });
  assert.equal(result.offline, true); assert.equal(result.registryFallback, false); assert.equal(result.lockfileChanged, false);
});
