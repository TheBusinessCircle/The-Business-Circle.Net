import { spawnSync } from "node:child_process";
import {
  chmodSync,
  chownSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROLLBACK_SHA = "8db8236c16ebb5a02ec5b90f7e5308008cff7086";
const BUILD_ROOT = "/var/www/builds";
const STATE_ROOT = "/var/lib/thebusinesscircle/deployment-state";
const AUTHORITY = "/var/lib/thebusinesscircle/approved-phase-f1-pack.json";
const CACHE_ROOT = "/var/cache/thebusinesscircle/phase-f1/npm-offline-v1";
const BUILD_HOME = "/var/lib/thebusinesscircle/build";
const FIXTURE_FILTER = "src/config/rollback-immutable-runtime-cache.test.ts";
const FIXED_PATH = "/usr/local/bin:/usr/bin:/bin";
const PACK_ROOT = dirname(fileURLToPath(import.meta.url));
const OPERATIONS_COMMIT = basename(PACK_ROOT);

function exactKeys(record, keys, label) {
  if (!record || typeof record !== "object" || Array.isArray(record) ||
      JSON.stringify(Object.keys(record).sort()) !== JSON.stringify([...keys].sort())) {
    throw new Error(`${label} has unknown or missing fields.`);
  }
}

function fixedCommand(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    encoding: options.encoding,
    env: { HOME: "/root", PATH: FIXED_PATH },
    stdio: options.stdio ?? (options.encoding ? "pipe" : "ignore"),
    timeout: options.timeout
  });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error(options.error ?? "Fixed rollback fixture isolation command failed.");
  }
  return result;
}

function fixedIdentity(name, option) {
  const result = fixedCommand("/usr/bin/id", [option, name], {
    encoding: "utf8",
    error: "Exact Phase F1 build identity is unavailable."
  });
  const identity = Number(result.stdout.trim());
  if (!Number.isSafeInteger(identity) || identity <= 0) {
    throw new Error("Exact Phase F1 build identity is invalid.");
  }
  return identity;
}

function assertRootFile(path) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1 ||
      stats.uid !== 0 || stats.gid !== 0 || (stats.mode & 0o777) !== 0o600 ||
      realpathSync(path) !== path) {
    throw new Error("Rollback fixture protected evidence is unsafe.");
  }
}

function assertDirectory(path, expected) {
  const canonical = realpathSync(path);
  const stats = lstatSync(canonical);
  if (canonical !== path || !stats.isDirectory() || stats.isSymbolicLink() ||
      stats.uid !== expected.uid || stats.gid !== expected.gid ||
      (stats.mode & 0o777) !== expected.mode) {
    throw new Error("Rollback fixture directory context is unsafe.");
  }
}

function readConsumedRollbackAttempt() {
  const path = join(STATE_ROOT, "rollback-build-attempt.json");
  assertRootFile(path);
  const record = JSON.parse(readFileSync(path, "utf8"));
  exactKeys(record, [
    "applicationSha", "attemptId", "format", "operationsCommit", "path", "role", "status"
  ], "Rollback build attempt");
  if (record.format !== "phase-f1-build-attempt-v2" || record.role !== "rollback" ||
      record.applicationSha !== ROLLBACK_SHA || record.operationsCommit !== OPERATIONS_COMMIT ||
      record.status !== "consumed" || !/^[0-9a-f]{24}$/u.test(record.attemptId || "") ||
      resolve(record.path) !== record.path || dirname(record.path) !== BUILD_ROOT ||
      !basename(record.path).startsWith(`rollback-${ROLLBACK_SHA}-`)) {
    throw new Error("Rollback fixture build attempt is stale or unsupported.");
  }
  return record;
}

