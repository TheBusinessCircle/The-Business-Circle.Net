import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FORMAT, PRIVATE_KEY, REPOSITORY, validateAuthContract, validateReadiness } from "./git-authentication.mjs";

const valid = (overrides = {}) => ({
  rootCanonical: true, rootDirectory: true, rootSymlink: false, rootUid: 0, rootGid: 44, rootMode: 0o710, buildGid: 44,
  privateCanonical: true, privateRegular: true, privateSymlink: false, privateLinks: 1, privateUid: 0, privateGid: 44, privateMode: 0o440,
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
      { privateCanonical: false }, { privateRegular: false }, { privateSymlink: true }, { privateLinks: 2 }, { privateUid: 1 }, { privateGid: 45 }, { privateMode: 0o400 },
      { publicSymlink: true }, { publicLinks: 2 }, { publicMode: 0o644 }, { publicContent: "ssh-rsa AAAA\n" }, { derivedPublic: "ssh-ed25519 AAAAwrong" },
      { buildReadable: false }, { buildWritable: true }, { bcnReadable: true }, { circleReadable: true }, { runtimeWritable: true }
    ]) assert.throws(() => validateAuthContract(valid(changed)), /contract is invalid/u);
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
