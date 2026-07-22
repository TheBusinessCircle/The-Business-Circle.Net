import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { BCN_ALLOWED_KEYS, CIRCLE_ALLOWED_KEYS, FORWARD_APPLICATION_SHA, ROLLBACK_APPLICATION_SHA, RUNTIME_VALUES } = require("./environment-groups.cjs");

const FORWARD = `/var/www/releases/${FORWARD_APPLICATION_SHA}`;
const ROLLBACK = `/var/www/rollbacks/${ROLLBACK_APPLICATION_SHA}`;
const ARTIFACT_ROOT = `/var/lib/thebusinesscircle/artifacts/${FORWARD_APPLICATION_SHA}-${ROLLBACK_APPLICATION_SHA}`;
const base = {
  "the-business-circle-network.service": { user: "bcn-app", groups: ["bcn-app", "circle-card-private", "circle-public"], port: 3000, mode: "bcn-live", envFile: "/etc/thebusinesscircle/bcn/runtime.env.json", allowed: BCN_ALLOWED_KEYS, targets: [FORWARD, ROLLBACK] },
  "the-business-circle-network-candidate.service": { user: "bcn-app", groups: ["bcn-app", "circle-card-private", "circle-public"], port: 3100, mode: "bcn-candidate", envFile: "/etc/thebusinesscircle/bcn/runtime.env.json", allowed: BCN_ALLOWED_KEYS, targets: [FORWARD] },
  "the-business-circle-network-rollback-probe.service": { user: "bcn-app", groups: ["bcn-app", "circle-card-private", "circle-public"], port: 3300, mode: "bcn-rollback-probe", envFile: "/etc/thebusinesscircle/bcn/runtime.env.json", allowed: BCN_ALLOWED_KEYS, targets: [ROLLBACK] },
  "circle-card.service": { user: "circle-card-app", groups: ["circle-card-app", "circle-card-private", "circle-public"], port: 3200, mode: "circle-card", envFile: "/etc/thebusinesscircle/circle-card/runtime.env.json", allowed: CIRCLE_ALLOWED_KEYS, targets: [FORWARD] }
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function resolveProcessExpectation(unit, resolvedCwd, packPath) {
  const definition = base[unit];
  if (!definition || !definition.targets.includes(resolvedCwd) || !/^\/opt\/thebusinesscircle\/deployment-packs\/[0-9a-f]{40}$/u.test(packPath)) throw new Error("Unapproved systemd unit, artifact, or operations path.");
  const rollback = resolvedCwd === ROLLBACK;
  const circle = unit === "circle-card.service";
  const candidate = unit.includes("candidate"), probe = unit.includes("rollback-probe");
  const runtime = circle ? RUNTIME_VALUES["circle-card"] : { ...RUNTIME_VALUES.bcn, ...(candidate ? { PORT: "3100" } : {}), ...(probe ? { NEXT_RUNTIME_DIST_DIR: ".next", PORT: "3300" } : {}), ...(rollback && !probe ? { NEXT_RUNTIME_DIST_DIR: ".next" } : {}) };
  const applicationRole = rollback ? "rollback-bcn" : circle ? "forward-circle-card" : "forward-bcn";
  const artifactIdentityPath = `${ARTIFACT_ROOT}/${applicationRole}.artifact.json`;
  return { ...definition, runtime, resolvedCwd, applicationRole, applicationSha: rollback ? ROLLBACK_APPLICATION_SHA : FORWARD_APPLICATION_SHA, artifactIdentityPath, launcherPath: `${packPath}/runtime-launcher.mjs`, restart: candidate || probe ? "no" : "on-failure" };
}

export function parseSystemdExecStart(value) {
  const match = /(?:^|;\s*)argv\[\]=(.+?)\s*;\s*ignore_errors=/u.exec(value || "");
  if (!match) throw new Error("Unable to parse systemd ExecStart metadata.");
  const argv = match[1].trim().split(/\s+/u);
  if (argv.some((part) => !part)) throw new Error("Malformed systemd ExecStart arguments.");
  return argv;
}

export function verifyProcessSnapshot(snapshot, expected) {
  if (snapshot.activeState !== "active" || snapshot.user !== expected.user || snapshot.group !== expected.user || snapshot.noNewPrivileges !== "yes" || snapshot.restart !== expected.restart) throw new Error("Systemd identity or policy mismatch.");
  if (snapshot.uid !== expected.uid || snapshot.gid !== expected.gid) throw new Error("Effective UID/GID mismatch.");
  if (JSON.stringify([...snapshot.groups].sort()) !== JSON.stringify([...expected.groups].sort())) throw new Error("Unexpected supplementary groups.");
  if (snapshot.noNewPrivs !== "1" || !snapshot.capabilities.every((value) => value === "0000000000000000")) throw new Error("Process retained privileges or capabilities.");
  if (snapshot.resolvedCwd !== expected.resolvedCwd || snapshot.workingDirectory !== expected.workingDirectory) throw new Error("WorkingDirectory or selected artifact mismatch.");
  const expectedLauncher = ["/usr/bin/node", expected.launcherPath, expected.mode];
  if (JSON.stringify(snapshot.execStart) !== JSON.stringify(expectedLauncher) || snapshot.launcherMode !== 0o444) throw new Error("Unit launcher path, arguments, or protected mode mismatch.");
  const nextBin = `${expected.resolvedCwd}/node_modules/next/dist/bin/next`;
  const command = ["/usr/bin/node", nextBin, "start", "-H", "127.0.0.1", "-p", String(expected.port)];
  if (JSON.stringify(snapshot.command) !== JSON.stringify(command)) throw new Error("Exact process command mismatch.");
  if (JSON.stringify(snapshot.environmentNames) !== JSON.stringify(expected.environmentNames)) throw new Error("Effective environment-name set is not exact.");
  for (const [name, value] of Object.entries(expected.runtime)) if (snapshot.environment[name] !== value) throw new Error(`Runtime identity mismatch: ${name}`);
  if (snapshot.artifactRole !== expected.applicationRole || snapshot.artifactSha !== expected.applicationSha || snapshot.artifactDigest !== expected.artifactDigest) throw new Error("Runtime artifact identity mismatch.");
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const unit = process.argv[2];
  if (!base[unit]) throw new Error("Unapproved systemd unit.");
  const properties = execFileSync("/usr/bin/systemctl", ["show", unit, "--property=ActiveState,MainPID,User,Group,SupplementaryGroups,WorkingDirectory,ExecStart,Restart,NoNewPrivileges"], { encoding: "utf8" });
  const values = Object.fromEntries(properties.trim().split("\n").map((line) => line.split(/=(.*)/s).slice(0, 2)));
  const pid = Number(values.MainPID); if (!Number.isInteger(pid) || pid < 2) throw new Error("Invalid MainPID.");
  const resolvedCwd = realpathSync(`/proc/${pid}/cwd`), packPath = realpathSync(dirname(fileURLToPath(import.meta.url)));
  const expected = resolveProcessExpectation(unit, resolvedCwd, packPath);
  const status = Object.fromEntries(readFileSync(`/proc/${pid}/status`, "utf8").split("\n").filter(Boolean).map((line) => line.split(/:\s*/, 2)));
  const uid = Number(status.Uid.split(/\s+/u)[0]), gid = Number(status.Gid.split(/\s+/u)[0]);
  const expectedUid = Number(execFileSync("/usr/bin/id", ["-u", expected.user], { encoding: "utf8" }).trim()), expectedGid = Number(execFileSync("/usr/bin/id", ["-g", expected.user], { encoding: "utf8" }).trim());
  const groups = status.Groups.trim().split(/\s+/u).map((groupId) => execFileSync("/usr/bin/getent", ["group", groupId], { encoding: "utf8" }).split(":")[0]);
  const command = readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0").filter(Boolean);
  const environmentEntries = readFileSync(`/proc/${pid}/environ`, "utf8").split("\0").filter(Boolean), environment = Object.fromEntries(environmentEntries.map((entry) => [entry.slice(0, entry.indexOf("=")), entry.slice(entry.indexOf("=") + 1)]));
  const configuredNames = Object.keys(JSON.parse(readFileSync(expected.envFile, "utf8")));
  if (configuredNames.some((name) => !expected.allowed.includes(name))) throw new Error("Protected environment contains an unapproved name.");
  const environmentNames = Object.keys(environment).sort(), exactNames = [...new Set(["HOME", "USER", "LOGNAME", "LANG", "TZ", "PATH", ...configuredNames, ...Object.keys(expected.runtime)])].sort();
  const artifactBytes = readFileSync(expected.artifactIdentityPath), artifact = JSON.parse(artifactBytes);
  const rollback = expected.applicationRole === "rollback-bcn", circle = expected.applicationRole === "forward-circle-card";
  const releaseManifest = `${ARTIFACT_ROOT}/${rollback ? "rollback-release" : "forward-release"}.manifest`;
  const runtimeManifest = `${ARTIFACT_ROOT}/${rollback ? "rollback-bcn" : circle ? "runtime-circle-card" : "runtime-bcn"}.manifest`;
  const runtimeRoot = rollback ? `${expected.resolvedCwd}/.next` : `${expected.resolvedCwd}/.runtime/${circle ? "circle-card" : "bcn"}`;
  if (artifact.artifactDigest !== sha256(readFileSync(releaseManifest))) throw new Error("Artifact identity does not bind the complete release manifest.");
  const manifestHelper = fileURLToPath(new URL("./artifact-manifest.mjs", import.meta.url));
  execFileSync("/usr/bin/node", [manifestHelper, "release-verify", expected.resolvedCwd, releaseManifest]);
  execFileSync("/usr/bin/node", [manifestHelper, "runtime-verify", runtimeRoot, runtimeManifest]);
  const bindings = JSON.parse(readFileSync("/var/lib/thebusinesscircle/deployment-state/release-bindings.json", "utf8"));
  const bindingKey = expected.applicationRole === "forward-bcn" ? "forwardBcnArtifactDigest" : expected.applicationRole === "forward-circle-card" ? "forwardCircleCardArtifactDigest" : "rollbackBcnArtifactDigest";
  if (bindings[bindingKey] !== sha256(artifactBytes)) throw new Error("Process artifact is not bound to durable release state.");
  const snapshot = { activeState: values.ActiveState, user: values.User, group: values.Group, noNewPrivileges: values.NoNewPrivileges, restart: values.Restart, uid, gid, groups, noNewPrivs: status.NoNewPrivs, capabilities: [status.CapInh, status.CapPrm, status.CapEff, status.CapBnd, status.CapAmb], resolvedCwd, workingDirectory: realpathSync(values.WorkingDirectory), execStart: parseSystemdExecStart(values.ExecStart), launcherMode: lstatSync(expected.launcherPath).mode & 0o777, command, environmentNames, environment, artifactRole: artifact.applicationRole, artifactSha: artifact.applicationSha, artifactDigest: sha256(artifactBytes) };
  verifyProcessSnapshot(snapshot, { ...expected, uid: expectedUid, gid: expectedGid, workingDirectory: resolvedCwd, environmentNames: exactNames, artifactDigest: sha256(artifactBytes) });
  execFileSync("/usr/bin/node", [new URL("./listener-verification.mjs", import.meta.url).pathname, "verify", String(expected.port), String(pid)]);
  process.stdout.write(JSON.stringify({ unit, pid, role: expected.applicationRole, applicationSha: expected.applicationSha, resolvedCwd, artifactDigest: sha256(artifactBytes), environmentNames }));
}