function fixtureContext(mode) {
  const attempt = readConsumedRollbackAttempt();
  const buildUid = fixedIdentity("phase-f1-build", "-u");
  const buildGid = fixedIdentity("phase-f1-build", "-g");
  const workspace = realpathSync(attempt.path);
  const workspaceName = basename(workspace);
  const fixtureParent = join(BUILD_ROOT, `rollback-fixture-${ROLLBACK_SHA}-${workspaceName}`);
  const fixture = join(fixtureParent, "fixture");
  if (mode === "generate") {
    assertDirectory(workspace, { uid: buildUid, gid: buildGid, mode: 0o750 });
    assertDirectory(fixtureParent, { uid: buildUid, gid: buildGid, mode: 0o750 });
    if (existsSync(fixture)) throw new Error("Rollback fixture generation destination already exists.");
  } else {
    assertDirectory(workspace, { uid: 0, gid: 0, mode: 0o555 });
    assertDirectory(fixtureParent, { uid: 0, gid: 0, mode: 0o555 });
    assertDirectory(fixture, { uid: 0, gid: 0, mode: 0o555 });
  }
  return { workspace, fixture };
}

function routeSnapshot() {
  return {
    ipv4Routes: readFileSync("/proc/net/route", "utf8")
      .split(/\r?\n/u).slice(1).filter(line => line.trim()),
    ipv6Routes: readFileSync("/proc/net/ipv6_route", "utf8")
      .split(/\r?\n/u).filter(line => line.trim())
  };
}

export function validateLoopbackOnlyNetwork(snapshot) {
  exactKeys(snapshot, [
    "defaultIpv4", "defaultIpv6", "externalNetworkBlocked", "hostMountNamespace",
    "hostNamespace", "interfaces", "ipv4Routes", "ipv6Routes", "loopbackFlags",
    "mountNamespace", "namespace"
  ], "Rollback fixture network snapshot");
  if (snapshot.namespace === snapshot.hostNamespace ||
      snapshot.mountNamespace === snapshot.hostMountNamespace ||
      JSON.stringify(snapshot.interfaces) !== JSON.stringify(["lo"]) ||
      (snapshot.loopbackFlags & 0x1) !== 0x1 || snapshot.defaultIpv4 !== "" ||
      snapshot.defaultIpv6 !== "" || snapshot.externalNetworkBlocked !== true ||
      snapshot.ipv4Routes.some(line => !/^lo\s/u.test(line.trim())) ||
      snapshot.ipv6Routes.some(line => !/\slo\s*$/u.test(line.trim()))) {
    throw new Error("Rollback fixture network namespace is not loopback-only.");
  }
  return snapshot;
}

function namespaceIdentity(path) {
  const stats = statSync(path);
  return `${stats.dev}:${stats.ino}`;
}

function connectionBlocked(host, port) {
  const proof = "const net=require('node:net');const s=net.createConnection({host:process.argv[1],port:Number(process.argv[2])});s.once('connect',()=>process.exit(20));s.once('error',()=>process.exit(0));setTimeout(()=>{s.destroy();process.exit(0)},500);";
  const result = spawnSync("/usr/bin/node", ["-e", proof, host, String(port)], {
    env: { HOME: "/root", PATH: FIXED_PATH },
    stdio: "ignore",
    timeout: 2000
  });
  return !result.error && !result.signal && result.status === 0;
}

function prepareAndVerifyNamespace() {
  fixedCommand("/usr/bin/mount", ["--make-rprivate", "/"], {
    error: "Rollback fixture mount namespace isolation failed."
  });
  fixedCommand("/usr/bin/mount", [
    "-t", "sysfs", "-o", "ro,nosuid,nodev,noexec", "sysfs", "/sys"
  ], { error: "Rollback fixture namespace-scoped sysfs mount failed." });
  fixedCommand("/usr/sbin/ip", ["link", "set", "dev", "lo", "up"], {
    error: "Rollback fixture loopback activation failed."
  });
  const routes = routeSnapshot();
  const defaultIpv4 = fixedCommand("/usr/sbin/ip", ["route", "show", "default"], {
    encoding: "utf8",
    error: "Rollback fixture IPv4 route inspection failed."
  }).stdout.trim();
  const defaultIpv6 = fixedCommand("/usr/sbin/ip", ["-6", "route", "show", "default"], {
    encoding: "utf8",
    error: "Rollback fixture IPv6 route inspection failed."
  }).stdout.trim();
  return validateLoopbackOnlyNetwork({
    namespace: namespaceIdentity("/proc/self/ns/net"),
    hostNamespace: namespaceIdentity("/proc/1/ns/net"),
    mountNamespace: namespaceIdentity("/proc/self/ns/mnt"),
    hostMountNamespace: namespaceIdentity("/proc/1/ns/mnt"),
    interfaces: readdirSync("/sys/class/net").sort(),
    loopbackFlags: Number.parseInt(readFileSync("/sys/class/net/lo/flags", "utf8").trim(), 16),
    ipv4Routes: routes.ipv4Routes,
    ipv6Routes: routes.ipv6Routes,
    defaultIpv4,
    defaultIpv6,
    externalNetworkBlocked: connectionBlocked("192.0.2.1", 9) &&
      connectionBlocked("127.0.0.1", 3000)
  });
}

