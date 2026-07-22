import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { readEnvironmentJson } from "./environment-file.mjs";

const require = createRequire(import.meta.url);
const { FORWARD_APPLICATION_SHA, ROLLBACK_APPLICATION_SHA, BCN_ALLOWED_KEYS, CIRCLE_ALLOWED_KEYS, REQUIRED_BCN_KEYS,
  REQUIRED_CIRCLE_KEYS, REQUIRED_SHARED_KEYS, RUNTIME_VALUES } = require("./environment-groups.cjs");

const FORWARD = `/var/www/releases/${FORWARD_APPLICATION_SHA}`;
const ROLLBACK = `/var/www/rollbacks/${ROLLBACK_APPLICATION_SHA}`;

const definitions = {
  "bcn-live": { user: "bcn-app", cwd: "/var/www/current-bcn", targets: [FORWARD, ROLLBACK],
    envFile: "/etc/thebusinesscircle/bcn/runtime.env.json", allowed: BCN_ALLOWED_KEYS,
    required: [...REQUIRED_SHARED_KEYS, ...REQUIRED_BCN_KEYS], runtime: RUNTIME_VALUES.bcn, port: "3000" },
  "bcn-candidate": { user: "bcn-app", cwd: FORWARD, targets: [FORWARD],
    envFile: "/etc/thebusinesscircle/bcn/runtime.env.json", allowed: BCN_ALLOWED_KEYS,
    required: [...REQUIRED_SHARED_KEYS, ...REQUIRED_BCN_KEYS], runtime: { ...RUNTIME_VALUES.bcn, PORT: "3100" }, port: "3100" },
  "bcn-rollback-probe": { user: "bcn-app", cwd: "/var/www/current-bcn-rollback-probe", targets: [ROLLBACK],
    envFile: "/etc/thebusinesscircle/bcn/runtime.env.json", allowed: BCN_ALLOWED_KEYS,
    required: [...REQUIRED_SHARED_KEYS, ...REQUIRED_BCN_KEYS], runtime: { ...RUNTIME_VALUES.bcn, NEXT_RUNTIME_DIST_DIR: ".next", PORT: "3300" }, port: "3300" },
  "circle-card": { user: "circle-card-app", cwd: "/var/www/current-circle-card", targets: [FORWARD],
    envFile: "/etc/thebusinesscircle/circle-card/runtime.env.json", allowed: CIRCLE_ALLOWED_KEYS,
    required: [...REQUIRED_SHARED_KEYS, ...REQUIRED_CIRCLE_KEYS], runtime: RUNTIME_VALUES["circle-card"], port: "3200" }
};

const mode = process.argv[2];
const definition = definitions[mode];
if (!definition) throw new Error("An allowlisted systemd runtime mode is required.");
const expectedUid = Number(execFileSync("/usr/bin/id", ["-u", definition.user], { encoding: "utf8" }).trim());
const expectedGid = Number(execFileSync("/usr/bin/id", ["-g", definition.user], { encoding: "utf8" }).trim());
if (process.getuid?.() === 0 || process.getuid?.() !== expectedUid || process.getgid?.() !== expectedGid) throw new Error("The runtime launcher has the wrong effective identity.");
const currentUser = process.env.USER;
if (currentUser !== definition.user || process.env.LOGNAME !== definition.user) throw new Error("Unexpected service identity.");

const cwdLink = lstatSync(definition.cwd);
if (cwdLink.isSymbolicLink() && !["bcn-live", "bcn-rollback-probe", "circle-card"].includes(mode)) {
  throw new Error("Only reviewed stable selectors may be symbolic links.");
}
const resolvedCwd = realpathSync(definition.cwd);
if (!definition.targets.includes(resolvedCwd)) throw new Error("Runtime selector resolved to an unapproved artifact.");
if (realpathSync(process.cwd()) !== resolvedCwd) throw new Error("WorkingDirectory does not resolve to the approved artifact.");

const configured = readEnvironmentJson(definition.envFile, {
  allowedKeys: definition.allowed,
  requiredKeys: definition.required,
  expectedGroup: definition.user
});
const runtime = { ...definition.runtime };
if (mode === "bcn-live" && resolvedCwd === ROLLBACK) runtime.NEXT_RUNTIME_DIST_DIR = ".next";
const exactEnvironment = {
  HOME: `/var/lib/thebusinesscircle/${definition.user}`,
  USER: definition.user,
  LOGNAME: definition.user,
  LANG: "C.UTF-8",
  TZ: "Europe/London",
  PATH: "/usr/local/bin:/usr/bin:/bin",
  ...configured,
  ...runtime
};
const nextBin = join(resolvedCwd, "node_modules", "next", "dist", "bin", "next");
if (!existsSync(nextBin)) throw new Error("Approved Next executable is absent.");
if (typeof process.execve !== "function") throw new Error("Node 22.22.2 process.execve support is required.");
process.execve("/usr/bin/node", ["/usr/bin/node", nextBin, "start", "-H", "127.0.0.1", "-p", definition.port], exactEnvironment);
