import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { validateLoopbackOnlyNetwork } from "./rollback-fixture-network-isolation.mjs";

const helper = fileURLToPath(new URL("./rollback-fixture-network-isolation.mjs", import.meta.url));
const launcher = readFileSync(new URL("./prepare-rollback-fixture.sh", import.meta.url), "utf8");
const helperSource = readFileSync(helper, "utf8");

function validSnapshot(overrides = {}) {
  return {
    namespace: "4:200",
    hostNamespace: "4:100",
    mountNamespace: "4:400",
    hostMountNamespace: "4:300",
    interfaces: ["lo"],
    loopbackFlags: 0x9,
    ipv4Routes: [],
    ipv6Routes: [],
    defaultIpv4: "",
    defaultIpv6: "",
    externalNetworkBlocked: true,
    ...overrides
  };
}

describe("Phase F1 rollback fixture loopback-only namespace", () => {
  it("uses exactly two fixed ephemeral unshare invocations with no network fallback", () => {
    assert.equal((launcher.match(/\/usr\/bin\/unshare --mount --net -- \/usr\/bin\/env -i/gu) ?? []).length, 2);
    assert.equal((launcher.match(/rollback-fixture-network-isolation\.mjs" (?:generate|verify)/gu) ?? []).length, 2);
    assert.doesNotMatch(launcher, /nsenter|\/run\/netns|ip netns|unshare[^\n]*(?:\|\||;)/u);
    assert.doesNotMatch(launcher, /(?:bash|sh) -c|--net=|--user=/u);
    assert.match(helperSource, /"link", "set", "dev", "lo", "up"/u);
    assert.match(helperSource, /"--make-rprivate", "\/"/u);
    assert.match(helperSource, /"ro,nosuid,nodev,noexec", "sysfs", "\/sys"/u);
    assert.match(helperSource, /--user=phase-f1-build/u);
    assert.match(helperSource, /`--chdir=\$\{workspace\}`/u);
    assert.match(helperSource, /src\/config\/rollback-immutable-runtime-cache\.test\.ts/u);
    assert.doesNotMatch(helperSource, /shell:\s*true|execSync|eval\(/u);
  });

  it("accepts only a distinct namespace containing an up loopback and no routes", () => {
    assert.equal(validateLoopbackOnlyNetwork(validSnapshot()).interfaces[0], "lo");
    for (const snapshot of [
      validSnapshot({ namespace: "4:100" }),
      validSnapshot({ mountNamespace: "4:300" }),
      validSnapshot({ interfaces: ["eth0", "lo"] }),
      validSnapshot({ loopbackFlags: 0x8 }),
      validSnapshot({ defaultIpv4: "default via 192.0.2.1" }),
      validSnapshot({ defaultIpv6: "default via 2001:db8::1" }),
      validSnapshot({ externalNetworkBlocked: false }),
      validSnapshot({ ipv4Routes: ["eth0 00000000"] }),
      validSnapshot({ ipv6Routes: ["0 0 eth0"] })
    ]) assert.throws(() => validateLoopbackOnlyNetwork(snapshot), /loopback-only/u);
    assert.throws(() => validateLoopbackOnlyNetwork({ ...validSnapshot(), arbitrary: true }), /unknown/u);
  });

  it("proves namespace, loopback, build user, cwd, and cleanup on installed Linux root", {
    skip: process.platform !== "linux" || process.getuid?.() !== 0 ||
      !resolve(helper).startsWith("/opt/thebusinesscircle/deployment-packs/")
  }, () => {
    const result = spawnSync("/usr/bin/unshare", [
      "--mount", "--net", "--", "/usr/bin/env", "-i", "HOME=/root",
      "PATH=/usr/local/bin:/usr/bin:/bin", "/usr/bin/node", helper, "probe"
    ], { encoding: "utf8", timeout: 10000 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(result.stdout.trim());
    assert.notEqual(report.network.namespace, report.network.hostNamespace);
    assert.notEqual(report.network.mountNamespace, report.network.hostMountNamespace);
    assert.deepEqual(report.network.interfaces, ["lo"]);
    assert.equal(report.network.loopbackFlags & 0x1, 0x1);
    assert.equal(report.network.defaultIpv4, "");
    assert.equal(report.network.defaultIpv6, "");
    assert.equal(report.network.externalNetworkBlocked, true);
    assert.equal(report.execution.user, "phase-f1-build");
    assert.match(report.execution.cwd, /^\/var\/www\/builds\/rollback-[0-9a-f]{40}-network-probe-/u);
    assert.equal(existsSync(`/proc/${report.execution.namespacePid}`), false);
  });

  it("does not expose arbitrary command, cwd, or namespace arguments", () => {
    assert.match(helperSource, /Usage: rollback-fixture-network-isolation\.mjs <generate\|verify\|probe>/u);
    assert.doesNotMatch(helperSource, /process\.env\.(?:PWD|CWD|COMMAND|NAMESPACE)|caller.*(?:command|cwd|namespace)/iu);
    assert.doesNotMatch(helperSource, /nsenter|setns|ip", \["netns/u);
  });
});