function prepareFixtureNpmShim() {
  const wrapper = join(PACK_ROOT, "rollback-fixture-npm.sh");
  const command = join(PACK_ROOT, "rollback-fixture-npm-command.mjs");
  const npmCli = realpathSync("/usr/bin/npm");
  const npmCliStats = lstatSync(npmCli);
  if (npmCli !== "/usr/lib/node_modules/npm/bin/npm-cli.js" ||
      !npmCliStats.isFile() || npmCliStats.isSymbolicLink() ||
      npmCliStats.uid !== 0 || npmCliStats.gid !== 0 || (npmCliStats.mode & 0o022)) {
    throw new Error("Exact protected npm 10.9.7 CLI is unavailable.");
  }
  fixedCommand("/usr/bin/mount", [
    "-t", "tmpfs", "-o", "nosuid,nodev,mode=0755,size=64k", "tmpfs", "/usr/local/bin"
  ], { error: "Rollback fixture npm shim mount isolation failed." });
  fixedCommand("/usr/bin/install", [
    "-m", "0555", "-o", "root", "-g", "root", wrapper, "/usr/local/bin/npm"
  ], { error: "Rollback fixture fixed npm shim installation failed." });
  fixedCommand("/usr/bin/install", [
    "-m", "0444", "-o", "root", "-g", "root", command,
    "/usr/local/bin/rollback-fixture-npm-command.mjs"
  ], { error: "Rollback fixture fixed npm command installation failed." });
  fixedCommand("/usr/bin/mount", [
    "-o", "remount,ro,nosuid,nodev", "/usr/local/bin"
  ], { error: "Rollback fixture npm shim read-only remount failed." });
  const shim = lstatSync("/usr/local/bin/npm");
  const helper = lstatSync("/usr/local/bin/rollback-fixture-npm-command.mjs");
  if (!shim.isFile() || shim.isSymbolicLink() || shim.nlink !== 1 ||
      shim.uid !== 0 || shim.gid !== 0 || (shim.mode & 0o777) !== 0o555 ||
      !helper.isFile() || helper.isSymbolicLink() || helper.nlink !== 1 ||
      helper.uid !== 0 || helper.gid !== 0 || (helper.mode & 0o777) !== 0o444) {
    throw new Error("Rollback fixture npm shim metadata is unsafe.");
  }
}

function assertInstalledContext(requireCurrentAuthority) {
  const expected = `/opt/thebusinesscircle/deployment-packs/${OPERATIONS_COMMIT}`;
  if (!/^[0-9a-f]{40}$/u.test(OPERATIONS_COMMIT) || PACK_ROOT !== expected ||
      realpathSync(PACK_ROOT) !== PACK_ROOT) {
    throw new Error("Rollback fixture isolation must run from an installed commit-named pack.");
  }
  if (requireCurrentAuthority) {
    fixedCommand("/usr/bin/node", [join(PACK_ROOT, "verify-pack-integrity.mjs"), AUTHORITY], {
      error: "Rollback fixture isolation pack is not authoritative."
    });
  }
}

function buildUserArguments(workspace, environment, command) {
  return [
    "--user=phase-f1-build", "/usr/bin/env", `--chdir=${workspace}`, "-i",
    `HOME=${BUILD_HOME}`, `PATH=${FIXED_PATH}`, ...environment, ...command
  ];
}

