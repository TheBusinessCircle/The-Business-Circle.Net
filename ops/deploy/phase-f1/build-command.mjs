import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readEnvironmentJson } from "./environment-file.mjs";
import { APPLICATION_IDENTITIES, verifyApplicationCommit } from "./application-identities.mjs";
import { forwardBuildRole } from "./build-role-contract.mjs";

const require = createRequire(import.meta.url);
const { BUILD_ENV_KEYS } = require("./environment-groups.cjs");
const COMMANDS = new Set(["prisma", "next", "verify"]);
const FIXED_BUILD_IDENTITY_KEYS = new Set([
  "APP_BRAND", "APP_URL", "AUTH_URL", "NEXTAUTH_URL", "NODE_ENV", "PHASE_F1_BUILD_ROLE",
  "PHASE_F1_BUILD_APPLICATION_SHA", "DATABASE_URL", "AUTH_SECRET", "NEXTAUTH_SECRET",
  "CIRCLE_CARD_BILLING_ENABLED", "CIRCLE_CARD_BILLING_ACCESS_MODE"
]);

export function createForwardBuildEnvironment(role, publicValues = {}, options = {}) {
  const contract = forwardBuildRole(role);
  if (!publicValues || Array.isArray(publicValues) || typeof publicValues !== "object" ||
      Object.keys(publicValues).some(key => FIXED_BUILD_IDENTITY_KEYS.has(key))) {
    throw new Error("Protected build environment attempted to override a fixed build identity.");
  }
  const secret = options.secret ?? (() => randomBytes(48).toString("base64url"));
  return {
    HOME: "/var/lib/thebusinesscircle/build",
    USER: "phase-f1-build",
    LOGNAME: "phase-f1-build",
    PATH: "/usr/local/bin:/usr/bin:/bin",
    LANG: "C.UTF-8",
    TZ: "Europe/London",
    ...publicValues,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    APP_BRAND: contract.appBrand,
    APP_URL: contract.publicOrigin,
    AUTH_URL: contract.authOrigin,
    NEXTAUTH_URL: contract.authOrigin,
    DATABASE_URL: "postgresql://phase_f1_build@127.0.0.1:1/phase_f1_build",
    AUTH_SECRET: secret(),
    NEXTAUTH_SECRET: secret(),
    CIRCLE_CARD_BILLING_ENABLED: "false",
    CIRCLE_CARD_BILLING_ACCESS_MODE: "operator",
    ...(role === "circle-card" ? { BCN_COMMUNITY_AUTOMATION_ENABLED: "false" } : {}),
    PHASE_F1_BUILD_ROLE: role,
    PHASE_F1_BUILD_APPLICATION_SHA: APPLICATION_IDENTITIES.forward.sha
  };
}

export function resolveForwardBuildTarget(command, role, cwd) {
  if (!COMMANDS.has(command)) throw new Error("Unknown build command.");
  forwardBuildRole(role);
  const targets = {
    prisma: [join(cwd, "node_modules/prisma/build/index.js"), "generate"],
    next: [join(cwd, "node_modules/next/dist/bin/next"), "build"],
    verify: [join(cwd, "scripts/verify-circle-card-action-build.mjs")]
  };
  return targets[command];
}

function run() {
  const [command, role, ...extras] = process.argv.slice(2);
  if (extras.length || !command || !role) {
    throw new Error("Usage: build-command.mjs <prisma|next|verify> <bcn|circle-card>");
  }
  if (process.getuid?.() === 0 ||
      execFileSync("/usr/bin/id", ["-un"], { encoding: "utf8" }).trim() !== "phase-f1-build") {
    throw new Error("Unprivileged build identity required.");
  }
  const cwd = realpathSync(process.cwd());
  const expectedSha = APPLICATION_IDENTITIES.forward.sha;
  if (!cwd.startsWith(`/var/www/builds/forward-${expectedSha}-`)) {
    throw new Error("Build CWD is not a fresh forward checkout.");
  }
  verifyApplicationCommit(cwd, "forward");
  const publicValues = readEnvironmentJson("/etc/thebusinesscircle/build/build.env.json", {
    allowedKeys: BUILD_ENV_KEYS,
    expectedGroup: "phase-f1-build"
  });
  const environment = createForwardBuildEnvironment(role, publicValues);
  const [script, ...arguments_] = resolveForwardBuildTarget(command, role, cwd);
  if (!existsSync(script) || typeof process.execve !== "function") {
    throw new Error("Required build executable or Node process.execve is absent.");
  }
  process.execve("/usr/bin/node", ["/usr/bin/node", script, ...arguments_], environment);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
