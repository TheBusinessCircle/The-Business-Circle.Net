import { execFileSync } from "node:child_process";
import { lstatSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

export const PHASE_F1_BUILD_USER = "phase-f1-build";
export const PHASE_F1_BUILD_ROOT = "/var/www/builds";

const checkoutPattern = /^(?:forward|rollback)-[0-9a-f]{40}-\d{8}T\d{6}\.\d{9}Z-[0-9a-f]{16}$/u;

function numericIdentity(database, name) {
  const row = execFileSync("/usr/bin/getent", [database, name], { encoding: "utf8" }).trim().split(":");
  if (row.length < 3 || !/^\d+$/u.test(row[2])) throw new Error("Phase F1 build identity lookup failed.");
  return Number(row[2]);
}

export function validateBuildCheckoutFacts(facts) {
  if (
    facts.canonical !== true ||
    facts.parentCanonical !== true ||
    facts.directory !== true ||
    facts.symlink !== false ||
    facts.uid !== facts.expectedUid ||
    facts.gid !== facts.expectedGid ||
    facts.mode !== 0o750 ||
    !checkoutPattern.test(facts.basename || "")
  ) {
    throw new Error("Git inspection requires an exact build-user-owned Phase F1 checkout.");
  }
  return facts.canonicalPath;
}

export function inspectBuildCheckout(repository, options = {}) {
  const requested = resolve(repository);
  const buildRoot = realpathSync(options.buildRoot ?? PHASE_F1_BUILD_ROOT);
  const canonicalPath = realpathSync(requested);
  const stats = lstatSync(canonicalPath);
  return validateBuildCheckoutFacts({
    canonical: canonicalPath === requested,
    parentCanonical: dirname(canonicalPath) === buildRoot,
    directory: stats.isDirectory(),
    symlink: stats.isSymbolicLink(),
    uid: stats.uid,
    gid: stats.gid,
    mode: stats.mode & 0o777,
    expectedUid: options.expectedUid ?? numericIdentity("passwd", PHASE_F1_BUILD_USER),
    expectedGid: options.expectedGid ?? numericIdentity("group", PHASE_F1_BUILD_USER),
    basename: basename(canonicalPath),
    canonicalPath
  });
}

function validateGitArguments(arguments_) {
  if (!Array.isArray(arguments_) || arguments_.length === 0 || arguments_.some((value) => typeof value !== "string")) {
    throw new Error("Git inspection arguments are invalid.");
  }
  if (arguments_.some((value) =>
    value === "-c" ||
    value.startsWith("-c") ||
    value === "--config-env" ||
    value.startsWith("--config-env=") ||
    value === "--git-dir" ||
    value.startsWith("--git-dir=") ||
    value === "--work-tree" ||
    value.startsWith("--work-tree=") ||
    value.includes("safe.directory")
  )) {
    throw new Error("Git configuration and repository-context overrides are forbidden.");
  }
}

export function buildGitInspectionInvocation(repository, arguments_) {
  if (!repository.startsWith(`${PHASE_F1_BUILD_ROOT}/`)) throw new Error("Git inspection path is outside the Phase F1 build root.");
  validateGitArguments(arguments_);
  return {
    command: "/usr/bin/sudo",
    arguments: [
      "-u", PHASE_F1_BUILD_USER, "--", "/usr/bin/env", "-i",
      "HOME=/var/lib/thebusinesscircle/build",
      `USER=${PHASE_F1_BUILD_USER}`,
      `LOGNAME=${PHASE_F1_BUILD_USER}`,
      "PATH=/usr/local/bin:/usr/bin:/bin",
      "LANG=C.UTF-8",
      "GIT_CONFIG_NOSYSTEM=1",
      "GIT_CONFIG_GLOBAL=/dev/null",
      "GIT_CONFIG_SYSTEM=/dev/null",
      "GIT_TERMINAL_PROMPT=0",
      "GIT_OPTIONAL_LOCKS=0",
      "/usr/bin/git", "-C", repository, ...arguments_
    ]
  };
}

export function gitAsBuildUser(repository, arguments_, encoding = "utf8", options = {}) {
  if (process.getuid?.() !== 0 && options.enforceRoot !== false) {
    throw new Error("Root orchestration is required for Phase F1 build-user Git inspection.");
  }
  const canonical = inspectBuildCheckout(repository, options);
  const invocation = buildGitInspectionInvocation(canonical, arguments_);
  return (options.execFileSync ?? execFileSync)(invocation.command, invocation.arguments, {
    encoding,
    maxBuffer: 256 * 1024 * 1024
  });
}
