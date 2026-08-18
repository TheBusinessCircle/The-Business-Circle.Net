import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPROVED_GIT_HOST_KEY,
  APPROVED_GIT_HTTPS_ORIGIN,
  APPROVED_GIT_SSH_ORIGIN,
  APPROVED_KNOWN_HOSTS,
  buildPinnedSshCommand,
  validateApprovedOrigin,
  validateTrustContract
} from "./git-transport-trust.mjs";

const validContract = (overrides = {}) => ({
  content: APPROVED_KNOWN_HOSTS,
  canonical: true,
  regular: true,
  symlink: false,
  linkCount: 1,
  uid: 0,
  gid: 0,
  mode: 0o444,
  buildReadable: true,
  buildWritable: false,
  bcnWritable: false,
  circleWritable: false,
  ...overrides
});

describe("Phase F1 pinned Git transport trust", () => {
  it("accepts only the exact approved repository origins", () => {
    assert.equal(validateApprovedOrigin(APPROVED_GIT_SSH_ORIGIN), "ssh");
    assert.equal(validateApprovedOrigin(APPROVED_GIT_HTTPS_ORIGIN), "https");
    for (const origin of [
      "git@github.com:other/repository.git",
      "git@evil.example:TheBusinessCircle/The-Business-Circle.Net.git",
      "https://github.com/TheBusinessCircle/other.git",
      "ssh://git@github.com/TheBusinessCircle/The-Business-Circle.Net.git"
    ]) assert.throws(() => validateApprovedOrigin(origin), /exact approved/u);
  });

  it("accepts only the official pinned Ed25519 host record and protected metadata", () => {
    assert.equal(validateTrustContract(validContract()).content, APPROVED_KNOWN_HOSTS);
    for (const changed of [
      { content: APPROVED_KNOWN_HOSTS.replace(APPROVED_GIT_HOST_KEY, "AAAAchanged") },
      { content: APPROVED_KNOWN_HOSTS.replace("github.com", "*.github.com") },
      { content: APPROVED_KNOWN_HOSTS.replace("ssh-ed25519", "ssh-rsa") },
      { content: `${APPROVED_KNOWN_HOSTS}other.example ssh-ed25519 AAAA\n` },
      { canonical: false }, { regular: false }, { symlink: true }, { linkCount: 2 },
      { uid: 1 }, { gid: 1 }, { mode: 0o644 }, { buildReadable: false },
      { buildWritable: true }, { bcnWritable: true }, { circleWritable: true }
    ]) assert.throws(() => validateTrustContract(validContract(changed)), /contract is invalid/u);
  });

  it("forces strict checking and blocks ambient SSH trust overrides", () => {
    const command = buildPinnedSshCommand(
      "/opt/thebusinesscircle/deployment-packs/0123456789012345678901234567890123456789/github.com.known_hosts"
    );
    for (const required of [
      "-F /dev/null",
      "-oStrictHostKeyChecking=yes",
      "-oUserKnownHostsFile=/opt/thebusinesscircle/deployment-packs/",
      "-oGlobalKnownHostsFile=/dev/null",
      "-oHostKeyAlgorithms=ssh-ed25519",
      "-oUpdateHostKeys=no",
      "-oVerifyHostKeyDNS=no",
      "-oIdentityAgent=none",
      "-oIdentitiesOnly=yes",
      "-oIdentityFile=/var/lib/thebusinesscircle/build/git-auth/github-deploy-key"
    ]) assert.match(command, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    assert.doesNotMatch(command, /StrictHostKeyChecking=no|accept-new/u);
    assert.throws(() => buildPinnedSshCommand("/tmp/known hosts"), /unsafe/u);
    assert.throws(() => buildPinnedSshCommand(
      "/opt/thebusinesscircle/deployment-packs/0123456789012345678901234567890123456789/github.com.known_hosts",
      "/tmp/alternate-key"
    ), /identity path is unsafe/u);
  });
});