function runFixture(mode) {
  const { workspace, fixture } = fixtureContext(mode);
  const environment = mode === "generate" ? [
    `NPM_CONFIG_CACHE=${CACHE_ROOT}`,
    "NPM_CONFIG_OFFLINE=true",
    "NEXT_TELEMETRY_DISABLED=1",
    `PHASE_E3_OFFLINE_NPM_CACHE_ROOT=${CACHE_ROOT}`,
    `PHASE_E3_GENERATE_PRODUCTION_FIXTURE_ROOT=${fixture}`
  ] : [
    "NEXT_TELEMETRY_DISABLED=1",
    `PHASE_E3_PRODUCTION_FIXTURE_ROOT=${fixture}`
  ];
  const command = [
    "/usr/bin/node", join(workspace, "node_modules/vitest/vitest.mjs"),
    "run", "--root", workspace, FIXTURE_FILTER
  ];
  fixedCommand("/usr/bin/sudo", buildUserArguments(workspace, environment, command), {
    stdio: "inherit",
    error: "Rollback fixture Vitest execution failed inside the isolated namespace."
  });
  return { mode, workspace, fixture, buildUser: "phase-f1-build" };
}

function runProbe() {
  const buildUid = fixedIdentity("phase-f1-build", "-u");
  const buildGid = fixedIdentity("phase-f1-build", "-g");
  const workspace = mkdtempSync(join(BUILD_ROOT, `rollback-${ROLLBACK_SHA}-network-probe-`));
  const identity = lstatSync(workspace);
  try {
    writeFileSync(join(workspace, "package.json"), '{"name":"trusted-workspace"}\n');
    writeFileSync(join(workspace, "package-lock.json"), '{"lockfileVersion":3}\n');
    chownSync(join(workspace, "package.json"), buildUid, buildGid);
    chownSync(join(workspace, "package-lock.json"), buildUid, buildGid);
    chmodSync(join(workspace, "package.json"), 0o440);
    chmodSync(join(workspace, "package-lock.json"), 0o440);
    chownSync(workspace, buildUid, buildGid);
    chmodSync(workspace, 0o750);
    const proof = "const fs=require('node:fs'),os=require('node:os');if(os.userInfo().username!=='phase-f1-build'||process.cwd()!==process.argv[1])process.exit(30);if(JSON.stringify(fs.readdirSync('/sys/class/net').sort())!==JSON.stringify(['lo']))process.exit(31);if((parseInt(fs.readFileSync('/sys/class/net/lo/flags','utf8'),16)&1)!==1)process.exit(32);if(JSON.parse(fs.readFileSync('package.json')).name!=='trusted-workspace'||JSON.parse(fs.readFileSync('package-lock.json')).lockfileVersion!==3)process.exit(33);process.stdout.write(JSON.stringify({user:os.userInfo().username,cwd:process.cwd(),pid:process.pid}));";
    const result = fixedCommand("/usr/bin/sudo", buildUserArguments(workspace, [], [
      "/usr/bin/node", "-e", proof, workspace
    ]), {
      encoding: "utf8",
      error: "Rollback fixture build-user namespace probe failed."
    });
    return { ...JSON.parse(result.stdout), namespacePid: process.pid };
  } finally {
    const current = lstatSync(workspace);
    if (realpathSync(workspace) !== workspace || current.dev !== identity.dev ||
        current.ino !== identity.ino || !basename(workspace).startsWith(`rollback-${ROLLBACK_SHA}-network-probe-`)) {
      throw new Error("Rollback fixture namespace probe cleanup identity changed.");
    }
    rmSync(workspace, { recursive: true });
  }
}

export function runIsolatedRollbackFixture(mode) {
  if (!new Set(["generate", "verify", "probe"]).has(mode)) {
    throw new Error("Rollback fixture isolation mode is invalid.");
  }
  if (process.platform !== "linux" || process.getuid?.() !== 0) {
    throw new Error("Rollback fixture isolation requires Linux root namespace setup.");
  }
  assertInstalledContext(mode !== "probe");
  const network = prepareAndVerifyNamespace();
  prepareFixtureNpmShim();
  const execution = mode === "probe" ? runProbe() : runFixture(mode);
  return { mode, network, execution, namespaceLifecycle: "EPHEMERAL_UNSHARE_PROCESS" };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, ...extras] = process.argv.slice(2);
  if (extras.length || !mode) {
    throw new Error("Usage: rollback-fixture-network-isolation.mjs <generate|verify|probe>");
  }
  const result = runIsolatedRollbackFixture(mode);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
