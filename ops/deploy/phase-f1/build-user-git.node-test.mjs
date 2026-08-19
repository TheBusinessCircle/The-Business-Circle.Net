import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGitInspectionInvocation,
  validateBuildCheckoutFacts
} from "./build-user-git.mjs";

const sha = "a".repeat(40);
const checkout = `/var/www/builds/rollback-${sha}-20260819T214050.085357982Z-da462779d3ab80cc`;
const validFacts = (overrides = {}) => ({
  canonical: true,
  parentCanonical: true,
  directory: true,
  symlink: false,
  uid: 1001,
  gid: 1001,
  mode: 0o750,
  expectedUid: 1001,
  expectedGid: 1001,
  basename: checkout.split("/").at(-1),
  canonicalPath: checkout,
  ...overrides
});

describe("Phase F1 build-user Git inspection context", () => {
  it("accepts only the exact build-user-owned checkout metadata contract", () => {
    assert.equal(validateBuildCheckoutFacts(validFacts()), checkout);
    for (const changed of [
      { canonical: false }, { parentCanonical: false }, { directory: false }, { symlink: true },
      { uid: 0 }, { gid: 0 }, { mode: 0o755 }, { basename: "rollback-arbitrary" }
    ]) {
      assert.throws(() => validateBuildCheckoutFacts(validFacts(changed)), /build-user-owned/u);
    }
  });

  it("uses a fixed scrubbed same-owner invocation with no safe-directory exception", () => {
    const invocation = buildGitInspectionInvocation(checkout, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    assert.equal(invocation.command, "/usr/bin/sudo");
    assert.deepEqual(invocation.arguments.slice(0, 5), ["-u", "phase-f1-build", "--", "/usr/bin/env", "-i"]);
    assert.ok(invocation.arguments.includes("GIT_CONFIG_NOSYSTEM=1"));
    assert.ok(invocation.arguments.includes("GIT_CONFIG_GLOBAL=/dev/null"));
    assert.ok(invocation.arguments.includes("GIT_CONFIG_SYSTEM=/dev/null"));
    assert.ok(invocation.arguments.includes("GIT_OPTIONAL_LOCKS=0"));
    assert.equal(invocation.arguments.includes("GIT_SSH_COMMAND"), false);
    assert.equal(invocation.arguments.some((value) => value.includes("safe.directory")), false);
    assert.deepEqual(invocation.arguments.slice(-7), [
      "/usr/bin/git", "-C", checkout, "status", "--porcelain=v1", "-z", "--untracked-files=all"
    ]);
  });

  it("rejects path, safe-directory, configuration and worktree injection", () => {
    assert.throws(() => buildGitInspectionInvocation("/tmp/checkout", ["rev-parse", "HEAD"]), /outside/u);
    for (const arguments_ of [
      ["-c", `safe.directory=${checkout}`, "status"],
      [`-csafe.directory=${checkout}`, "status"],
      ["--config-env=core.sshCommand=CALLER", "status"],
      ["--git-dir=/caller", "status"],
      ["--work-tree=/caller", "status"]
    ]) {
      assert.throws(() => buildGitInspectionInvocation(checkout, arguments_), /overrides/u);
    }
  });
});
