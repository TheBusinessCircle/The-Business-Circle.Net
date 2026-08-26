import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  APPROVED_CACHE_ROOT,
  BUILD_ARGUMENTS,
  createRollbackFixtureNpmInvocation,
  INSTALL_ARGUMENTS,
  runRollbackFixtureNpm
} from "./rollback-fixture-npm-command.mjs";

const environment = Object.freeze({
  HOME: "/var/lib/thebusinesscircle/build",
  PATH: "/usr/local/bin:/usr/bin:/bin",
  NODE_ENV: "production",
  NPM_CONFIG_CACHE: APPROVED_CACHE_ROOT,
  NPM_CONFIG_OFFLINE: "true"
});

test("rollback fixture installs every locked build dependency offline before production build", () => {
  const install = createRollbackFixtureNpmInvocation(
    ["ci", "--offline", "--no-audit", "--no-fund"], environment
  );
  assert.equal(install.phase, "DEPENDENCY_INSTALL");
  assert.equal(install.includeDevDependencies, true);
  assert.deepEqual(install.arguments.slice(1), INSTALL_ARGUMENTS);
  assert.equal(install.offline, true);
  assert.equal(install.registryFallback, false);

  const build = createRollbackFixtureNpmInvocation(["run", "build"], environment);
  assert.equal(build.phase, "APPLICATION_BUILD");
  assert.equal(build.includeDevDependencies, false);
  assert.deepEqual(build.arguments.slice(1), BUILD_ARGUMENTS);
  assert.equal(environment.NODE_ENV, "production");
});

test("rollback fixture rejects caller npm omission policy, alternate cache and arbitrary commands", () => {
  for (const name of [
    "NPM_CONFIG_PRODUCTION", "NPM_CONFIG_OMIT", "NPM_CONFIG_INCLUDE",
    "npm_config_production", "npm_config_omit", "npm_config_include"
  ]) {
    assert.throws(() => createRollbackFixtureNpmInvocation(
      ["ci", "--offline", "--no-audit", "--no-fund"],
      { ...environment, [name]: name.endsWith("include") ? "prod" : "dev" }
    ), /Caller-controlled/u);
  }
  assert.throws(() => createRollbackFixtureNpmInvocation(
    ["ci", "--offline", "--no-audit", "--no-fund"],
    { ...environment, NPM_CONFIG_CACHE: "/tmp/cache" }
  ), /fixed READY offline cache/u);
  assert.throws(() => createRollbackFixtureNpmInvocation(["ci"], environment), /not approved/u);
  assert.throws(() => createRollbackFixtureNpmInvocation(
    ["run", "build"], { ...environment, NODE_ENV: "development" }
  ), /production NODE_ENV/u);
});

test("rollback fixture npm performs one command and never falls back", () => {
  let calls = 0;
  assert.throws(() => runRollbackFixtureNpm(
    ["ci", "--offline", "--no-audit", "--no-fund"], environment,
    { spawn: () => { calls += 1; return { status: 1, signal: null }; } }
  ), /failed closed/u);
  assert.equal(calls, 1);
});

test("namespace installs a fixed pack-owned npm shim instead of accepting caller policy", () => {
  const launcher = readFileSync(new URL("./rollback-fixture-network-isolation.mjs", import.meta.url), "utf8");
  const wrapper = readFileSync(new URL("./rollback-fixture-npm.sh", import.meta.url), "utf8");
  assert.match(launcher, /"-t", "tmpfs"/u);
  assert.match(launcher, /rollback-fixture-npm\.sh/u);
  assert.match(launcher, /rollback-fixture-npm-command\.mjs/u);
  assert.match(launcher, /"remount,ro,nosuid,nodev"/u);
  assert.match(wrapper, /\/usr\/local\/bin\/rollback-fixture-npm-command\.mjs/u);
  assert.doesNotMatch(wrapper, /eval|bash -c|sh -c/u);
});
