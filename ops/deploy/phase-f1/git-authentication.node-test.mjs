import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, chownSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FORMAT, PRIVATE_KEY, REPOSITORY, validateAuthContract, validatePartialRecoveryContract, validateReadiness } from "./git-authentication.mjs";

const valid = (overrides = {}) => ({
  rootCanonical: true, rootDirectory: true, rootSymlink: false, rootUid: 0, rootGid: 44, rootMode: 0o710, buildUid: 100, buildGid: 44,
  privateCanonical: true, privateRegular: true, privateSymlink: false, privateLinks: 1, privateUid: 100, privateGid: 44, privateMode: 0o400,
  publicCanonical: true, publicRegular: true, publicSymlink: false, publicLinks: 1, publicUid: 0, publicGid: 0, publicMode: 0o444,
  publicContent: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest phase-f1-github-deploy-key\n",
  derivedPublic: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest",
  buildReadable: true, buildWritable: false, bcnReadable: false, circleReadable: false, runtimeWritable: false,
  ...overrides
});

describe("Phase F1 Git deploy-key authentication contract", () => {
  it("accepts only the fixed protected build-user-readable contract", () => {
    assert.equal(validateAuthContract(valid()).privateCanonical, true);
    for (const changed of [
      { rootCanonical: false }, { rootDirectory: false }, { rootSymlink: true }, { rootUid: 1 }, { rootGid: 45 }, { rootMode: 0o750 },
      { privateCanonical: false }, { privateRegular: false }, { privateSymlink: true }, { privateLinks: 2 }, { privateUid: 0 }, { privateGid: 45 }, { privateMode: 0o440 }, { privateMode: 0o600 }, { privateMode: 0o604 },
      { publicSymlink: true }, { publicLinks: 2 }, { publicMode: 0o644 }, { publicContent: "ssh-rsa AAAA\n" }, { derivedPublic: "ssh-ed25519 AAAAwrong" },
      { buildReadable: false }, { buildWritable: true }, { bcnReadable: true }, { circleReadable: true }, { runtimeWritable: true }
    ]) assert.throws(() => validateAuthContract(valid(changed)), /contract is invalid/u);
  });

  it("accepts only the exact pre-registration obsolete-metadata recovery state", () => {
    const partial = { ...valid(), privateUid: 0, privateMode: 0o440, entries: "github-deploy-key,github-deploy-key.pub", readinessAbsent: true, buildsCanonical: true, buildsDirectory: true, buildsSymlink: false, buildsEmpty: true, keyUnused: true, privateEnvelope: true };
    assert.equal(validatePartialRecoveryContract(partial).privateMode, 0o440);
    for (const changed of [
      { entries: "github-deploy-key,github-deploy-key.pub,extra" }, { privateUid: 100 }, { privateMode: 0o400 },
      { privateSymlink: true }, { privateLinks: 2 }, { publicSymlink: true }, { publicLinks: 2 },
      { readinessAbsent: false }, { buildsCanonical: false }, { buildsDirectory: false }, { buildsSymlink: true }, { buildsEmpty: false },
      { keyUnused: false }, { privateEnvelope: false }, { rootMode: 0o750 }
    ]) assert.throws(() => validatePartialRecoveryContract({ ...partial, ...changed }), /partial recovery state is invalid/u);
  });

  it("proves OpenSSH accepts build-user-owned 0400 material and rejects group-readable material", { skip: process.platform !== "linux" || process.getuid?.() !== 0 }, () => {
    const root = mkdtempSync("/run/phase-f1-git-auth-test-");
    try {
      const privateKey = join(root, "deploy-key");
      const buildUid = Number(execFileSync("/usr/bin/id", ["-u", "phase-f1-build"], { encoding: "utf8" }).trim());
      const buildGid = Number(execFileSync("/usr/bin/id", ["-g", "phase-f1-build"], { encoding: "utf8" }).trim());
      chownSync(root, 0, buildGid); chmodSync(root, 0o710);
      execFileSync("/usr/bin/ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", "phase-f1-synthetic-test", "-f", privateKey], { stdio: "ignore" });
      chownSync(privateKey, buildUid, buildGid); chmodSync(privateKey, 0o400);
      const derived = execFileSync("/usr/bin/sudo", ["-u", "phase-f1-build", "/usr/bin/env", "-i", "HOME=/var/lib/thebusinesscircle/build", "PATH=/usr/local/bin:/usr/bin:/bin", "/usr/bin/ssh-keygen", "-y", "-f", privateKey], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split(/\s+/u).slice(0, 2).join(" ");
      assert.equal(derived, readFileSync(`${privateKey}.pub`, "utf8").trim().split(/\s+/u).slice(0, 2).join(" "));
      assert.equal(spawnSync("/usr/bin/sudo", ["-u", "bcn-app", "/usr/bin/test", "-r", privateKey], { stdio: "ignore" }).status, 1);
      assert.equal(spawnSync("/usr/bin/sudo", ["-u", "circle-card-app", "/usr/bin/test", "-r", privateKey], { stdio: "ignore" }).status, 1);
      chmodSync(privateKey, 0o440);
      assert.notEqual(spawnSync("/usr/bin/sudo", ["-u", "phase-f1-build", "/usr/bin/env", "-i", "HOME=/var/lib/thebusinesscircle/build", "PATH=/usr/local/bin:/usr/bin:/bin", "/usr/bin/ssh-keygen", "-y", "-f", privateKey], { stdio: "ignore" }).status, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("accepts only closed commit-bound repository readiness", () => {
    const operationsCommit = "a".repeat(40), publicKeySha256 = "b".repeat(64);
    const record = { schemaVersion: FORMAT, operationsCommit, repository: REPOSITORY, host: "github.com", authentication: "REPOSITORY_SCOPED_DEPLOY_KEY", publicKeySha256, material: "PRESENT", githubAuthorization: "VERIFIED", ready: true, valueMaterialRecorded: false };
    assert.equal(validateReadiness(record, operationsCommit, publicKeySha256).ready, true);
    for (const changed of [
      { operationsCommit: "c".repeat(40) }, { repository: "other/repo" }, { host: "evil.example" },
      { authentication: "AGENT" }, { publicKeySha256: "d".repeat(64) }, { material: "ABSENT" },
      { githubAuthorization: "UNVERIFIED" }, { ready: false }, { valueMaterialRecorded: true }, { extra: true }
    ]) assert.throws(() => validateReadiness({ ...record, ...changed }, operationsCommit, publicKeySha256), /readiness is invalid/u);
  });

  it("keeps the private identity at one non-caller-selected path", () => {
    assert.equal(PRIVATE_KEY, "/var/lib/thebusinesscircle/build/git-auth/github-deploy-key");
  });
});
