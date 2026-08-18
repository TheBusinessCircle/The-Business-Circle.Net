import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  rmSync
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FORWARD_APPLICATION_SHA,
  ROLLBACK_APPLICATION_SHA
} from "./application-identities.mjs";
import { publishNoReplaceSet } from "./atomic-no-replace.mjs";

export const FAILED_CHECKOUT_CLASSIFICATION = "PARTIAL_UNTRUSTED";
export const FAILED_CHECKOUT_AUDIT_SCHEMA = "phase-f1-failed-checkout-cleanup-v1";
const BUILD_ROOT = "/var/www/builds";
const STATE_ROOT = "/var/lib/thebusinesscircle/deployment-state";
const SELECTORS = ["/var/www/current-bcn", "/var/www/current-circle-card"];
const PROTECTED_NAMES = new Set([
  "operator-input.env",
  "runtime.env.json",
  "build.env.json",
  "rollback-build-attempt.json",
  "forward-build-attempt.json"
]);
const SHAS = Object.freeze({
  forward: FORWARD_APPLICATION_SHA,
  rollback: ROLLBACK_APPLICATION_SHA
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function validateFailedCheckoutFacts(facts, { enforceMetadata = true } = {}) {
  const expectedSha = SHAS[facts.role];
  const basenamePattern = expectedSha && new RegExp(
    `^${facts.role}-${expectedSha}-\\d{8}T\\d{6}\\.\\d{9}Z-[0-9a-f]{16}$`,
    "u"
  );
  if (
    !expectedSha ||
    facts.applicationSha !== expectedSha ||
    !/^[0-9a-f]{40}$/u.test(facts.operationsCommit || "") ||
    facts.canonical !== true ||
    facts.parentCanonical !== true ||
    facts.insideExactBuildRoot !== true ||
    !basenamePattern.test(facts.basename || "") ||
    facts.directory !== true ||
    facts.symlink !== false ||
    facts.sameFilesystem !== true ||
    facts.mountpoint !== false ||
    facts.activeReference !== false ||
    facts.selectorReference !== false ||
    facts.protectedEvidence !== false ||
    facts.verifiedHead !== false ||
    facts.handoffEvidence !== false ||
    facts.identityEvidence !== false ||
    (enforceMetadata && (
      facts.uid !== facts.expectedUid ||
      facts.gid !== facts.expectedGid ||
      facts.mode !== 0o750
    ))
  ) {
    throw new Error("Failed checkout is not an exact PARTIAL_UNTRUSTED cleanup target.");
  }
  return FAILED_CHECKOUT_CLASSIFICATION;
}

function numericIdentity(database, name) {
  const row = execFileSync("/usr/bin/getent", [database, name], { encoding: "utf8" }).trim();
  const fields = row.split(":");
  const value = Number(fields[2]);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Build identity lookup failed.");
  return value;
}

function commandPasses(command, arguments_) {
  try {
    execFileSync(command, arguments_, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function pathInside(target, root) {
  return target === root || target.startsWith(`${root}/`);
}

function hasActiveReference(target, processRoot = "/proc") {
  for (const entry of readdirSync(processRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d+$/u.test(entry.name)) continue;
    const process = join(processRoot, entry.name);
    for (const name of ["cwd", "root", "exe"]) {
      try {
        if (pathInside(resolve(readlinkSync(join(process, name))), target)) return true;
      } catch {}
    }
    try {
      for (const fd of readdirSync(join(process, "fd"))) {
        try {
          if (pathInside(resolve(readlinkSync(join(process, "fd", fd))), target)) return true;
        } catch {}
      }
    } catch {}
  }
  return false;
}

function selectorReferences(target, selectors = SELECTORS) {
  return selectors.some((selector) => {
    try {
      return pathInside(realpathSync(selector), target);
    } catch {
      return false;
    }
  });
}

function containsProtectedEvidence(root) {
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (PROTECTED_NAMES.has(entry.name) || entry.name.endsWith(".evidence.json")) return true;
      if (entry.isDirectory() && !entry.isSymbolicLink()) pending.push(join(current, entry.name));
    }
  }
  return false;
}

function operationalFacts(workspace, role, applicationSha, operationsCommit, options = {}) {
  const buildRoot = realpathSync(options.buildRoot ?? BUILD_ROOT);
  const requested = resolve(workspace);
  const target = realpathSync(requested);
  const stats = lstatSync(target);
  const parentStats = lstatSync(buildRoot);
  const stateRoot = options.stateRoot ?? STATE_ROOT;
  return {
    role,
    applicationSha,
    operationsCommit,
    basename: basename(target),
    canonical: target === requested,
    parentCanonical: dirname(target) === buildRoot,
    insideExactBuildRoot: dirname(target) === buildRoot,
    directory: stats.isDirectory(),
    symlink: stats.isSymbolicLink(),
    uid: stats.uid,
    gid: stats.gid,
    mode: stats.mode & 0o777,
    expectedUid: options.expectedUid ?? numericIdentity("passwd", "phase-f1-build"),
    expectedGid: options.expectedGid ?? numericIdentity("group", "phase-f1-build"),
    sameFilesystem: stats.dev === parentStats.dev,
    mountpoint: options.mountpoint ?? commandPasses("/usr/bin/findmnt", ["--mountpoint", target]),
    activeReference: options.activeReference ?? hasActiveReference(target, options.processRoot),
    selectorReference: options.selectorReference ?? selectorReferences(target, options.selectors),
    protectedEvidence: options.protectedEvidence ?? containsProtectedEvidence(target),
    verifiedHead: options.verifiedHead ?? commandPasses("/usr/bin/git", ["-C", target, "rev-parse", "--verify", "HEAD"]),
    handoffEvidence: options.handoffEvidence ?? existsSync(join(stateRoot, `${role}-build-attempt.json`)),
    identityEvidence: options.identityEvidence ?? existsSync(join(stateRoot, `${role}-application-identity.json`)),
    target,
    stats,
    buildRoot,
    stateRoot
  };
}

export function cleanupFailedCheckout(workspace, role, applicationSha, operationsCommit, options = {}) {
  if (process.getuid?.() !== 0 && options.enforceMetadata !== false) {
    throw new Error("Failed checkout cleanup requires Linux root.");
  }
  const facts = operationalFacts(workspace, role, applicationSha, operationsCommit, options);
  const classification = validateFailedCheckoutFacts(facts, options);
  const identity = { dev: facts.stats.dev, ino: facts.stats.ino };
  const recheck = operationalFacts(workspace, role, applicationSha, operationsCommit, options);
  if (recheck.stats.dev !== identity.dev || recheck.stats.ino !== identity.ino) {
    throw new Error("Failed checkout changed before cleanup.");
  }
  validateFailedCheckoutFacts(recheck, options);
  rmSync(facts.target, { recursive: true, force: false, maxRetries: 0 });
  if (existsSync(facts.target)) throw new Error("Failed checkout cleanup did not remove the target.");
  if (options.fsyncParent !== false) {
    const parentFd = openSync(facts.buildRoot, "r");
    try { fsyncSync(parentFd); } finally { closeSync(parentFd); }
  }

  const workspaceIdentity = sha256(facts.target);
  const audit = {
    schemaVersion: FAILED_CHECKOUT_AUDIT_SCHEMA,
    operationsCommit,
    role,
    applicationSha,
    workspaceBasename: facts.basename,
    workspaceIdentity,
    classification,
    cleanupResult: "REMOVED",
    valueMaterialRecorded: false
  };
  const auditPath = join(facts.stateRoot, `failed-checkout-cleanup-${workspaceIdentity}.json`);
  publishNoReplaceSet([{
    target: auditPath,
    payload: `${JSON.stringify(audit, null, 2)}\n`,
    uid: options.enforceMetadata === false ? undefined : 0,
    gid: options.enforceMetadata === false ? undefined : 0,
    mode: 0o600
  }], {
    enforceMetadata: options.enforceMetadata !== false,
    fsyncDirectories: options.fsyncDirectories !== false
  });
  return { auditPath, classification, workspaceIdentity };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, workspace, role, applicationSha, operationsCommit, ...extras] = process.argv.slice(2);
  if (command !== "cleanup" || extras.length || !workspace || !role || !applicationSha || !operationsCommit) {
    throw new Error("Usage: failed-checkout-cleanup.mjs cleanup <workspace> <role> <application-sha> <operations-commit>");
  }
  const result = cleanupFailedCheckout(workspace, role, applicationSha, operationsCommit);
  process.stdout.write(
    `Failed checkout removed classification=${result.classification} identity=${result.workspaceIdentity} values-recorded=false\n`
  );
}
